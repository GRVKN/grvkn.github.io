import { account, studioOwner, unwrap, refreshProvider } from './client.js';
import { safeProject } from './core.js';
let backendReady = false;
const result = value => Response.json(value);
const now = () => new Date().toISOString();
export async function backendFetch(path, options = {}) {
  const { data: { session } } = await account.client.auth.getSession();
  if (!session) throw new Error('Bitte melde dich erneut bei GRVKN an.');
  return fetch(account.client.supabaseUrl + '/functions/v1/grvkn-studio' + path.replace(/^\/api/, ''), {
    ...options, credentials: 'omit', headers: { ...options.headers, Authorization: 'Bearer ' + session.access_token, apikey: account.client.supabaseKey, 'X-GRVKN-Business-ID': account.provider.business_id },
  });
}
async function signed(asset) {
  const data = unwrap(await account.client.storage.from('studio-private').createSignedUrl(asset.object_key, 900), 'Dein gespeichertes Material konnte nicht geladen werden.');
  return { id: asset.id, name: asset.name, kind: asset.kind, size: asset.size, url: data.signedUrl };
}
export async function nativeApi(path, { method = 'GET', body, headers = {} } = {}) {
  const client = account.client, owner = studioOwner(), businessId = account.provider.business_id;
  const url = new URL(path, location.origin), parts = url.pathname.split('/').filter(Boolean), route = parts[1], id = parts[2];
  if (route === 'status') {
    let status;
    try { const response = await backendFetch(path); if (response.ok) { status = await response.json(); backendReady = true; } } catch {}
    if (status) return result(status);
    backendReady = false;
    const probe = await client.from('studio_projects').select('id').eq('user_id', owner).limit(0);
    return result({ user: { email: account.user.email }, storage: !probe.error, connections: { openai: false, runway: false }, limits: { openai: 30, runway: 1000 }, used: { openai: 0, runway: 0 }, backendReady: false, studioAllowed: true, aiAllowed: false, privacy: 'provider-private' });
  }
  // All billed requests use the authenticated server. There is no client-side AI key.
  if (['discover', 'research', 'storyboard', 'estimate', 'jobs'].includes(route)) return null;
  if (method !== 'GET') await refreshProvider();
  if (route === 'workspace') {
    if (backendReady) return null;
    const [companies, projects] = await Promise.all(['companies','projects'].map(table => client.from('studio_' + table).select('data').eq('user_id', owner).order('updated_at', { ascending: false }).limit(100)));
    return result({ companies: unwrap(companies).map(row => row.data), projects: unwrap(projects).map(row => row.data), jobs: [] });
  }
  if (route === 'companies' && method === 'POST') {
    const companyId = `${businessId}_${account.user.id}`;
    const previous = unwrap(await client.from('studio_companies').select('data').eq('id', companyId).eq('user_id', owner).maybeSingle());
    const company = { ...body, id: companyId, name: account.business.name, providerType: account.provider.provider_type, updatedAt: now() };
    delete company.research;
    if (previous?.data.website === company.website) company.research = previous.data.research;
    unwrap(await client.from('studio_companies').upsert({ id: companyId, user_id: owner, business_id: businessId, data: company, updated_at: company.updatedAt }), 'Dein Anbieterprofil konnte nicht im Studio gespeichert werden.');
    return result({ company });
  }
  if (route === 'projects' && method === 'PUT') {
    const project = safeProject(body); project.company = account.business.name; project.providerType = account.provider.provider_type; project.updatedAt = now();
    unwrap(await client.from('studio_projects').upsert({ id: project.id, user_id: owner, business_id: businessId, data: project, updated_at: project.updatedAt }), 'Dein Entwurf konnte nicht gespeichert werden.');
    return result({ project });
  }
  if (route === 'projects' && id && method === 'GET') {
    if (backendReady) return null;
    const row = unwrap(await client.from('studio_projects').select('data').eq('id', id).eq('user_id', owner).single());
    const assets = unwrap(await client.from('studio_assets').select('id,name,kind,size,object_key').eq('project_id', id).eq('user_id', owner).order('created_at'));
    return result({ project: row.data, assets: await Promise.all(assets.map(signed)), job: null });
  }
  if (route === 'assets' && method === 'POST') {
    const projectId = url.searchParams.get('project'), kind = url.searchParams.get('kind') === 'logo' ? 'logo' : 'photo';
    if (!(body instanceof Blob) || body.size > 1_500_000 || !['image/jpeg','image/png','image/webp'].includes(headers['Content-Type'])) throw new Error('Nur Bilder bis 1,5 MB können gespeichert werden.');
    const assetId = crypto.randomUUID(), objectKey = `${businessId}/${account.user.id}/${projectId}/${assetId}`;
    const type = headers['Content-Type']; let name = 'Unternehmensfoto'; try { name = decodeURIComponent(headers['X-File-Name'] || name).slice(0,100); } catch {}
    unwrap(await client.storage.from('studio-private').upload(objectKey, body, { contentType: type, upsert: false }), 'Dein Foto konnte nicht gespeichert werden.');
    const asset = { id: assetId, user_id: owner, business_id: businessId, project_id: projectId, kind, object_key: objectKey, content_type: type, size: body.size, name, created_at: now() };
    const saved = await client.from('studio_assets').insert(asset);
    if (saved.error) { await client.storage.from('studio-private').remove([objectKey]); throw new Error('Dein Foto konnte nicht dem Entwurf zugeordnet werden.'); }
    return result({ asset: await signed(asset) });
  }
  if (route === 'assets' && id && method === 'DELETE') {
    const row = unwrap(await client.from('studio_assets').select('object_key').eq('id', id).eq('user_id', owner).single());
    unwrap(await client.storage.from('studio-private').remove([row.object_key])); unwrap(await client.from('studio_assets').delete().eq('id',id).eq('user_id',owner)); return result({ deleted: true });
  }
  if (route === 'projects' && id && method === 'DELETE') {
    if (backendReady) return null;
    const assets = unwrap(await client.from('studio_assets').select('object_key').eq('project_id', id).eq('user_id', owner));
    if (assets.length) unwrap(await client.storage.from('studio-private').remove(assets.map(asset => asset.object_key)));
    unwrap(await client.from('studio_projects').delete().eq('id', id).eq('user_id', owner)); return result({ deleted: true });
  }
  return null;
}

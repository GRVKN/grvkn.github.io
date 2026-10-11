import { account, refreshProvider, unwrap } from './client.js';
import { validateSubmission, UUID } from './integration-core.js';
import { escapeHtml as esc } from './core.js';
export const publishing = { blob: null, mode: '', containsAi: false, ticket: null, complete: '', busy: false, draft: {}, replacement: '' };
export function setPublicationFile(blob, mode, containsAi) { publishing.blob = blob; publishing.mode = mode; publishing.containsAi = containsAi; publishing.ticket = null; publishing.complete = ''; }
export function resetPublicationFile() { publishing.blob = null; publishing.ticket = null; publishing.complete = ''; }
export async function reloadAds() { account.ads = unwrap(await account.client.from('ads').select('id,title,description,status,video_url,location_id,category_id,cta_type,cta_url,content_type').eq('business_id', account.provider.business_id).order('created_at', { ascending: false }).limit(100)); }
export function prepareReplacement(adId) {
  const ad = account.ads.find(item => item.id === adId);
  if (!ad) throw new Error('Dieser Beitrag gehört nicht zu deinem Anbieterprofil.');
  publishing.replacement = adId;
  publishing.draft = { title: ad.title, description: ad.description, categoryId: ad.category_id, locationId: ad.location_id, ctaType: ad.cta_type, ctaUrl: ad.cta_url, contentType: ad.content_type, rights: false };
  resetPublicationFile();
}
export function publicationMarkup(available) {
  if (!available && !publishing.complete) return '';
  const d = publishing.draft, existing = publishing.replacement;
  const options = (list,value) => list.map(([id,label]) => `<option value="${esc(id)}"${id===value?' selected':''}>${esc(label)}</option>`).join('');
  const field = (key, label, type = 'text', extra = '') => `<label class="field"><span>${esc(label)}</span><input data-publish="${key}" type="${type}" value="${esc(d[key] ?? '')}" ${extra}></label>`;
  if (publishing.complete) return `<div class="submission-result"><h3>Dein Video ist zur Prüfung eingereicht.</h3><p>Nach der Moderation erscheint es öffentlich. Link und QR-Code bleiben bei späteren Änderungen gleich.</p><button class="button primary" data-action="sharing">Link & QR öffnen</button><button class="button quiet" data-action="new-upload">Weiteres Video vorbereiten</button></div>`;
  const type = d.contentType || 'business';
  return `<div class="submission-form"><h3>${existing ? 'Video ersetzen · Link bleibt erhalten' : 'Auf GRVKN einreichen'}</h3><p class="field-help">${esc(account.business.name)} · Nach dem Einreichen prüft die Moderation deinen Beitrag.</p><label class="field"><span>Bereich</span><select data-publish="contentType"${existing?' disabled':''}>${options([['business','Anbieter & Angebote'],['jobs_training','Jobs & Ausbildung'],['property','Immobilien & Wohnen'],['event','Veranstaltungen'],...(account.provider.provider_type === 'municipality'?[['municipality','Kommune']]:[])],type)}</select></label>
    ${field('title','Titel','text','minlength="5" maxlength="90"')}<label class="field"><span>Beschreibung</span><textarea data-publish="description" minlength="10" maxlength="500">${esc(d.description||'')}</textarea></label>
    <label class="field"><span>Kategorie</span><select data-publish="categoryId">${options(account.categories.map(c=>[c.id,c.name]),d.categoryId||account.categories[0]?.id)}</select></label><label class="field"><span>Standort</span><select data-publish="locationId">${options(account.locations.map(l=>[l.id,`${l.name} · ${l.city}`]),d.locationId||account.locations[0]?.id)}</select></label>
    <label class="field"><span>Kontakt / Aktion</span><select data-publish="ctaType">${options([['website','Website öffnen'],['shop','Im Shop ansehen'],['call','Jetzt anrufen'],['route','Route starten'],['offer','Angebot ansehen'],['apply','Jetzt bewerben'],['contact','E-Mail schreiben']],d.ctaType||'website')}</select></label>${field('ctaUrl','Link, tel:+49… oder mailto:…','text','maxlength="1000"')}
    ${!existing && type==='jobs_training'?`<label class="field"><span>Art der Stelle</span><select data-publish="opportunityType">${options([['apprenticeship','Ausbildung'],['internship','Praktikum'],['dual_study','Duales Studium'],['career_insight','Berufseinblick'],['full_time_job','Vollzeit'],['part_time_job','Teilzeit'],['mini_job','Minijob / Aushilfe']],d.opportunityType||'apprenticeship')}</select></label>${field('occupation','Beruf / Stellenbezeichnung','text','minlength="3" maxlength="120"')}`:''}
    ${!existing && type==='property'?`<label class="field"><span>Angebotsart</span><select data-publish="offerType">${options([['rent','Mieten'],['sale','Kaufen'],['holiday_rent','Ferienvermietung']],d.offerType||'rent')}</select></label><label class="field"><span>Immobilie</span><select data-publish="propertyKind">${options([['apartment','Wohnung'],['house','Haus'],['wg_room','WG- oder Azubi-Zimmer'],['holiday_apartment','Ferienwohnung'],['holiday_house','Ferienhaus']],d.propertyKind||'apartment')}</select></label>${field('price','Preis in Euro','number','min="0" max="2147483647" step="1"')}${field('rooms','Zimmer (optional)','number','min="0.1" max="999.9" step="0.1"')}${field('area','Wohnfläche in m² (optional)','number','min="0.01" max="999999.99" step="0.01"')}`:''}
    <label class="checkline"><input data-publish="rights" type="checkbox"${d.rights?' checked':''}><span>Ich darf das Video und alle enthaltenen Bilder, Musik sowie Personenaufnahmen veröffentlichen; notwendige Einwilligungen liegen vor.</span></label><button class="button primary" data-action="submit-grvkn"${publishing.busy?' disabled':''}>${publishing.busy?'Video wird eingereicht …':existing?'Ersetzen und zur Prüfung senden':'Video zur Prüfung senden'}</button><p class="field-help">${publishing.containsAi?'„Mit KI generiert“ ist fest ins exportierte Video eingebrannt.':'Du hast keine KI-Inhalte angegeben.'}</p></div>`;
}
export function readPublicationInputs() {
  document.querySelectorAll('[data-publish]').forEach(input => publishing.draft[input.dataset.publish] = input.type === 'checkbox' ? input.checked : input.value);
}
export async function submitVideo({ client, provider, user, blob, info, ticket, verify, containsAi = false, aiMetadata = false, replacement = '' }) {
  const metadata = validateSubmission(info);
  const type = info.contentType || 'business';
  if (!['business','jobs_training','property','event','municipality'].includes(type) || type === 'municipality' && provider.provider_type !== 'municipality') throw new Error('Dieser Bereich ist für deinen Anbieter nicht freigegeben.');
  if (!(blob instanceof Blob) || !blob.size || blob.size > 100 * 1048576) throw new Error('Das Video muss zwischen 1 Byte und 100 MB groß sein.');
  const extension = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('webm') ? 'webm' : blob.type.includes('quicktime') ? 'mov' : '';
  if (!extension) throw new Error('Bitte exportiere das Video zuerst als MP4 oder WebM.');
  await verify();
  let training, property;
  if (!replacement && type === 'jobs_training') {
    if (!['apprenticeship','internship','dual_study','career_insight','full_time_job','part_time_job','mini_job'].includes(info.opportunityType) || String(info.occupation||'').trim().length < 3) throw new Error('Bitte ergänze die Art der Stelle und die Berufsbezeichnung.');
    training = { opportunity_type: info.opportunityType, occupation_title: String(info.occupation).trim(), participant_rights_confirmed: true };
  }
  if (!replacement && type === 'property') {
    const price = Number(info.price), numberOrNull = key => info[key] === '' || info[key] == null ? null : Number(info[key]);
    const rooms=numberOrNull('rooms'), area=numberOrNull('area');
    if (!['rent','sale','holiday_rent'].includes(info.offerType) || !['apartment','house','wg_room','holiday_apartment','holiday_house'].includes(info.propertyKind) || info.price === '' || !Number.isInteger(price) || price<0 || price>2147483647 || rooms!==null && (!Number.isFinite(rooms)||rooms<=0||rooms>999.9) || area!==null && (!Number.isFinite(area)||area<=0||area>999999.99)) throw new Error('Bitte prüfe die Immobilienangaben und den Preis.');
    property = { offer_type: info.offerType, property_kind: info.propertyKind, price_euro: price, rooms, living_area_sqm: area };
  }
  const adId = replacement || ticket.id;
  if (!UUID.test(adId)) throw new Error('Die Beitrags-ID ist ungültig.');
  const path = `${provider.business_id}/${adId}/video-${ticket.fileId}.${extension}`;
  let created = false, uploaded = false, videoUrl = '';
  try {
    if (replacement) {
      const current = unwrap(await client.from('ads').select('id,business_id,content_type').eq('id', adId).eq('business_id', provider.business_id).single(), 'Dieser Beitrag gehört nicht zu deinem Anbieter.');
      if (current.content_type !== type) throw new Error('Der Bereich eines bestehenden Beitrags kann hier nicht geändert werden.');
      unwrap(await client.rpc('update_my_ad', { p_ad_id: adId, p_title: metadata.title, p_description: metadata.description, p_cta_type: metadata.ctaType, p_cta_url: metadata.ctaUrl, p_comments_enabled: true }));
    } else {
      unwrap(await client.from('ads').insert({ id: adId, business_id: provider.business_id, location_id: metadata.locationId, category_id: metadata.categoryId, created_by: user.id, title: metadata.title, description: metadata.description, cta_type: metadata.ctaType, cta_url: metadata.ctaUrl, content_type: type, status: 'draft' }), 'Dein Beitrag konnte nicht vorbereitet werden. Bitte erneut anmelden oder die Freigabe prüfen.');
      created = true;
      if (training) unwrap(await client.from('training_opportunities').insert({ ...training, ad_id: adId, business_id: provider.business_id }));
      if (property) unwrap(await client.from('property_listings').insert({ ...property, ad_id: adId, business_id: provider.business_id }));
    }
    await verify();
    unwrap(await client.storage.from('ad-videos').upload(path, blob, { contentType: blob.type.split(';')[0], upsert: false }), 'Dein Video konnte nicht hochgeladen werden. Der Beitrag ist noch nicht öffentlich.'); uploaded = true;
    videoUrl = client.storage.from('ad-videos').getPublicUrl(path).data.publicUrl;
    await verify();
    unwrap(await client.from('ads').update({ video_url: videoUrl, status: 'pending', submitted_at: new Date().toISOString(), ...(aiMetadata ? { contains_ai: containsAi, ai_label: containsAi ? 'Mit KI generiert' : null } : {}) }).eq('id', adId).eq('business_id',provider.business_id).select('id').single(), 'Das Video wurde übertragen; der Einreichungsstatus konnte noch nicht bestätigt werden.');
    return adId;
  } catch (error) {
    // A lost update response must not erase an already submitted video.
    const check = await client.from('ads').select('id,status,video_url').eq('id', adId).eq('business_id',provider.business_id).maybeSingle();
    if (!check.error && check.data?.status === 'pending' && videoUrl && check.data.video_url === videoUrl) return adId;
    if (!check.error && check.data?.status === 'draft' && created) {
      if (uploaded) await client.storage.from('ad-videos').remove([path]);
      await client.rpc('delete_my_ad', { p_ad_id: adId });
    }
    throw error;
  }
}
export async function publishCurrent() {
  if (publishing.busy) return;
  if (!publishing.blob) throw new Error('Bitte exportiere zuerst die geprüfte Fassung des Videos.');
  readPublicationInputs(); publishing.busy = true;
  publishing.ticket ||= { id: crypto.randomUUID(), fileId: crypto.randomUUID() };
  try {
    const id = await submitVideo({ client: account.client, provider: account.provider, user: account.user, blob: publishing.blob, info: structuredClone(publishing.draft), ticket: publishing.ticket, verify: refreshProvider, containsAi: publishing.containsAi, aiMetadata: account.aiMetadata, replacement: publishing.replacement });
    publishing.complete = id; await reloadAds(); return id;
  } finally { publishing.busy = false; }
}

import { escapeHtml } from './core.js';
import { nativeApi, backendFetch } from './native-api.js';
import { studioOwner } from './client.js';

export const cloud = { ready: false, status: null, companies: [], projects: [], jobs: [], error: '' };

function semantic(value) {
  if (Array.isArray(value)) return value.map(semantic);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().filter(key => !['updatedAt', 'status'].includes(key)).map(key => [key, semantic(value[key])]));
  return value;
}
async function fingerprint(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(semantic(value))));
  return [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('');
}
export async function api(path, { method = 'GET', body, billable = false, headers = {} } = {}) {
  let pendingKey = '', idempotencyKey = '';
  if (billable) {
    pendingKey = 'grvkn-pending-' + studioOwner() + '-' + await fingerprint({ path, body });
    let pending;
    try { pending = JSON.parse(sessionStorage.getItem(pendingKey) || 'null'); } catch {}
    idempotencyKey = pending?.key || crypto.randomUUID();
    if (pending) body = pending.body;
    try { sessionStorage.setItem(pendingKey, JSON.stringify({ key: idempotencyKey, body })); } catch {}
  }
  let response;
  try {
    response = await nativeApi(path, { method, body, headers }) || await backendFetch(path, { method,
      headers: { ...(body && !(body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}), ...headers },
      ...(body ? { body: body instanceof Blob ? body : JSON.stringify(body) } : {}), signal: AbortSignal.timeout(120_000) });
  } catch {
    const error = new Error('Die Serverantwort ist unklar. Bei bezahlten Aktionen dieselbe Anfrage erneut prüfen; es wird keine automatische Wiederholung gestartet.');
    error.code = 'transport_uncertain'; throw error;
  }
  let result;
  try { result = await response.json(); } catch { throw new Error('Dein Studio ist gerade nicht erreichbar. Bitte lade die Seite erneut.'); }
  if (!response.ok) {
    if (pendingKey && !['provider_uncertain', 'operation_pending', 'internal_error'].includes(result.code)) sessionStorage.removeItem(pendingKey);
    const error = new Error(result.error || 'Die Studio-Anfrage konnte nicht abgeschlossen werden.');
    error.code = result.code; error.status = response.status; throw error;
  }
  if (pendingKey) sessionStorage.removeItem(pendingKey);
  return result;
}
export async function connectWorkspace() {
  try {
    cloud.status = await api('/api/status');
    if (!cloud.status.storage) throw new Error('Dein Anbieter ist freigegeben. Der Studiospeicher wird noch eingerichtet; Entwürfe bleiben vorerst in diesem Browser. Der Video-Upload ist bereits verfügbar.');
    const workspace = await api('/api/workspace');
    cloud.companies = workspace.companies; cloud.projects = workspace.projects; cloud.jobs = workspace.jobs;
    cloud.ready = true; cloud.error = '';
  } catch (error) { cloud.ready = false; cloud.error = error.message; cloud.signin = error.status === 401; }
  return cloud;
}
export async function uploadImage(asset, projectId, kind = 'photo') {
  if (asset.id) return asset;
  const image = asset.img;
  const canvas = document.createElement('canvas');
  if (kind === 'photo') {
    canvas.width = 720; canvas.height = 1280;
    const scale = Math.max(720 / image.width, 1280 / image.height);
    canvas.getContext('2d').drawImage(image, (720 - image.width * scale) / 2, (1280 - image.height * scale) / 2, image.width * scale, image.height * scale);
  } else {
    const scale = Math.min(1, 640 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  }
  const type = kind === 'photo' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise(resolve => canvas.toBlob(resolve, type, .88));
  if (!blob || blob.size > 1_500_000) throw new Error('Dieses Foto ist zu groß. Bitte wähle ein kleineres Bild.');
  const { asset: saved } = await api(`/api/assets?project=${encodeURIComponent(projectId)}&kind=${kind}`, {
    method: 'POST', body: blob, headers: { 'Content-Type': type, 'X-File-Name': encodeURIComponent(asset.name || 'Unternehmensfoto') },
  });
  // The browser preview uses exactly the same portrait crop as the video model.
  if (asset.url.startsWith('blob:')) URL.revokeObjectURL(asset.url);
  asset.id = saved.id; asset.url = saved.url;
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = saved.url; await img.decode(); asset.img = img;
  return asset;
}
export async function restoreImage(asset) {
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = asset.url; await img.decode(); return { ...asset, img };
}
export function sourcesMarkup(research) {
  if (!research) return '';
  const esc = escapeHtml;
  return `<div class="research-result"><h3>Was die Homepage über euch erzählt</h3><p>${esc(research.summary || 'Bitte prüfe die belegten Angaben und ergänze offene Fakten.')}</p>
    ${research.tone ? `<p><strong>Tonalität:</strong> ${esc(research.tone)}</p>` : ''}
    <div class="source-links">${(research.sources || []).map(source => `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">↗ ${esc(source.title)}</a>`).join('')}</div>
    ${(research.evidence || []).map(item => `<p class="evidence-line">${esc(item.text)} <a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Quelle ↗</a></p>`).join('')}
    ${(research.questions || []).length ? `<div class="open-questions"><strong>Noch zu klären</strong>${research.questions.map(question => `<p>${esc(question)}</p>`).join('')}</div>` : ''}
    <small class="field-help">Recherche vom ${esc(new Date(research.researchedAt).toLocaleDateString('de-DE'))}. Angaben vor der Produktion bestätigen.</small></div>`;
}

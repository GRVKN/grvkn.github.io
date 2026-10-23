import { AI_LABEL, CATEGORIES, GOALS, needsAiLabel, normalizeWebsite, escapeHtml, createProject, exampleProject, buildStoryboard, getSceneAt, safeProject, projectManifest, selectRecorderMime } from './core.js';
import { cloud, api, connectWorkspace, uploadImage, restoreImage } from './cloud.js';
import { companyView, storyboardView, exportView, settingsView } from './views.js';
import {workflowState,loadWorkflows,loadProductionOutput,workflowView,workflowAction,productionPanel} from './workflow-ui.js';
import { ProductionMedia } from './media.js';
import { readAdReference, providerType } from './grvkn.js';
import { sharingView, qrSvg, qrPng } from './sharing.js';
import { account, studioOwner } from './client.js';
import { publishing, publicationMarkup, publishCurrent, setPublicationFile, resetPublicationFile, readPublicationInputs, prepareReplacement } from './publisher.js';

const $ = selector => document.querySelector(selector);
const esc = escapeHtml;
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const STORAGE_KEY = 'grvkn-studio-projects-v1:' + studioOwner();
let projects = [];
try { const items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); if (Array.isArray(items)) projects = items.slice(0, 30).map(safeProject); } catch {}
const newProviderProject = () => Object.assign(createProject(), { company: account.business.name, companyId: `${account.provider.business_id}_${account.user.id}`, providerType: account.provider.provider_type, city: account.locations[0]?.city || '', website: cloud.status?.security?.website?.url || account.business.website_url || '', facts: account.business.description || '' });
let project = newProviderProject();
let view = 'studio';
let step = 1;
let expandedScene = 0;
let researchShown = false;
let assets = [];
let logo = null;
let uploadFile = null;
let uploadUrl = '';
let uploadContainsAi = false;
let uploadApproved = false;
let exportState = null;
let player = { playing: false, time: 0, last: 0 };
let toastTimer;
let busy = '';
let candidates = [];
let websiteChallenge=null;
let productionJob = null;
let productionMode = 'video';
let productionVoice = true;
let costConsent = false;
let mediaReady = false;
let watchSequence = 0;
const realMedia = new ProductionMedia(() => paint());
const canvas = $('#video-canvas');
const ctx = canvas.getContext('2d');
const grvknLogo = $('#grvkn-logo');
grvknLogo.addEventListener('load', paint);
const sourceVideo = $('#source-video');
let sourceSequence = 0;
let exportRunning = false;
const fallback = exampleProject();
const fallbackScenes = buildStoryboard(fallback);

function workflowContext(){return {run:fn=>runTask('workflow',fn),project:()=>project,job:()=>productionJob,open:openProject,save:()=>saveCloudProject(false),download,toast,useFilm:(blob,renderId)=>{setPublicationFile(blob,'studio',true);publishing.renderId=renderId;step=4;view='studio';toast('Gespeicherten Film übernommen. Ergänze die Angaben für die Moderation.');}};}

function pilotState() {
  const finalOutput=workflowState.production?.renders?.[0];
  const finalReady=finalOutput?.status==='ready'&&finalOutput.project_id===project.id&&['scenes','color','musicEnabled','logoId'].every(k=>JSON.stringify(finalOutput.snapshot[k])===JSON.stringify(project[k]));
  return { project, cloud, assets, logo, expandedScene, busy, candidates,websiteChallenge,job: productionJob,finalOutput,finalReady,
    productionMode, voice: productionVoice, costConsent, mediaReady, mediaError: realMedia.loadError, exportRunning, progress: progressMarkup() };
}
function activeProduction() { return Boolean(productionJob && ['reserving', 'queued', 'processing', 'needs_review'].includes(productionJob.status)); }
function updateConnectionNotice() {
  const notice = $('#connection-notice'); if (!notice) return;
  notice.classList.toggle('connected', cloud.ready);
  const message = cloud.ready
    ? cloud.status.connections.openai ? 'Echte Homepage-Recherche und KI-Texte verfügbar. Produktionen startest du nach Prüfung und Kostenfreigabe.' : 'Betriebe, Fotos und Projekte werden privat gespeichert. Das KI-Paket ist für diesen Anbieter noch nicht aktiv.'
    : cloud.signin ? 'Melde dich an, um Betriebe und Projekte dauerhaft zu speichern. Der Layout-Test bleibt verfügbar.' : cloud.error || 'Das Studio verbindet deinen privaten Workspace …';
  notice.innerHTML = `${icon('info')}<p><strong>${project.demoOnly ? 'Fiktives Beispiel.' : 'Dein Pilot-Studio.'}</strong> ${esc(project.demoOnly ? 'Dieses Beispiel nutzt Vorlagentexte und Platzhalter. Es entstehen keine KI-Kosten.' : message)}</p>`;
  const personal = $('.workspace-person small');
  if (personal) personal.textContent = cloud.ready ? cloud.status.user.email || 'Angemeldetes Studio' : 'Private Pilotphase';
}
async function runTask(kind, execute) {
  if (busy) return false;
  busy = kind; render();
  try { await execute(); return true; }
  catch (error) { toast(error.message || 'Die Aktion konnte nicht abgeschlossen werden.'); return false; }
  finally { busy = ''; render(); }
}
function applyCompany(company) {
  project.companyId = company.id; project.company = company.name; project.city = company.city;
  project.website = company.website; project.facts = company.facts; project.confirmed = company.confirmed;
  project.providerType = providerType(company.providerType);
}
function upsert(list, value) { const index = list.findIndex(item => item.id === value.id); if (index < 0) list.unshift(value); else list[index] = value; }
async function saveCompany() {
  if (!cloud.ready || project.demoOnly) return;
  const { company } = await api('/api/companies', { method: 'POST', body: {
    ...(project.companyId ? { id: project.companyId } : {}),projectId:project.id,name: project.company, city: project.city,
    website: project.website, facts: project.facts, confirmed: project.confirmed, providerType: project.providerType,
  } });
  project.companyId = company.id; upsert(cloud.companies, company);
}
async function saveCloudProject(announce) {
  if (project.company.trim() && project.city.trim()) await saveCompany();
  project.name = project.name || `${project.company || 'Neues Unternehmen'} · ${project.goal}`;
  project.assetIds = assets.filter(asset => asset.id).map(asset => asset.id); project.logoId = logo?.id || '';
  await api('/api/projects', { method: 'PUT', body: safeProject(project) });
  for (const asset of assets) await uploadImage(asset, project.id);
  if (logo) await uploadImage(logo, project.id, 'logo');
  project.assetIds = assets.map(asset => asset.id); project.logoId = logo?.id || '';
  const { project: saved } = await api('/api/projects', { method: 'PUT', body: safeProject(project) });
  project = safeProject(saved); upsert(cloud.projects, saved); projects = cloud.projects.map(safeProject);
  if(project.aiRightsConfirmed&&cloud.status?.backendReady)await api('/api/rights/consent',{method:'POST',body:{projectId:project.id,accepted:true}});
  if (announce) toast('Projekt gespeichert – inklusive Fotos und Logo. Dein Studio merkt sich den Betrieb.');
}
async function researchCompany() {
  if (!project.company.trim() || !project.city.trim()) throw new Error('Bitte ergänze den Unternehmensnamen und Ort.');
  if(!project.aiRightsConfirmed)throw new Error('Bitte bestätige zuerst die Nutzungsrechte und die KI-Übermittlung.');
  project.website = normalizeWebsite(project.website);await saveCloudProject(false);
  const company = cloud.companies.find(item => item.id === project.companyId);
  if (!project.website) {
    throw new Error('Bitte trage zuerst deine Website ein und bestätige die Domain.');
  }
  const result = await api('/api/research', { method: 'POST', body: {...company,projectId:project.id,rightsAccepted:project.aiRightsConfirmed}, billable: true });
  upsert(cloud.companies, result.company); applyCompany(result.company); project.scenes = []; project.source = 'studio-ai-demo';
  candidates = []; invalidate();
  toast('Homepage recherchiert. Prüfe die Quellen und bestätige die Unternehmensangaben.');
}
function matchesProduction(p, snapshot) {
  const keys = ['id', 'company', 'providerType', 'city', 'website', 'facts', 'focus', 'goal', 'cta', 'duration', 'style', 'color', 'logoId', 'assetIds', 'scenes'];
  const saved = safeProject(snapshot);
  return keys.every(key => JSON.stringify(p[key]) === JSON.stringify(saved[key]));
}
async function loadProduction(job) {
  productionJob = job; upsert(cloud.jobs, job); mediaReady = false;
  if (job.status === 'ready' && matchesProduction(project, job.snapshot)) {
    await realMedia.load(job); mediaReady = true; player.time = 0; paint();
  }
}
async function openProject(projectId) {
  stopWatching(); resetAssets();
  const result = await api('/api/projects/' + encodeURIComponent(projectId));
  project = safeProject(result.project);
  const images = result.assets.filter(asset => project.assetIds.includes(asset.id)).sort((a, b) => project.assetIds.indexOf(a.id) - project.assetIds.indexOf(b.id));
  assets = await Promise.all(images.map(restoreImage));
  const companyLogo = result.assets.find(asset => asset.id === project.logoId);
  if (companyLogo) logo = await restoreImage(companyLogo);
  if (result.job && (matchesProduction(project, result.job.snapshot) || ['queued', 'processing', 'needs_review', 'reserving'].includes(result.job.status))) {
    if (result.job.status !== 'ready') project = safeProject(result.job.snapshot);
    await loadProduction(result.job);
  }
  await loadProductionOutput(project.id);
  step = productionJob ? 4 : project.scenes.length ? 3 : project.confirmed ? 2 : 1;
  view = 'studio'; player.time = 0; render();
  toast('Projekt mit gespeichertem Material geöffnet.');
}
function stopWatching() { ++watchSequence; }
async function watchProduction() {
  const generation = ++watchSequence, jobId = productionJob?.id;
  if (!jobId || !['queued', 'processing'].includes(productionJob.status)) return;
  while (generation === watchSequence && productionJob?.id === jobId) {
    try {
      const job = await api(`/api/jobs/${jobId}/advance`, { method: 'POST', body: {} });
      if (generation !== watchSequence || productionJob?.id !== jobId) return;
      await loadProduction(job); render();
      if (!['queued', 'processing'].includes(job.status)) {
        cloud.status=await api('/api/status');render();
        if (job.status === 'ready') {if(cloud.status.production?.configured){await api('/api/renders',{method:'POST',body:{projectId:project.id,jobId:job.id}});await loadProductionOutput(project.id);render();}toast('Die Filmszenen sind gespeichert. Der MP4-Schnitt kann jetzt vorbereitet werden.');}
        return;
      }
    } catch (error) { if (generation === watchSequence) { toast(error.message); render(); } return; }
    await new Promise(resolve => setTimeout(resolve, 5500 + Math.random() * 2000));
  }
}
async function pilotAction(action, button) {
  if (!['website-begin','website-dns','website-file','founder-demo-create','billing-checkout','research-live', 'select-website', 'generate-ai', 'refresh-connection', 'production-mode', 'start-production', 'resume-production', 'cancel-production', 'reload-production'].includes(action)) return false;
  if(action==='website-begin'){
    const website=$('#website-proof-url')?.value;
    await runTask('verify',async()=>{const result=await api('/api/websites',{method:'POST',body:{website}});websiteChallenge=result.challenge;project.website=result.website.url;project.aiRightsConfirmed=false;cloud.status=await api('/api/status');toast('Nachweis angelegt. Bitte DNS-TXT oder HTTPS-Datei setzen.');});return true;
  }
  if(action==='website-dns'||action==='website-file'){
    await runTask('verify',async()=>{await api('/api/websites/verify',{method:'POST',body:{method:action==='website-dns'?'dns_txt':'https_file'}});websiteChallenge=null;cloud.status=await api('/api/status');toast('Genau diese Unternehmenswebsite wurde bestätigt.');});return true;
  }
  if(action==='founder-demo-create'){
    const input={website:$('#founder-website')?.value,company:$('#founder-company')?.value,city:$('#founder-city')?.value,focus:$('#founder-focus')?.value,rightsAccepted:$('#founder-rights')?.checked===true};
    await runTask('demo',async()=>{const result=await api('/api/founder/demo',{method:'POST',body:input});resetAssets();project=safeProject(result.project);upsert(cloud.companies,result.company);upsert(cloud.projects,result.project);projects=cloud.projects.map(safeProject);step=1;view='studio';toast('Private Founder-Demo vorbereitet. Bitte eigene autorisierte Fotos ergänzen.');});return true;
  }
  if(action==='billing-checkout'){
    const plan=$('#studio-plan')?.value;await runTask('billing',async()=>{const result=await api('/api/billing/checkout',{method:'POST',body:{plan}});if(new URL(result.url).origin!=='https://checkout.stripe.com')throw new Error('Ungültiger Zahlungslink.');location.assign(result.url);});return true;
  }
  if (action === 'production-mode') { if (!activeProduction()) { productionMode = button.dataset.mode; costConsent = false; render(); } return true; }
  if (action === 'research-live' || action === 'select-website') {
    if (action === 'select-website') {
      const candidate = candidates[Number(button.dataset.index)]; if (!candidate) return true;
      project.website = candidate.website; project.confirmed = false;
    }
    await runTask('research', researchCompany);
  }
  if (action === 'refresh-connection') await runTask('connect', async () => {
    await connectWorkspace(); if (!cloud.ready) throw new Error(cloud.error);
    projects = cloud.projects.map(safeProject); toast('Dein Studiospeicher und Verbindungsstatus sind aktuell.');
  });
  if (action === 'generate-ai') await runTask('storyboard', async () => {
    if(!project.aiRightsConfirmed)throw new Error('Bitte bestätige zuerst die Nutzungsrechte und die KI-Übermittlung.');
    if (!project.confirmed || !project.focus.trim()) throw new Error('Bitte bestätige den Betrieb und ergänze deinen Videowunsch.');
    await saveCloudProject(false);
    const result = await api('/api/storyboard', { method: 'POST', body: {...safeProject(project),rightsAccepted:true}, billable: true });
    project = safeProject(result.project); upsert(cloud.projects, result.project); projects = cloud.projects.map(safeProject);
    expandedScene = 0; step = 3; player.time = 0; pausePlayer();
    productionJob = null; mediaReady = false; costConsent = false;
    toast('Die KI hat eure Geschichte geplant. Prüfe Texte und Fotowahl.');
  });
  if (action === 'start-production') {
    const ok = await runTask('production', async () => {
      if (!costConsent) throw new Error('Bitte bestätige die angezeigten Produktionskosten.');
      if (!assets.length) throw new Error('Bitte ergänze mindestens ein eigenes Foto.');
      if(!project.aiRightsConfirmed)throw new Error('Bitte bestätige zuerst die Nutzungsrechte und die KI-Übermittlung.');
      await saveCloudProject(false);
      const job = await api('/api/jobs', { method: 'POST', body: { projectId: project.id, mode: productionMode, voice: productionVoice, consent: true,rightsAccepted:true }, billable: true });
      productionJob = job; upsert(cloud.jobs, job); mediaReady = false; costConsent = false;
      cloud.status=await api('/api/status');
    });
    if (ok) void watchProduction();
  }
  if (action === 'resume-production') {
    const ok = await runTask('status', async () => {
      const job = await api('/api/jobs/' + productionJob.id);
      await loadProduction(job);
      if (job.status === 'needs_review') toast('Im Runway- bzw. OpenAI-Konto prüfen. Unklare Aufträge werden nicht erneut gestartet.');
    });
    if (ok) void watchProduction();
  }
  if (action === 'reload-production') await runTask('load', async () => { realMedia.reset(); await loadProduction(productionJob); });
  if (action === 'cancel-production') await runTask('cancel', async () => {
    stopWatching(); productionJob = await api(`/api/jobs/${productionJob.id}/cancel`, { method: 'POST', body: {} });
    upsert(cloud.jobs, productionJob); costConsent = false;
    toast('Weitere Produktion gestoppt. Bereits beauftragte Anbieterleistungen können kostenpflichtig bleiben.');
  });
  return true;
}

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5500);
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); return true; }
  catch { toast('Dein Browser kann den Entwurf gerade nicht speichern. Du kannst ihn als JSON herunterladen.'); return false; }
}

async function saveProject(announce = true) {
  if (cloud.ready && !project.demoOnly) return saveCloudProject(announce);
  project.updatedAt = new Date().toISOString();
  project.name = project.name || `${project.company || 'Neues Unternehmen'} · ${project.goal}`;
  const index = projects.findIndex(item => item.id === project.id);
  const clean = safeProject(project);
  if (index < 0) projects.unshift(clean); else projects[index] = clean;
  projects = projects.slice(0, 30);
  const saved = persist();
  $('#project-count').textContent = projects.length;
  document.querySelectorAll('[data-founder-only]').forEach(el=>{el.hidden=cloud.status?.security?.founder!==true;});
  if (announce && saved) toast('Entwurf gespeichert. Fotos und Logo bleiben nur in dieser Sitzung.');
}

function optionList(options, selected) {
  return options.map(value => `<option${selected === value ? ' selected' : ''} value="${esc(value)}">${esc(value)}</option>`).join('');
}

function field(key, title, placeholder, full = false, optional = false) {
  return `<label class="field${full ? ' full' : ''}"><span>${title}${optional ? '<em class="optional">optional</em>' : ''}</span><input data-field="${key}" name="${key}" maxlength="${key === 'company' ? 80 : key === 'city' ? 60 : 96}" value="${esc(project[key])}" placeholder="${placeholder}"></label>`;
}

function renderStepper() {
  const labels = ['Anbieter', 'Deine Idee', 'Storyboard', 'Export'];
  $('#stepper').hidden = view !== 'studio';
  $('#stepper').innerHTML = labels.map((label, i) => `<button class="step-button${step === i + 1 ? ' active' : step > i + 1 ? ' complete' : ''}" data-action="step" data-step="${i + 1}" aria-current="${step === i + 1 ? 'step' : 'false'}"><span class="step-number">${step > i + 1 ? icon('check') : i + 1}</span><span>${label}</span></button>`).join('');
}

function companyEditor() {
  return companyView(pilotState());
}

function briefingEditor() {
  const goalIcons = ['globe', 'spark', 'file', 'plus', 'pin'];
  return `<div class="editor-inner"><div class="section-top"><h2>Was soll dein Video zeigen?</h2><span class="pill">${esc(project.company)}</span></div><p class="section-description">Gib die Richtung vor. Dein Studio macht daraus einen Vorschlag mit vier Szenen, den du frei anpassen kannst.</p>
    <h3 class="mini-heading">Dein Ziel</h3><div class="goal-grid">${GOALS.map((goal, i) => `<button class="goal-card${project.goal === goal ? ' active' : ''}" data-action="goal" data-goal="${esc(goal)}" aria-pressed="${project.goal === goal}">${icon(goalIcons[i])}<span>${goal === 'Unternehmen vorstellen' ? 'Anbieter vorstellen' : goal}</span></button>`).join('')}</div>
    <div class="form-grid"><label class="field full"><span>Deine Idee für das Video</span><textarea name="focus" data-field="focus" maxlength="1200" placeholder="Zum Beispiel: Zeige unsere Werkstatt und wie wir Möbel nach Maß fertigen.">${esc(project.focus)}</textarea></label>
    <label class="field"><span>Passender Bereich auf GRVKN</span><select data-field="category" name="category">${optionList(CATEGORIES, project.category)}</select></label><label class="field"><span>Länge</span><select data-field="duration" name="duration">${[15,20,30].map(seconds => `<option value="${seconds}"${project.duration === seconds ? ' selected' : ''}>${seconds} Sekunden</option>`).join('')}</select></label>
    <label class="field"><span>Stimmung</span><select data-field="style" name="style">${optionList(['Warm & nahbar', 'Klar & modern', 'Dynamisch & direkt'], project.style)}</select></label>${field('cta','Was sollen Zuschauer danach tun?','z. B. Kontakt aufnehmen')}</div>
    <div class="visual-upload">${icon('image')}<div><strong>Eure Geschichte. Eure echten Bilder.</strong><p>Bis zu 4 Fotos · JPG, PNG, WebP · je 10 MB</p></div><button class="button secondary small" data-action="pick-images">Fotos wählen ${icon('plus')}</button></div>
    ${cloud.status?.backendReady&&!project.demoOnly&&assets.length<4?'<button class="button secondary" data-action="website-images">Autorisierte Webseitenbilder übernehmen</button>':''}
    ${assets.length ? `<div class="images-row">${assets.map((asset, i) => `<div class="image-tile"><img src="${esc(asset.url)}" alt="Unternehmensfoto ${i + 1}"><button data-action="remove-image" data-index="${i}" aria-label="Foto ${i + 1} entfernen">${icon('x')}</button></div>`).join('')}</div>` : ''}
    <div class="brand-row"><label for="brand-color">Deine Markenfarbe</label><input id="brand-color" data-field="color" type="color" value="${esc(project.color)}">${logo ? `<img src="${esc(logo.url)}" alt="Unternehmenslogo"><button class="button secondary small" data-action="remove-logo">Logo entfernen</button>` : '<button class="button secondary small" data-action="pick-logo">Logo hinzufügen</button>'}</div>
    <p class="server-note">${cloud.status?.connections.openai && !project.demoOnly ? 'Die KI verwendet deine bestätigten Angaben und wertet die gewählten Fotos aus. Diese Aktion nutzt dein OpenAI-Kontingent. Fotos werden für das Video auf 9:16 zugeschnitten.' : 'Das KI-Paket ist für diesen Anbieter noch nicht aktiv. Die Vorlage ist ein kostenloser Layout-Test.'}</p><div class="editor-actions"><button class="button quiet" data-action="step" data-step="1">Zurück</button>${cloud.status?.connections.openai && !project.demoOnly ? `<button class="button primary" data-action="generate-ai"${busy ? ' disabled' : ''}>${busy === 'storyboard' ? '<span class="busy-indicator"></span>KI plant eure Szenen …' : 'Mit KI planen' + icon('spark')}</button>` : `<button class="button primary" data-action="generate-storyboard">Vorlage testen ${icon('spark')}</button>`}</div></div>`;
}

function storyboardEditor() {
  return storyboardView(pilotState()) + productionPanel(pilotState());
}

function studioExportEditor() {
  return exportView(pilotState()) + productionPanel(pilotState()) + (!project.demoOnly && !project.founderDemo && assets.length ? publicationMarkup(Boolean(publishing.blob && publishing.mode === 'studio')) : '');
}

function uploadEditor() {
  const max = uploadFile && sourceVideo.duration > 60;
  const audioCapture = typeof sourceVideo.captureStream === 'function' || typeof sourceVideo.mozCaptureStream === 'function';
  return `<div class="editor-inner"><div class="section-top"><h2>Dein Video. Klar gekennzeichnet.</h2><span class="pill">VIDEO VORBEREITEN</span></div><p class="section-description">Wähle ein vorhandenes Video. Wenn es KI-Inhalte enthält, setzt dein Studio den Hinweis automatisch in Vorschau und Export.</p>
    ${!uploadFile ? `<button class="dropzone" data-action="pick-video" id="dropzone">${icon('upload')}<strong>Zieh dein Video hier hinein.</strong><p>Oder wähle eine Datei von deinem Gerät.</p><span class="button primary small">Video auswählen ${icon('plus')}</span><p>MP4, WebM, MOV oder OGG · bis 100 MB</p></button>` : `<div class="selected-file">${icon('film')}<div><strong>${esc(uploadFile.name)}</strong><p>${(uploadFile.size / 1048576).toFixed(1)} MB · ${Number.isFinite(sourceVideo.duration) ? sourceVideo.duration.toFixed(1) + ' Sekunden' : 'Wird geladen …'}</p></div><button data-action="remove-video" aria-label="Video entfernen">${icon('x')}</button></div>`}
    <div class="upload-toggle"><label class="checkline"><input id="upload-ai" type="checkbox"${uploadContainsAi ? ' checked' : ''}><strong>Enthält KI-Inhalte</strong></label><p>Bei gesetztem Häkchen erscheint „${AI_LABEL}“ fest oben im Video. Das Label bleibt auch im Export sichtbar.</p></div>
    <div class="note">${icon('info')} Bei KI-Inhalten exportierst du zuerst die Fassung mit festem Hinweis. Ohne KI-Inhalte kannst du die geprüfte Originaldatei mit ihrem Ton direkt einreichen.</div>
    ${uploadFile ? `<div style="margin-top:19px"><label class="checkline"><input id="upload-approved" type="checkbox"${uploadApproved ? ' checked' : ''}><span>Ich habe das Video und die Kennzeichnung geprüft.</span></label></div><div class="export-options"><button class="button primary" id="export-upload" data-action="export-upload"${!uploadApproved || max || exportRunning || !Number.isFinite(sourceVideo.duration) ? ' disabled' : ''}>${icon('download')}Video exportieren</button></div><p class="field-help" style="margin-top:10px">${max ? 'Der lokale Export ist auf 60 Sekunden begrenzt. Die Vorschau zeigt das komplette Video.' : audioCapture ? 'Originalton wird übernommen, wenn der Browser eine Audiospur bereitstellt. Format: MP4 oder WebM.' : 'Dieser Browser unterstützt hier keinen Originalton-Export. Der Export ist ohne Ton.'}</p>` : ''}${progressMarkup()}${publicationMarkup(Boolean(publishing.blob && publishing.mode === 'upload'))}
    <div class="editor-actions"><button class="button secondary" data-view="sharing">${icon('qr')}Link & QR zum GRVKN-Beitrag</button><span class="pill soft">LOKALE VORBEREITUNG</span></div></div>`;
}

function progressMarkup() {
  if (!exportState) return '';
  return `<div class="progress-box" role="status"><strong id="export-message">${esc(exportState.message)}</strong><p id="export-detail">${esc(exportState.detail || '')}</p><div class="progress-track"><span id="export-progress" style="width:${Math.min(100, exportState.progress || 0)}%"></span></div></div>`;
}

function renderProjects() {
  return projects.length ? `<div class="project-grid">${projects.map(item => `<article class="project-card"><div class="project-art"><span>GRVKN STUDIO · ENTWURF</span><strong>${esc(item.company || 'Deine Idee')}</strong></div><div class="project-content"><h3>${esc(item.name || item.company)}</h3><p>${esc(item.city)} · ${item.duration} Sekunden · ${esc(item.status)}</p><p>${esc(new Date(item.updatedAt).toLocaleDateString('de-DE'))}</p><div class="project-actions"><button class="button secondary small" data-action="load-project" data-id="${esc(item.id)}">Entwurf öffnen ${icon('arrow')}</button><button data-action="delete-project" data-id="${esc(item.id)}">Entfernen</button></div></div></article>`).join('')}</div>` : `<div class="empty-projects">${icon('grid')}<h2>Deine nächste Idee wartet schon.</h2><p>Speichere im Studio einen Entwurf. Hier findest du seine Texte und das Storyboard wieder.</p><button class="button primary" data-action="new-project">Erstes Video planen ${icon('plus')}</button></div>`;
}

function conceptMarkup() {
  return `<div class="concept-hero"><div><p class="eyebrow">DEIN UNTERNEHMEN IN BEWEGUNG</p><h2>Ein paar Angaben.<br>Ein Film, der zu euch passt.</h2><p>Das Studio verbindet eure Homepage und Fotos mit deiner Idee. Du prüfst den Vorschlag, die KI produziert die Szenen und das Studio setzt euren Film zusammen.</p></div><div class="concept-stamp"><span>DEINE REGION</span><strong>↗</strong><span>IN BEWEGUNG</span></div></div><div class="concept-grid"><article class="concept-card"><span class="pill">01 · DAS PROFIL</span><h3>Der Betrieb bleibt gespeichert.</h3><p>Mit Anmeldung werden Unternehmensangaben, Quellen, Projekte und Fotos privat gespeichert. Ohne Homepage sucht die KI anhand von Name und Ort. Du bestätigst den richtigen Betrieb.</p></article><article class="concept-card"><span class="pill premium">02 · DIE PRODUKTION</span><h3>Eure Bilder werden zu Filmszenen.</h3><p>Die KI plant passende Texte und Bewegung für eure eigenen Bilder. Wähle einen Film aus Fotos oder echte KI-Bewegtbilder, optional mit KI-Stimme. Vor dem Start siehst du die Kostenschätzung.</p></article><article class="concept-card"><span class="pill">03 · DIE KENNZEICHNUNG</span><h3>Der Hinweis bleibt im Video.</h3><p>Studio-KI-Videos werden automatisch mit „Mit KI generiert“ gekennzeichnet. Bei vorhandenen Videos steuerst du das Label mit „Enthält KI-Inhalte“. Der Export brennt die gewählte Kennzeichnung ins Bild.</p></article><article class="concept-card"><span class="pill">04 · DER PILOT</span><h3>Vorführen, prüfen, herunterladen.</h3><p>Die Pilotphase bleibt privat. Der Schnitt läuft im geöffneten Browser, die Ausgabe ist je nach Browser MP4 oder WebM. Nach Prüfung der Vorschau reichst du den Export direkt hier zur Moderation ein. Der Beitrag wird erst nach Freigabe öffentlich.</p></article></div>`;
}

function render() {
  const meta = {
    overview:['Studio-Übersicht','DEIN GRVKN STUDIO','Deine Region. Dein nächster Film.','Projekte, Monatsplanung und Freigaben an einem Ort.'],
    campaigns:['Monatskampagnen','EINMAL PLANEN','Deine Angebote. Woche für Woche.','Du bestätigst die Inhalte. Das Studio bereitet die nächsten Wochen vor.'],
    quota:['Generierungskontingent','VERBRAUCH IM BLICK','Bewusst produzieren.','Kontingent und API-Kosten für deinen Anbieterzugang.'],
    subscription:['Studio-Abonnement','DEIN KI-PAKET','Dein Studio-Tarif.','Unabhängig von GRVKN Business und deinem normalen Video-Upload.'],
    founder:['Founder Demo Mode','AUTORISIERTE INTERNE DEMOS','Dein privater Vorführraum.','Externe Webseiten nur mit Autorisierung. Demos bleiben privat.'],
    studio: ['Video erstellen', 'VON DER IDEE ZUM AUFTRITT', 'Deine Region. Dein Video.', 'Zeig, was euch ausmacht. Dein Studio macht euch sichtbar.'],
    upload: ['Video hochladen', 'DEIN VIDEO AUF GRVKN', 'Zeig, was bei dir passiert.', 'Dein Video bekommt die passende Kennzeichnung. Ganz automatisch.'],
    projects: ['Meine Entwürfe', 'DEIN KREATIVER VORRAT', 'Ideen, die bleiben.', 'Hier findest du deine gespeicherten Storyboards und Entwürfe.'],
    sharing: ['Link & QR', 'DEIN VIDEO WEITERGEBEN', 'Ein Video. Viele Wege.', 'Beitragslink kopieren, teilen und QR-Code für den Druck herunterladen.'],
    settings: ['Mein Studio', 'DEIN PRIVATES PILOT-STUDIO', 'Alles bereit für eure Geschichten?', 'Betriebe, API-Zugänge und Produktionskontingente im Blick.'],
    concept: ['So funktioniert’s', 'GRVKN STUDIO · PRODUKTKONZEPT', 'Eine Idee. Ein klarer Weg.', 'So entsteht euer Video im Pilot-Studio.']
  }[view];
  $('#breadcrumb-current').textContent = meta[0];
  $('#page-eyebrow').textContent = meta[1];
  $('#page-heading').textContent = meta[2];
  $('#page-subtitle').textContent = meta[3];
  $('#load-example').hidden = view !== 'studio';
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  $('#project-count').textContent = projects.length;
  document.querySelectorAll('[data-founder-only]').forEach(el=>{el.hidden=cloud.status?.security?.founder!==true;});
  const workspace = ['studio', 'upload'].includes(view);
  $('#workspace-grid').hidden = !workspace;
  $('#standalone').hidden = workspace;
  if(workspace)$('#standalone').innerHTML='';else $('#editor').innerHTML='';
  renderStepper();
  if (view === 'studio') $('#editor').innerHTML = [companyEditor, briefingEditor, storyboardEditor, studioExportEditor][step - 1]();
  if (view === 'upload') $('#editor').innerHTML = uploadEditor();
  if(['overview','campaigns','quota','subscription','founder'].includes(view))$('#standalone').innerHTML=workflowView(view,pilotState());
  if (view === 'projects') $('#standalone').innerHTML = renderProjects();
  if (view === 'concept') $('#standalone').innerHTML = conceptMarkup();
  if (view === 'settings') $('#standalone').innerHTML = settingsView(pilotState());
  if (view === 'sharing') $('#standalone').innerHTML = `<div class="ad-picker field"><span>Deine GRVKN-Videos</span><select id="own-ad"><option value="">Video auswählen</option>${account.ads.filter(ad => ad.video_url).map(ad => `<option value="${esc(ad.id)}"${project.grvknAdId === ad.id ? ' selected' : ''}>${esc(ad.title)} · ${esc(ad.status === 'active' ? 'Veröffentlicht' : ad.status === 'pending' ? 'In Prüfung' : ad.status)}</option>`).join('')}</select><p class="field-help">Der öffentliche Link zeigt dein Video nach der Moderationsfreigabe. Beim Ersetzen bleiben Link und QR gleich.</p></div>` + sharingView({ reference: project.grvknAdId ? readAdReference(project.grvknAdId) : null, savedAdId: project.grvknAdId, canSave: Boolean(project.company.trim()) && !project.demoOnly });
  if (exportRunning || busy || publishing.busy || activeProduction()) document.querySelectorAll('#editor input, #editor textarea, #editor select, #editor button, #stepper button').forEach(element => { element.disabled = true; });
  $('#load-example').disabled = exportRunning || Boolean(busy) || activeProduction();
  if (activeProduction() && !busy && !exportRunning) document.querySelectorAll('[data-action="resume-production"], [data-action="cancel-production"]').forEach(button => { button.disabled = false; });
  $('#preview-empty').hidden = view !== 'upload' || !!uploadFile;
  $('#below-editor').innerHTML = `${icon('lock')}<span>${view === 'upload' ? 'Originaldatei auf deinem Gerät · Export mit Kennzeichnung' : cloud.ready && !project.demoOnly ? 'Privat gespeichert in deinem Studio' : 'Demo-Entwürfe in diesem Browser'}</span><span class="below-version">${view === 'studio' ? project.demoOnly ? 'FIKTIVES BEISPIEL' : 'PREMIUM · PILOT' : 'VIDEO VORBEREITEN'}</span>`;
  updateConnectionNotice();
  $('#connection-notice').hidden = view === 'sharing';
  syncPreviewUi();
  paint();
}

function invalidate() {
  resetPublicationFile();
  project.approved = false;
  project.status = 'Entwurf';
  exportState = null;
  costConsent = false;
  if (productionJob?.status === 'ready') { productionJob = null; mediaReady = false; realMedia.reset(); }
}

function navigate(nextView) {
  if (exportRunning || busy) return toast('Bitte warte, bis die laufende Aktion fertig ist.');
  pausePlayer();
  view = nextView;
  exportState = null;
  player.time = 0;
  render();
  if(['overview','campaigns','quota','subscription'].includes(view)&&cloud.status?.backendReady)void loadWorkflows(project.id).then(()=>render());
}

function goStep(nextStep) {
  if (exportRunning) return toast('Bitte warte, bis der Video-Export fertig ist.');
  if (nextStep > 1 && (!project.confirmed || !project.company.trim() || !project.city.trim())) return toast('Ergänze Name und Ort und bestätige zuerst die Unternehmensangaben.');
  if (nextStep > 2 && project.scenes.length !== 4) return toast('Erstelle zuerst einen Storyboard-Vorschlag aus deiner Idee.');
  step = nextStep;
  pausePlayer();
  player.time = 0;
  render();
}

function resetAssets() {
  stopWatching(); productionJob = null; mediaReady = false; realMedia.reset(); candidates = []; costConsent = false;
  assets.forEach(asset => URL.revokeObjectURL(asset.url)); assets = [];
  if (logo) URL.revokeObjectURL(logo.url);
  logo = null;
}

document.addEventListener('click', async event => {
  const nav = event.target.closest('[data-view]');
  if (nav) { event.preventDefault(); return navigate(nav.dataset.view); }
  if (event.target.closest('#load-example')) {
    if (exportRunning || busy || activeProduction()) return;
    resetAssets(); project = exampleProject(); step = 1; researchShown = false; player.time = 0; exportState = null; pausePlayer(); render();
    toast('Fiktives Beispiel geladen. Du kannst alle Angaben ersetzen.');
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  if (exportRunning) return toast('Der Export läuft. Änderungen sind danach wieder möglich.');
  const action = button.dataset.action;
  if (busy) return toast('Deine Aktion läuft noch.');
  if(action==='export-studio'&&cloud.status?.production?.configured&&project.source==='ai_assisted'&&(productionJob?.status==='ready'||workflowState.production?.renders?.length)){await workflowAction({dataset:{action:'wf-download'}},workflowContext());return;}
  if(action.startsWith('wf-')){try{await workflowAction(button,workflowContext());}catch(error){toast(error.message);}return;}
  if(action==='website-images'){await runTask('images',async()=>{if(!project.aiRightsConfirmed)throw new Error('Bitte bestätige zuerst die Materialrechte.');await saveCloudProject(false);const result=await api('/api/websites/import',{method:'POST',body:{projectId:project.id,rightsAccepted:true},billable:true});await openProject(result.project.id);step=2;toast('Webseitenbilder privat gespeichert. Bitte prüfe die Motive.');});return;}
  if (await pilotAction(action, button)) return;
  if (['copy-ad-link', 'share-ad-link', 'download-qr-png', 'download-qr-svg', 'save-ad-reference'].includes(action)) {
    try {
      const reference = readAdReference(project.grvknAdId);
      if (action === 'copy-ad-link') {
        try { await navigator.clipboard.writeText(reference.url); toast('Beitragslink kopiert.'); }
        catch { $('#grvkn-public-link').focus(); $('#grvkn-public-link').select(); toast('Bitte den markierten Link kopieren.'); }
      }
      if (action === 'share-ad-link') {
        if (navigator.share) {
          try { await navigator.share({ title: 'GRVKN · ' + (project.company || 'Deine Region'), url: reference.url }); }
          catch (error) { if (error.name !== 'AbortError') toast('Teilen ist hier nicht verfügbar. Kopiere den Beitragslink.'); }
        } else toast('Nutze „Link kopieren“, um den Beitrag weiterzugeben.');
      }
      if (action === 'download-qr-svg') download(new Blob([qrSvg(reference.url)], { type: 'image/svg+xml' }), 'GRVKN-QR-' + reference.adId.slice(0, 8) + '.svg');
      if (action === 'download-qr-png') await runTask('qr', async () => download(await qrPng(reference.url), 'GRVKN-QR-' + reference.adId.slice(0, 8) + '.png'));
      if (action === 'save-ad-reference') {
        if (activeProduction()) return toast('Speichere die Verknüpfung nach dem laufenden Produktionsauftrag.');
        await runTask('save', () => saveProject());
      }
    } catch (error) { toast(error.message); }
    return;
  }
  if (activeProduction() && !['step','expand-scene','download-project'].includes(action)) return toast('Beende zuerst den laufenden Produktionsauftrag.');
  if (action === 'step') goStep(Number(button.dataset.step));
  if (action === 'next-company') {
    if (!project.company.trim() || !project.city.trim()) return toast('Bitte ergänze den Unternehmensnamen und den Ort.');
    try { project.website = normalizeWebsite(project.website); } catch (error) { return toast(error.message); }
    if (!project.confirmed) return toast('Bitte bestätige die Unternehmensangaben für deinen Entwurf.');
    if (cloud.ready && !project.demoOnly) {
      const saved = await runTask('save', () => saveProject(false));
      if (!saved) return;
    }
    goStep(2);
  }
  if (action === 'research-demo') {
    try { project.website = normalizeWebsite(project.website); } catch (error) { return toast(error.message); }
    researchShown = !researchShown; render();
  }
  if (action === 'goal') { project.goal = button.dataset.goal; invalidate(); project.scenes = []; render(); }
  if (action === 'generate-storyboard') {
    try { project.scenes = buildStoryboard(project); } catch (error) { return toast(error.message); }
    project.source = 'studio-ai-demo'; invalidate(); expandedScene = 0; step = 3; player.time = 0; pausePlayer(); render();
    toast('Vier Szenen aus deiner Vorlage erstellt. Texte und Motive kannst du jetzt anpassen.');
  }
  if (action === 'expand-scene') { expandedScene = Number(button.dataset.index); player.time = expandedScene * project.duration / 4; render(); }
  if (action === 'save-project') await runTask('save', () => saveProject());
  if (action === 'download-project') {
    await runTask('save', () => saveProject(false));
    download(new Blob([JSON.stringify(projectManifest(project, productionJob), null, 2)], { type: 'application/json' }), safeFilename(project.company) + '-storyboard.json');
    toast('Storyboard heruntergeladen. Fotos und Logo sind nicht in der JSON-Datei enthalten.');
  }
  if (action === 'new-project') { workflowState.production=null;resetAssets(); project = newProviderProject(); {const ownCompany=cloud.companies.find(c=>c.id===`${account.provider.business_id}_${account.user.id}`);if(ownCompany)applyCompany(ownCompany);} step = 1; researchShown = false; navigate('studio'); }
  if (action === 'load-project') {
    const found = projects.find(item => item.id === button.dataset.id);
    if (!found) return;
    if (cloud.ready && cloud.projects.some(item => item.id === found.id)) { await runTask('load', () => openProject(found.id)); return; }
    resetAssets(); project = safeProject(found); step = project.scenes.length ? 3 : project.confirmed ? 2 : 1; researchShown = false; navigate('studio');
    toast('Entwurf geöffnet. Bitte wähle die Fotos und das Logo bei Bedarf erneut aus.');
  }
  if (action === 'delete-project') { if (cloud.ready && cloud.projects.some(item => item.id === button.dataset.id)) { await runTask('delete', async () => { await api('/api/projects/' + button.dataset.id, { method: 'DELETE' }); cloud.projects = cloud.projects.filter(item => item.id !== button.dataset.id); projects = cloud.projects.map(safeProject); render(); }); return; } projects = projects.filter(item => item.id !== button.dataset.id); persist(); render(); }
  if (action === 'pick-images') $('#images-input').click();
  if (action === 'pick-logo') $('#logo-input').click();
  if (action === 'pick-video') $('#video-input').click();
  if (action === 'remove-image') { const index = Number(button.dataset.index); if (assets[index]?.id) { try { await api('/api/assets/' + assets[index].id, { method: 'DELETE' }); } catch (error) { return toast(error.message); } } if (assets[index]) URL.revokeObjectURL(assets[index].url); assets.splice(index, 1); invalidate(); render(); }
  if (action === 'remove-logo') { if (logo?.id) { try { await api('/api/assets/' + logo.id, { method: 'DELETE' }); } catch (error) { return toast(error.message); } } if (logo) URL.revokeObjectURL(logo.url); logo = null; invalidate(); render(); }
  if (action === 'remove-video') clearUpload();
  if (action === 'export-studio') await exportVideo('studio');
  if (action === 'export-upload') await exportVideo('upload');
});

document.addEventListener('submit', event => {
  if (event.target.id !== 'sharing-form') return;
  event.preventDefault();
  if (busy || exportRunning) return toast('Bitte warte, bis die laufende Aktion fertig ist.');
  try {
    const reference = readAdReference($('#grvkn-ad-reference').value);
    project.grvknAdId = reference.adId;
    render();
    toast('Link und QR-Code vorbereitet. Der Beitragsstatus bleibt in GRVKN.');
  } catch (error) { toast(error.message); }
});

document.addEventListener('input', event => {
  const element = event.target;
  if ((exportRunning || busy || activeProduction()) && (element.dataset.field || element.dataset.scene)) return;
  if (element.dataset.field) {
    const key = element.dataset.field;
    project[key] = key === 'duration' ? Number(element.value) : element.value;
    if (['company','providerType','city','website','facts'].includes(key)) {
      project.confirmed = false; candidates = [];
      const confirm = $('#company-confirmed'); if (confirm) confirm.checked = false;
      researchShown = false;
      $('.research-result')?.remove();
    }
    invalidate();
    if (key !== 'color') project.scenes = [];
    syncPreviewUi(); paint();
  }
  if (element.dataset.scene !== undefined) {
    const scene = project.scenes[Number(element.dataset.scene)];
    if (!scene) return;
    scene[element.dataset.sceneField] = element.dataset.sceneField === 'imageIndex' ? Number(element.value) : element.value;
    invalidate();
    if (element.dataset.sceneField === 'headline') {
      const heading = element.closest('.scene-editor')?.querySelector('.scene-editor-head strong');
      if (heading) heading.textContent = element.value.replace(/\n/g, ' ');
    }
    paint();
  }
});

document.addEventListener('change', async event => {
  if(event.target.id==='ai-rights-confirmed'){
    project.aiRightsConfirmed=event.target.checked;
    if(!project.aiRightsConfirmed&&cloud.status?.backendReady&&cloud.projects.some(p=>p.id===project.id))try{await api('/api/rights/consent',{method:'POST',body:{projectId:project.id,accepted:false}});}catch(error){toast(error.message);}
  }
  if (event.target.id === 'company-confirmed') project.confirmed = event.target.checked;
  if (event.target.id === 'studio-approved') {
    project.approved = event.target.checked; project.status = project.approved ? 'Geprüft' : 'Entwurf';
    render();
  }
  if (event.target.id === 'company-picker') { if (busy || activeProduction()) return; const selected = cloud.companies.find(item => item.id === event.target.value); resetAssets(); project = newProviderProject(); if (selected) applyCompany(selected); step = 1; render(); }
  if(event.target.id==='production-music'){project.musicEnabled=event.target.checked;project.approved=false;resetPublicationFile();render();}
  if (event.target.id === 'production-voice') { productionVoice = event.target.checked; costConsent = false; render(); }
  if (event.target.id === 'cost-consent') { costConsent = event.target.checked; render(); }
  if (event.target.id === 'upload-ai') { uploadContainsAi = event.target.checked; uploadApproved = false; exportState = null; render(); }
  if (event.target.id === 'upload-approved') { uploadApproved = event.target.checked; const button = $('#export-upload'); if (button) button.disabled = !uploadApproved || sourceVideo.duration > 60 || !Number.isFinite(sourceVideo.duration); }
});

function safeFilename(name) {
  return String(name || 'grvkn').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 80) || 'grvkn';
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function decodeImage(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Bitte verwende JPG, PNG oder WebP.');
  if (file.size > 10 * 1048576) throw new Error('Ein Foto darf maximal 10 MB groß sein.');
  const url = URL.createObjectURL(file);
  const img = new Image(); img.src = url;
  try { await img.decode(); } catch { URL.revokeObjectURL(url); throw new Error('Dieses Bild konnte nicht gelesen werden.'); }
  if (img.width * img.height > 40000000) { URL.revokeObjectURL(url); throw new Error('Bitte wähle ein kleineres Bild mit höchstens 40 Megapixeln.'); }
  return { url, img, name: file.name };
}

$('#images-input').addEventListener('change', async event => {
  const files = Array.from(event.target.files || []); event.target.value = '';
  if (exportRunning || busy || activeProduction()) return;
  const remaining = 4 - assets.length;
  if (files.length > remaining) toast('Es sind höchstens 4 Fotos pro Entwurf möglich.');
  for (const file of files.slice(0, remaining)) {
    try { assets.push(await decodeImage(file)); } catch (error) { toast(error.message); }
  }
  invalidate(); render();
});
$('#logo-input').addEventListener('change', async event => {
  const file = event.target.files?.[0]; event.target.value = ''; if (!file || exportRunning || busy || activeProduction()) return;
  try { const next = await decodeImage(file); if (logo) URL.revokeObjectURL(logo.url); logo = next; invalidate(); render(); } catch (error) { toast(error.message); }
});

function clearUpload() {
  ++sourceSequence;
  pausePlayer(); sourceVideo.removeAttribute('src'); sourceVideo.load();
  if (uploadUrl) URL.revokeObjectURL(uploadUrl);
  resetPublicationFile();
  uploadUrl = ''; uploadFile = null; uploadApproved = false; player.time = 0; exportState = null;
  render();
}

function loadVideo(file) {
  if (!file || exportRunning || busy || activeProduction()) return;
  if (!/\.(mp4|m4v|webm|mov|ogg|ogv)$/i.test(file.name)) return toast('Bitte verwende eine MP4-, WebM-, MOV- oder OGG-Datei.');
  if (file.size > 100 * 1048576) return toast('Dein Video darf höchstens 100 MB groß sein.');
  clearUpload();
  const sequence = ++sourceSequence;
  uploadFile = file; uploadUrl = URL.createObjectURL(file); sourceVideo.src = uploadUrl;
  sourceVideo.onloadedmetadata = () => {
    if (sequence !== sourceSequence) return;
    if (!Number.isFinite(sourceVideo.duration) || sourceVideo.duration <= 0 || !sourceVideo.videoWidth) { clearUpload(); return toast('Das Video hat keine lesbare Dauer oder Bildspur. Bitte exportiere es als MP4 neu.'); }
    render();
  };
  sourceVideo.onloadeddata = () => { if (sequence === sourceSequence) paint(); };
  sourceVideo.onerror = () => { if (sequence === sourceSequence) { clearUpload(); toast('Dein Browser kann diese Videodatei nicht abspielen. Probiere eine MP4-Datei.'); } };
  sourceVideo.load(); render();
}
$('#video-input').addEventListener('change', event => { const file = event.target.files?.[0]; event.target.value = ''; loadVideo(file); });
document.addEventListener('dragover', event => {
  if (view !== 'upload') return;
  event.preventDefault(); $('#dropzone')?.classList.add('dragging');
});
document.addEventListener('dragleave', event => { if (!event.relatedTarget) $('#dropzone')?.classList.remove('dragging'); });
document.addEventListener('drop', event => {
  if (view !== 'upload') return;
  event.preventDefault(); $('#dropzone')?.classList.remove('dragging'); loadVideo(event.dataTransfer?.files?.[0]);
});

function activeScenes() { return project.scenes.length === 4 ? project.scenes : fallbackScenes; }
function activeDuration() { return view === 'upload' ? Number.isFinite(sourceVideo.duration) ? sourceVideo.duration : 0 : project.scenes.length ? project.duration : 20; }
function activeLabel() { return needsAiLabel({ declaredContainsAi: view === 'upload' ? uploadContainsAi : false, provenance: view === 'upload' ? 'uploaded' : 'studio-ai-demo' }); }
function formatTime(seconds) { const total = Math.max(0, Math.floor(seconds || 0)); return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0'); }
function formatSceneTime(seconds) { return Number.isInteger(seconds) ? seconds + 's' : seconds.toFixed(1) + 's'; }

function syncPreviewUi() {
  const duration = activeDuration();
  $('#timeline').max = duration || 20; $('#timeline').value = player.time; $('#timeline').disabled = view === 'upload' && !uploadFile || exportRunning;
  $('#time-display').textContent = formatTime(player.time) + ' / ' + formatTime(duration);
  $('#toggle-play').disabled = view === 'upload' && !uploadFile || exportRunning;
  $('#toggle-play').innerHTML = icon(player.playing ? 'pause' : 'play'); $('#toggle-play').setAttribute('aria-label', player.playing ? 'Vorschau pausieren' : 'Vorschau abspielen');
  const label = activeLabel();
  $('#label-status').classList.toggle('off', !label);
  $('#label-status').innerHTML = icon(label ? 'check' : 'info') + (label ? 'KI-Kennzeichnung aktiv' : 'Keine KI-Inhalte angegeben');
  $('#preview-caption').textContent = view === 'upload' ? uploadFile ? 'Originalformat ohne Beschnitt im Hochformat' : 'Deine lokale Videovorschau' : !project.scenes.length ? 'Fiktive Beispielvorschau · noch kein Entwurf' : assets.length ? productionJob?.status === 'ready' && productionJob.mode === 'video' && mediaReady ? 'Echte KI-Bewegtbilder · eigene Unternehmensfotos' : project.source === 'ai_assisted' ? 'KI-Storyboard · Foto-Layout-Vorschau' : 'Deine Fotos · Layout-Test' : 'Platzhalter-Motive · eigene Fotos möglich';
  $('#scene-strip').hidden = view === 'upload';
  const index = getSceneAt(activeScenes(), player.time).index;
  $('#scene-strip').innerHTML = activeScenes().map((scene, i) => `<button class="scene-thumb${index === i ? ' active' : ''}" data-action="preview-scene" data-index="${i}" aria-label="Szene ${i+1} in der Vorschau ansehen"><span class="scene-thumb-art">0${i+1}</span><span>${formatSceneTime(scene.seconds)}</span></button>`).join('');
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action="preview-scene"]');
  if (!button || exportRunning) return;
  pausePlayer(); player.time = Number(button.dataset.index) * activeDuration() / 4; syncPreviewUi(); paint();
});

function pausePlayer() { player.playing = false; sourceVideo.pause(); realMedia.pause(); }

$('#toggle-play').addEventListener('click', async () => {
  if (exportRunning) return;
  if (player.playing) pausePlayer();
  else {
    if (player.time >= activeDuration() - 0.04) { player.time = 0; if (uploadFile) sourceVideo.currentTime = 0; }
    player.last = performance.now();
    if (view === 'upload') { try { await sourceVideo.play(); } catch { return toast('Das Video konnte gerade nicht abgespielt werden.'); } }
    if (productionJob?.status === 'ready' && mediaReady && view !== 'upload') await realMedia.startAudio(player.time);
    player.playing = true;
  }
  syncPreviewUi();
});
$('#timeline').addEventListener('input', event => {
  if (exportRunning) return;
  pausePlayer(); player.time = Number(event.target.value);
  if (view === 'upload' && uploadFile) sourceVideo.currentTime = player.time;
  player.last = performance.now(); syncPreviewUi(); paint();
});
sourceVideo.addEventListener('seeked', () => paint());
sourceVideo.addEventListener('ended', () => { if (!exportRunning) { pausePlayer(); player.time = sourceVideo.duration; syncPreviewUi(); } });

function roundedRect(x, y, width, height, radius, fill) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fillStyle = fill; ctx.fill();
}
function fitImage(image, progress, cover = true) {
  const width = image.videoWidth || image.width; const height = image.videoHeight || image.height;
  if (!width || !height) return;
  const scale = (cover ? Math.max : Math.min)(720 / width, 1280 / height) * (cover ? 1.04 + progress * 0.055 : 1);
  const dw = width * scale, dh = height * scale;
  ctx.drawImage(image, (720 - dw) / 2, (1280 - dh) / 2, dw, dh);
}

function drawWorkshop(index, progress) {
  const modern = project.style === 'Klar & modern';
  const dynamic = project.style === 'Dynamisch & direkt';
  const gradient = ctx.createLinearGradient(0, 0, 720, 1280);
  gradient.addColorStop(0, modern ? '#142e3a' : '#142f2b'); gradient.addColorStop(.58, '#2e4c40'); gradient.addColorStop(1, '#b1804d');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 720, 1280);
  ctx.save();
  const scale = 1.025 + progress * (dynamic ? .09 : .045); ctx.translate(360, 640); ctx.scale(scale, scale); ctx.translate(-360, -640);
  const light = ctx.createRadialGradient(565, 450, 30, 530, 540, 570);
  light.addColorStop(0, '#f4cb8e65'); light.addColorStop(1, '#edb16b00'); ctx.fillStyle = light; ctx.fillRect(0, 0, 720, 1280);
  ctx.fillStyle = '#143a35'; ctx.fillRect(-40, 80, 190, 750); ctx.fillStyle = '#0a2426'; ctx.fillRect(102, 80, 26, 790);
  ctx.fillStyle = '#50715c'; ctx.fillRect(158, 164, 600, 620); ctx.fillStyle = '#1e453c'; ctx.fillRect(174, 177, 565, 590);
  const colors = ['#b38c59','#c19a62','#866647','#a38356'];
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = colors[(i + index) % colors.length]; ctx.fillRect(184 + i * 108, 188, 98, 564);
    ctx.fillStyle = '#2c463359'; ctx.fillRect(194 + i * 108, 194, 4, 558);
    ctx.fillStyle = '#efd4a34c'; ctx.fillRect(267 + i * 108, 200, 2, 541);
  }
  ctx.fillStyle = '#f7d69d'; ctx.fillRect(177, 174, 576, 4); ctx.fillStyle = '#0a2c29'; ctx.fillRect(173, 446, 589, 16);
  ctx.fillStyle = '#244137'; ctx.fillRect(0, 764, 800, 190); ctx.fillStyle = '#a8895e'; ctx.fillRect(158, 727, 570, 55);
  ctx.fillStyle = '#d8b882'; ctx.fillRect(146, 714, 600, 16); ctx.fillStyle = '#816b4a'; ctx.fillRect(142, 731, 619, 9);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#94734e' : '#a58456'; ctx.fillRect(161 + i * 95, 781, 89, 215); }
  ctx.fillStyle = '#0f2d285e'; ctx.fillRect(0, 969, 720, 200);
  ctx.strokeStyle = '#b5c2a975'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(104, 936); ctx.quadraticCurveTo(41, 729, 81, 500); ctx.stroke();
  for (let i = 0; i < 9; i++) { ctx.save(); ctx.translate(86 + i * 1.5, 578 + i * 36); ctx.rotate(i % 2 ? -.45 : .85); ctx.fillStyle = i % 2 ? '#436c4c' : '#779063'; ctx.beginPath(); ctx.ellipse(i % 2 ? -24 : 22, 0, 42, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = '#68755d'; ctx.beginPath(); ctx.moveTo(49, 862); ctx.lineTo(130, 862); ctx.lineTo(116, 997); ctx.lineTo(64, 997); ctx.fill();
  const shadow = ctx.createLinearGradient(0, 0, 720, 0); shadow.addColorStop(0,'#021d1d60'); shadow.addColorStop(1,'#09242100'); ctx.fillStyle = shadow; ctx.fillRect(0,0,720,1280);
  ctx.restore();
}

function drawTextBlock(text, x, y, maxWidth, size, lineHeight, maxLines, color, weight = 500) {
  let lines = [];
  ctx.font = `${weight} ${size}px "Segoe UI", Arial, sans-serif`;
  const paragraphs = String(text || '').split('\n');
  for (const paragraph of paragraphs) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      const attempt = line ? line + ' ' + word : word;
      if (ctx.measureText(attempt).width > maxWidth && line) { lines.push(line); line = word; }
      else if (ctx.measureText(attempt).width > maxWidth) {
        let chunk = '';
        for (const char of word) { if (ctx.measureText(chunk + char).width > maxWidth && chunk) { lines.push(chunk); chunk = char; } else chunk += char; }
        line = chunk;
      } else line = attempt;
    }
    if (line) lines.push(line);
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines); let last = lines[maxLines - 1];
    while (last && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = last.trimEnd() + '…';
  }
  ctx.fillStyle = color;
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

function drawAiLabel() {
  ctx.save();
  ctx.font = '500 23px "Segoe UI", Arial, sans-serif';
  const width = Math.ceil(ctx.measureText(AI_LABEL).width) + 61;
  roundedRect(720 - width - 35, 45, width, 47, 23, '#070908ef');
  ctx.strokeStyle = '#B7FF3C66'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(720 - width - 35, 45, width, 47, 23); ctx.stroke();
  ctx.fillStyle = '#B7FF3C'; ctx.beginPath(); ctx.arc(720 - width - 13, 69, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.fillText(AI_LABEL, 720 - width + 1, 77);
  ctx.restore();
}

function paint() {
  ctx.clearRect(0, 0, 720, 1280);
  if (view === 'upload') {
    ctx.fillStyle = '#070908'; ctx.fillRect(0, 0, 720, 1280);
    if (uploadFile && sourceVideo.readyState >= 2) fitImage(sourceVideo, 0, false);
    if (uploadFile && activeLabel()) drawAiLabel();
    return;
  }
  const current = getSceneAt(activeScenes(), player.time);
  const scene = current.scene;
  const shownProject = project.scenes.length ? project : fallback;
  if (!scene) return;
  const generated = productionJob?.status === 'ready' && productionJob.mode === 'video' && mediaReady ? realMedia.current(activeScenes(), player.time, player.playing) : null;
  if (generated) fitImage(generated, 0, false);
  else if (assets.length) fitImage(assets[(scene.imageIndex ?? current.index) % assets.length].img, current.progress);
  else drawWorkshop(current.index, current.progress);
  const shade = ctx.createLinearGradient(0, 400, 0, 1280); shade.addColorStop(0, '#07090800'); shade.addColorStop(.4, '#07090838'); shade.addColorStop(.73, '#070908d0'); shade.addColorStop(1, '#070908f8'); ctx.fillStyle = shade; ctx.fillRect(0, 0, 720, 1280);
  ctx.fillStyle = '#ffffff';
  if (logo) { const image = logo.img; const scale = Math.min(170 / image.width, 90 / image.height); ctx.drawImage(image, 50, 122, image.width * scale, image.height * scale); }
  else drawTextBlock(shownProject.company.toUpperCase(), 49, 146, 620, 26, 31, 2, '#ffffff', 700);
  ctx.fillStyle = '#e0e5e1'; ctx.font = '500 18px "Segoe UI", Arial, sans-serif'; ctx.fillText(shownProject.city.toUpperCase().slice(0,35), 51, logo ? 225 : 221);
  ctx.save();
  const rise = current.progress < .15 ? 22 * (1 - current.progress / .15) : 0; ctx.translate(0, rise);
  roundedRect(49, 759, 57, 5, 2, project.color || '#B7FF3C');
  const headline = scene.headline;
  const size = headline.length > 70 ? 48 : headline.length > 46 ? 54 : 66;
  const bottom = drawTextBlock(headline, 48, 838, 620, size, size * 1.11, 3, '#ffffff', 600);
  drawTextBlock(scene.subtitle, 50, bottom + 16, 600, 25, 36, 3, '#d3dbd5', 400);
  ctx.restore();
  const markLoaded = grvknLogo.complete && grvknLogo.naturalWidth > 0;
  if (markLoaded) ctx.drawImage(grvknLogo, 49, 1168, 46, 46);
  const brandX = markLoaded ? 108 : 49;
  ctx.font = '700 18px "Segoe UI", Arial, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.fillText('GRVKN', brandX, 1187);
  ctx.font = '400 16px "Segoe UI", Arial, sans-serif'; ctx.fillStyle = '#A7B0AA'; ctx.fillText('Erstellt mit GRVKN Studio', brandX, 1214);
  ctx.font = '400 16px "Segoe UI", Arial, sans-serif'; ctx.fillStyle = '#A7B0AA'; ctx.textAlign = 'right'; ctx.fillText('0' + (current.index + 1) + ' / 04', 669, 1200); ctx.textAlign = 'left';
  if (activeLabel()) drawAiLabel();
}

function tick(now) {
  if (player.playing) {
    if (view === 'upload') player.time = sourceVideo.currentTime;
    else { player.time += Math.min(0.1, (now - (player.last || now)) / 1000); if (player.time >= activeDuration()) { player.time = activeDuration(); if (!exportRunning) player.playing = false; } }
    player.last = now;
    paint();
    $('#timeline').value = player.time; $('#time-display').textContent = formatTime(player.time) + ' / ' + formatTime(activeDuration());
    const current = getSceneAt(activeScenes(), player.time).index;
    document.querySelectorAll('.scene-thumb').forEach((button, i) => button.classList.toggle('active', i === current));
    if (!player.playing) syncPreviewUi();
  }
  requestAnimationFrame(tick);
}

async function waitForSeek(time) {
  if (Math.abs(sourceVideo.currentTime - time) < .025 && sourceVideo.readyState >= 2) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error('Das Video konnte nicht zum Anfang gespult werden.')); }, 6000);
    const done = () => { cleanup(); resolve(); };
    const cleanup = () => { clearTimeout(timer); sourceVideo.removeEventListener('seeked', done); };
    sourceVideo.addEventListener('seeked', done); sourceVideo.currentTime = time;
  });
}

function setExportProgress(progress, message, detail) {
  exportState = { progress, message, detail };
  if ($('#export-progress')) $('#export-progress').style.width = Math.min(100, progress) + '%';
  if ($('#export-message')) $('#export-message').textContent = message;
  if ($('#export-detail')) $('#export-detail').textContent = detail;
}

async function exportVideo(mode) {
  if (exportRunning) return;
  if (mode === 'studio' && (!project.approved || project.scenes.length !== 4)) return toast('Bitte prüfe und bestätige zuerst deinen Entwurf.');
  if (mode === 'upload' && (!uploadApproved || !uploadFile || sourceVideo.duration > 60 || sourceVideo.readyState < 2)) return toast('Bitte lade ein Video bis 60 Sekunden und bestätige die Vorschau.');
  if (!globalThis.MediaRecorder || !canvas.captureStream) return toast('Dieser Browser unterstützt den lokalen Video-Export nicht. Du kannst das Storyboard als JSON speichern.');
  const mime = selectRecorderMime(type => MediaRecorder.isTypeSupported(type));
  if (!mime) return toast('Dieser Browser bietet kein passendes Videoformat für den Export an.');
  const previousTime = player.time;
  let stream, capture, recorder, progressTimer, originalEnded, audioDestination;
  const realProduction = mode === 'studio' && productionJob?.status === 'ready';
  if (realProduction && !mediaReady) return toast(realMedia.loadError || 'Die Produktionsvorschau ist noch nicht bereit.');
  const chunks = [];
  let sourceHadAudio = false;
  let succeeded = false;
  let stoppingRecorder = false;
  exportRunning = true; pausePlayer(); player.time = 0;
  exportState = { progress: 0, message: 'Dein Video wird exportiert …', detail: 'Bitte lass diesen Tab im Vordergrund.' };
  render();
  try {
    if (mode === 'upload') await waitForSeek(0);
    if (realProduction) await realMedia.prepare(activeScenes());
    paint();
    stream = canvas.captureStream(30);
    if (mode === 'upload') {
      const captureFunction = sourceVideo.captureStream || sourceVideo.mozCaptureStream;
      if (captureFunction) {
        try { capture = captureFunction.call(sourceVideo); for (const track of capture.getAudioTracks()) { stream.addTrack(track); sourceHadAudio = true; } } catch {}
      }
    }
    if (realProduction && realMedia.buffer) { audioDestination = realMedia.context.createMediaStreamDestination(); audioDestination.stream.getAudioTracks().forEach(track => stream.addTrack(track)); }
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4000000 });
    const stopped = new Promise((resolve, reject) => {
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = resolve;
      recorder.onerror = event => reject(event.error || new Error('Der Browser hat den Export abgebrochen.'));
    });
    // A recorder can fail while source playback is starting. Attach a handler
    // immediately, and race recording failures against playback completion.
    stopped.catch(() => {});
    recorder.start(250);
    if (realProduction) await realMedia.startAudio(0, audioDestination);
    player.time = 0; player.last = performance.now();
    if (mode === 'upload') await sourceVideo.play();
    player.playing = true;
    const playbackComplete = new Promise((resolve, reject) => {
      const startedAt = performance.now();
      const duration = activeDuration();
      const finish = () => { clearInterval(progressTimer); if (originalEnded) sourceVideo.removeEventListener('ended', originalEnded); resolve(); };
      originalEnded = () => finish();
      if (mode === 'upload') sourceVideo.addEventListener('ended', originalEnded, { once: true });
      progressTimer = setInterval(() => {
        if (realProduction && realMedia.playbackError) { clearInterval(progressTimer); reject(new Error(realMedia.playbackError)); return; }
        const time = mode === 'upload' ? sourceVideo.currentTime : player.time;
        setExportProgress(100 * time / duration, 'Dein Video wird exportiert …', `${formatTime(time)} / ${formatTime(duration)} · ${mode === 'upload' ? sourceHadAudio ? 'mit Originalton' : 'ohne Tonspur' : realProduction ? realMedia.buffer ? 'mit KI-Sprecher' : 'ohne Sprecher' : 'Layout ohne Sprecher / Musik'}`);
        if (time >= duration - .025) finish();
        if ((performance.now() - startedAt) / 1000 > duration + 45) { clearInterval(progressTimer); if (originalEnded) sourceVideo.removeEventListener('ended', originalEnded); reject(new Error('Export pausiert oder zu langsam. Bitte lass den Tab geöffnet und versuche es erneut.')); }
      }, 100);
    });
    await Promise.race([playbackComplete, stopped.then(() => {
      if (!stoppingRecorder) throw new Error('Der Browser hat die Aufnahme vorzeitig beendet. Bitte versuche den Export erneut.');
    })]);
    pausePlayer(); paint(); stoppingRecorder = true; recorder.stop(); await stopped;
    if (!chunks.length) throw new Error('Der Browser hat keine Videodaten ausgegeben.');
    const blob = new Blob(chunks, { type: recorder.mimeType || mime });
    const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
    if (mode === 'upload' || !project.demoOnly && assets.length) setPublicationFile(blob, mode, mode === 'upload' ? uploadContainsAi : true);
    download(blob, safeFilename(mode === 'studio' ? project.company : uploadFile.name.replace(/\.[^.]+$/, '')) + '-grvkn.' + extension);
    setExportProgress(100, 'Fertig. Dein Video wurde heruntergeladen.', mode === 'upload' ? sourceHadAudio ? 'Mit Originalton. Die ausgewählte KI-Kennzeichnung ist ins Video gerendert.' : 'Ohne Tonspur. Die ausgewählte KI-Kennzeichnung ist ins Video gerendert.' : realProduction ? 'Dein Film mit fest gerenderter KI-Kennzeichnung.' : 'Animierter Layout-Test mit fest gerenderter Demo-Kennzeichnung.');
    if (mode === 'studio') {
      project.status = 'Exportiert';
      try { await saveProject(false); } catch { toast('Video heruntergeladen. Der Projektstatus konnte gerade nicht auf dem Server gespeichert werden.'); }
    }
    succeeded = true;
    toast('Video exportiert. Den Download findest du bei deinen Browser-Dateien.');
  } catch (error) {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    setExportProgress(0, 'Export konnte nicht abgeschlossen werden.', error.message || 'Bitte probiere einen anderen Browser.');
    toast(error.message || 'Der Export konnte nicht abgeschlossen werden.');
  } finally {
    clearInterval(progressTimer); if (originalEnded) sourceVideo.removeEventListener('ended', originalEnded);
    pausePlayer(); stream?.getTracks().forEach(track => track.stop()); capture?.getTracks().forEach(track => track.stop()); audioDestination?.disconnect();
    exportRunning = false;
    player.time = succeeded ? 0 : previousTime;
    if (mode === 'upload' && uploadFile) sourceVideo.currentTime = player.time;
    render();
  }
}

document.addEventListener('visibilitychange', () => { if (document.hidden && !exportRunning) { pausePlayer(); syncPreviewUi(); } });
render();
requestAnimationFrame(tick);
void connectWorkspace().then(() => {
  if (cloud.ready) {
    projects = cloud.projects.map(safeProject);
    if (!project.scenes.length) { const saved = cloud.companies.find(company => company.id === project.companyId); if (saved) applyCompany(saved); }
    if(!project.website&&cloud.status?.security?.website?.status==='verified')project.website=cloud.status.security.website.url;
    if (!cloud.status.connections.runway) productionMode = 'photos';
  }
  render();
});

function chooseOwnAd(value) {
  const ad = account.ads.find(item => item.id === value);
  if (!ad) return toast('Bitte wähle eines deiner GRVKN-Videos.');
  project.grvknAdId = ad.id; render();
}
document.addEventListener('input', event => { if (event.target.dataset.publish) readPublicationInputs(); });
document.addEventListener('change', event => {
  if(event.target.id==='wf-month'){workflowState.month=event.target.value;render();}
  if (event.target.dataset.publish === 'contentType') { readPublicationInputs(); render(); }
  if (event.target.id === 'own-ad') chooseOwnAd(event.target.value);
  if (event.target.id === 'upload-ai' || event.target.id === 'upload-approved') {
    resetPublicationFile();
    if (uploadApproved && !uploadContainsAi && uploadFile && Number.isFinite(sourceVideo.duration) && sourceVideo.duration <= 60) {
      const extension = uploadFile.name.split('.').pop().toLowerCase();
      const mime = { mp4:'video/mp4', m4v:'video/mp4', webm:'video/webm', mov:'video/quicktime' }[extension];
      if (mime) setPublicationFile(new Blob([uploadFile], { type: mime }), 'upload', false);
    }
    render();
  }
});
document.addEventListener('click', async event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'sharing') navigate('sharing');
  if (action === 'new-upload') { publishing.replacement = ''; publishing.draft = {}; clearUpload(); navigate('upload'); }
  if (action === 'submit-grvkn') {
    try {
      const pending = publishCurrent(); render();
      const id = await pending; if (id) { project.grvknAdId = id; project.status = 'In Prüfung'; toast('Video zur Prüfung eingereicht. Link und QR findest du unter Link & QR.'); }
    } catch (error) { toast(error.message); } finally { render(); }
  }
});
const requestedAd = new URL(location.href).searchParams.get('ad');
if (requestedAd) { try { prepareReplacement(requestedAd); project.grvknAdId = requestedAd; navigate('upload'); } catch (error) { toast(error.message); } }


// Private preview links never approve or publish through a GET request.
publishing.beforeSubmit=async ticket=>{
 if(publishing.mode!=='studio'||!cloud.status?.production?.configured)return;
 const output=await api('/api/production/'+project.id),slot=output.slot;
 if(slot?.id)await api('/api/campaigns/slots/'+slot.id+'/submission',{method:'POST',body:{ad:publishing.replacement||ticket.id,render:publishing.renderId||null}});
};
const reviewToken=new URLSearchParams(location.hash.replace(/^#/,'' )).get('review');
if(reviewToken){history.replaceState(null,'',location.pathname+location.search);void (async()=>{await new Promise(resolve=>{const check=()=>cloud.ready||cloud.error?resolve():setTimeout(check,100);check();});try{const result=await api('/api/reviews/resolve',{method:'POST',body:{token:reviewToken}});await openProject(result.slot.project_id);}catch(error){toast(error.message);navigate('campaigns');}})();}

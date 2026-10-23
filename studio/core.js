import { normalizeAdId, publicAdLink, providerType } from './grvkn.js';
export const AI_LABEL = 'Mit KI generiert';
export const CATEGORIES = ['Handwerk', 'Dienstleister', 'Gastronomie', 'Veranstaltungen/Kultur', 'Shopping', 'Auto/Mobilität', 'Stellenanzeigen', 'Azubi', 'Pflege/Soziales', 'Immobilien', 'Vereine/Sport', 'Bildung', 'Freizeit', 'Tourismus'];
export const GOALS = ['Unternehmen vorstellen', 'Angebot zeigen', 'Stellenanzeige', 'Azubi gesucht', 'Veranstaltung'];
export const runwaySceneSeconds=seconds=>Number(seconds)<=5?5:10;

export function needsAiLabel({ declaredContainsAi = false, provenance = 'uploaded', aiComponents = [] } = {}) {
  return declaredContainsAi === true || ['ai_generated', 'ai_assisted', 'studio-ai-demo'].includes(provenance) || aiComponents.length > 0;
}

export function normalizeWebsite(value) {
  const input = String(value ?? '').trim();
  if (!input) return '';
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : 'https://' + input;
  let url;
  try { url = new URL(candidate); } catch { throw new Error('Bitte gib eine gültige Website an.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) {
    throw new Error('Bitte verwende eine öffentliche Website ohne Zugangsdaten.');
  }
  return url.href;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function createProject() {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? 'project-' + Date.now(),
    name: '', company: '', city: '', website: '', facts: '', confirmed: false,
    goal: 'Unternehmen vorstellen', category: 'Handwerk', focus: '', cta: 'Entdecke uns auf GRVKN',
    duration: 20, musicEnabled: true, websiteImageSources: [], style: 'Warm & nahbar', color: '#B7FF3C', scenes: [], approved: false,
    updatedAt: new Date().toISOString(), status: 'Entwurf', source: 'studio-ai-demo',
    companyId: '', assetIds: [], logoId: '', demoOnly: false, founderDemo:false,aiRightsConfirmed:false,providerType: 'business', grvknAdId: ''
  };
}

export function exampleProject() {
  return { ...createProject(), name: 'Werkraum · Unternehmensvorstellung', company: 'Werkraum Bentheim', city: 'Bad Bentheim',
    website: 'https://werkraum-bentheim.example/', category: 'Handwerk',
    facts: 'Wir planen und fertigen Möbel nach Maß. Unser Team arbeitet in Bad Bentheim. Wir möchten zeigen, wie aus einer Idee ein persönliches Möbelstück wird.',
    focus: 'Unsere Werkstatt, die Liebe zum Holz und Möbel nach Maß zeigen.',
    cta: 'Lerne uns auf GRVKN kennen', demoOnly: true };
}

function clip(value, length) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length <= length ? text : text.slice(0, length - 1).trimEnd() + '…';
}

export function buildStoryboard(project) {
  const company = clip(project.company, 80);
  const city = clip(project.city, 60);
  if (!company || !city || !String(project.focus ?? '').trim()) throw new Error('Unternehmen, Ort und Videowunsch fehlen noch.');
  const duration = [15, 20, 30].includes(Number(project.duration)) ? Number(project.duration) : 20;
  const hooks = {
    'Unternehmen vorstellen': 'Lerne uns kennen.',
    'Angebot zeigen': 'Entdecke unser Angebot.',
    'Stellenanzeige': 'Dein nächster Job.\nDirekt hier.',
    'Azubi gesucht': 'Dein Start.\nIn deiner Region.',
    'Veranstaltung': 'Deine Region\nhat etwas vor.'
  };
  const titles = [hooks[project.goal] || hooks['Unternehmen vorstellen'], 'Darum geht’s.', 'Aus deiner Region.', clip(project.cta || 'Entdecke uns auf GRVKN', 96)];
  const subtitles = [company + ' · ' + city, clip(project.focus, 140), clip(project.facts || company + ' in ' + city, 160), company + ' · ' + city];
  const visuals = ['Einstieg / Außenansicht', 'Angebot / Details', 'Unternehmen / Atmosphäre', 'Abschluss / Kontakt'];
  return titles.map((headline, index) => ({ id: index + 1, headline, subtitle: subtitles[index],
    voiceover: index === 0 ? `Entdecke ${company} in ${city}.` : subtitles[index],
    visual: visuals[index], seconds: duration / 4 }));
}

export function getSceneAt(scenes, seconds) {
  let start = 0;
  for (let i = 0; i < scenes.length; i++) {
    const end = start + Math.max(0.1, Number(scenes[i].seconds) || 5);
    if (seconds < end) return { scene: scenes[i], index: i, start, progress: Math.max(0, (seconds - start) / (end - start)) };
    start = end;
  }
  return { scene: scenes.at(-1), index: Math.max(0, scenes.length - 1), start, progress: 1 };
}

export function safeProject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return createProject();
  const clean = createProject();
  const limits = { id: 120, name: 140, company: 80, city: 60, website: 1000, facts: 1600, focus: 1200, cta: 96, color: 7, style: 40, updatedAt: 40, status: 30 };
  for (const [key, limit] of Object.entries(limits)) if (typeof input[key] === 'string') clean[key] = input[key].slice(0, limit);
  clean.goal = GOALS.includes(input.goal) ? input.goal : clean.goal;
  clean.category = CATEGORIES.includes(input.category) ? input.category : clean.category;
  clean.duration = [15, 20, 30].includes(Number(input.duration)) ? Number(input.duration) : clean.duration;
  clean.color = /^#[0-9a-f]{6}$/i.test(clean.color) ? clean.color : '#B7FF3C';
  clean.confirmed = input.confirmed === true;
  clean.approved = input.approved === true;
  clean.musicEnabled = input.musicEnabled !== false;
  clean.websiteImageSources = Array.isArray(input.websiteImageSources) ? input.websiteImageSources.slice(0,4).map(x=>({url:String(x.url||'').slice(0,1000),source:String(x.source||'').slice(0,1000),name:String(x.name||'').slice(0,100)})) : [];
  clean.source = input.source === 'ai_assisted' ? 'ai_assisted' : 'studio-ai-demo';
  clean.companyId = typeof input.companyId === 'string' ? input.companyId.slice(0, 120) : '';
  clean.assetIds = Array.isArray(input.assetIds) ? input.assetIds.filter(value => typeof value === 'string').slice(0, 4) : [];
  clean.logoId = typeof input.logoId === 'string' ? input.logoId.slice(0, 120) : '';
  clean.demoOnly = input.demoOnly === true;
  clean.founderDemo=input.founderDemo===true;
  clean.aiRightsConfirmed=input.aiRightsConfirmed===true;
  clean.providerType = providerType(input.providerType);
  clean.grvknAdId = normalizeAdId(input.grvknAdId);
  clean.scenes = Array.isArray(input.scenes) ? input.scenes.slice(0, 4).map((scene, i) => ({ id: i + 1,
    headline: String(scene?.headline ?? '').slice(0, 96), subtitle: String(scene?.subtitle ?? '').slice(0, 180),
    voiceover: String(scene?.voiceover ?? '').slice(0, 300), visual: String(scene?.visual ?? '').slice(0, 100),
    prompt: String(scene?.prompt ?? '').slice(0, 800), imageIndex: Math.max(0, Math.min(3, Number(scene?.imageIndex) || 0)), seconds: clean.duration / 4 })) : [];
  if (clean.scenes.length !== 4) { clean.scenes = []; clean.approved = false; }
  return clean;
}

export function projectManifest(project, production = null) {
  const aiPlanned = project.source === 'ai_assisted';
  const ready = production?.status === 'ready';
  return { schemaVersion: 'grvkn-studio.pilot.v2', mode: ready ? production.mode === 'video' ? 'ai_video' : 'photo_film' : aiPlanned ? 'ai_storyboard' : 'prototype_template_demo', simulatesAiProduction: !aiPlanned && !ready,
    createdAt: new Date().toISOString(), company: { name: project.company, city: project.city, providerType: providerType(project.providerType), website: project.website, facts: project.facts, confirmed: project.confirmed },
    briefing: { goal: project.goal, category: project.category, focus: project.focus, cta: project.cta, duration: project.duration, style: project.style },
    provenance: { research: project.companyId ? 'saved_company_profile' : 'user_supplied_only', generatedFootage: ready && production.mode === 'video', generatedSpeech: ready && Boolean(production.audio), demoAiLabel: !aiPlanned && !ready },
    containsAi: needsAiLabel({ provenance: 'studio-ai-demo' }), aiLabel: AI_LABEL, approved: project.approved,
    sharing: normalizeAdId(project.grvknAdId) ? { adId: normalizeAdId(project.grvknAdId), publicUrl: publicAdLink(project.grvknAdId), publicationStatus: 'not_checked' } : null,
    productionId: production?.id || null, scenes: project.scenes.map(scene => ({ ...scene })) };
}

export function selectRecorderMime(isSupported) {
  return ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(type => isSupported(type)) || '';
}

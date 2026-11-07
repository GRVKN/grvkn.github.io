import {escapeHtml as esc, money} from './shared.js';

export const placementPreviews = [
  {code:'app_launch', query:'launch', title:'Beim Öffnen der App', short:'App-Start', description:'Dein Sponsorplatz erscheint zusammen mit der GRVKN-Begrüßung. Besucher können direkt zur App weitergehen.'},
  {code:'feed', query:'feed', title:'Zwischen regionalen Videos', short:'Feed', description:'Deine gekennzeichnete Werbekarte folgt auf bis zu sechs normale Beiträge. Sie ergänzt den Feed, ohne Beiträge zu ersetzen.'},
  {code:'category', query:'category', title:'Im passenden Themen-Feed', short:'Themenplatz', description:'Dein Video erscheint im Feed zum ausgewählten Thema, wenn Region und Themenfilter zur Kampagne passen.'},
  {code:'homepage', query:'homepage', title:'Auf der GRVKN-Homepage', short:'Homepage', description:'Dein Banner steht auf der Homepage außerhalb der App. Der Button führt zu deiner hinterlegten Zielseite.'},
];

export function productsForPlacement(catalog, code) {
  return (catalog?.products || []).filter(product => product.placements?.includes(code));
}

export function placementGuide() {
  return `<section class="panel placement-guide" aria-labelledby="placement-guide-title"><span class="eyebrow">Erst ansehen, dann entscheiden</span><h2 id="placement-guide-title">Wo könnte deine Werbung stehen?</h2><p>Sieh dir jeden Platz mit Beispielwerbung und den dafür verfügbaren Paketen an. Die Vorschau funktioniert auch ohne Anmeldung.</p><div class="placement-grid">${placementPreviews.map(p=>`<a class="placement-link" href="?preview=${p.query}"><span class="placement-icon" aria-hidden="true">${({app_launch:'↗',feed:'▶',category:'#',homepage:'▤'})[p.code]}</span><strong>${p.short}</strong><span>${esc(p.title)}</span><span class="placement-open">Platz & Pakete ansehen →</span></a>`).join('')}</div></section>`;
}

function creative(video = false) {
  return `<div class="sample-ad"><span class="badge">Werbung · Beispielbetrieb</span>${video?'<div class="sample-video" aria-hidden="true"><span>▶</span><small>Dein freigegebenes Video</small></div>':''}<h3>Hier könnte dein Angebot stehen.</h3><p>Zeig, was deinen Betrieb in der Region besonders macht.</p><span class="button sample-button">Deine Zielseite →</span></div>`;
}

function stage(code) {
  if (code === 'app_launch') return `<div class="placement-stage launch-stage"><p class="preview-greeting">Schön, dass du da bist.<br>Entdecke deine Region.</p><img class="preview-logo" src="/grvkn-mark.svg" alt=""><div class="preview-wordmark">GRVKN</div>${creative()}<span class="sample-next">Weiter zur App</span></div>`;
  if (code === 'homepage') return `<div class="placement-stage homepage-stage"><div class="sample-site-header">GRVKN <span>Deine Region.</span></div><h3>Entdecke, was um die Ecke steckt.</h3><div class="sample-page-block" aria-hidden="true"></div>${creative()}<p class="muted">Homepage · außerhalb der App</p></div>`;
  const category = code === 'category';
  return `<div class="placement-stage feed-stage"><div class="sample-feed-header">GRVKN <span>${category?'Thema: Gastronomie':'Für dich · deine Region'}</span></div><div class="sample-feed-context">${category?'Nach passenden Beiträgen in diesem Thema':'Nach bis zu sechs regionalen Beiträgen'}<span aria-hidden="true">↓</span></div>${creative(true)}<div class="sample-nav" aria-hidden="true">Für dich · Entdecken · Gemerkt · Profil</div></div>`;
}

export function placementPreview(catalog, query = 'launch') {
  const selected = placementPreviews.find(p=>p.query===query) || placementPreviews[0];
  const products = productsForPlacement(catalog, selected.code);
  return `<div class="intro"><span class="eyebrow">Werbeplatz-Vorschau</span><h1>Hier könnte deine Werbung stehen.</h1><p>Wähle einen Platz und sieh dir an, mit welchem Paket du dort vertreten sein kannst.</p></div><nav class="placement-tabs" aria-label="Werbeplatz auswählen">${placementPreviews.map(p=>`<a class="button ${p===selected?'':'secondary'}" href="?preview=${p.query}"${p===selected?' aria-current="page"':''}>${p.short}</a>`).join('')}</nav><section class="preview-layout" aria-labelledby="preview-title"><figure class="placement-figure">${stage(selected.code)}<figcaption>Schematische Beispielansicht · keine laufende Kampagne</figcaption></figure><div class="preview-details"><span class="eyebrow">${selected===placementPreviews[3]?'Website':'In der App'}</span><h2 id="preview-title">${esc(selected.title)}</h2><p>${esc(selected.description)}</p><h3>Mit diesen Paketen möglich</h3><div class="preview-products">${products.length?products.map(p=>`<article class="card"><h3>${esc(p.name)}</h3><p><strong>${money(p.amountMinor)} netto</strong> / ${Number(p.days)} Kalendertage</p><p class="muted">Enthalten: ${p.placements.map(code=>esc(catalog.placements?.find(x=>x.code===code)?.name||code)).join(' · ')}</p><a class="button secondary" href="?product=${encodeURIComponent(p.code)}#anfrage">Dieses Paket unverbindlich anfragen</a></article>`).join(''):'<p class="notice">Für diesen Platz ist aktuell kein Paket verfügbar.</p>'}</div><p class="muted"><small>Richtpreise aus dem aktuellen Werbekatalog. Verfügbarkeit, Umsatzsteuer und verbindliches Angebot nach Prüfung. Region, Nutzung, Laufzeit und Partnerrotation bestimmen die tatsächliche Ausspielung. Es wird keine Reichweite garantiert.</small></p><p class="notice">Du siehst Beispielwerbung. Hier wird keine Anzeige ausgespielt und keine Einblendung oder Klick für eine Kampagne gezählt.</p><a href="./">Alle Pakete und Werbeanfragen →</a></div></section>`;
}

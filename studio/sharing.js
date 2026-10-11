import { escapeHtml } from './core.js';
import { readAdReference } from './grvkn.js';
import { renderSVG } from './vendor/uqr.mjs';

export function qrSvg(link) {
  const reference = readAdReference(link);
  return renderSVG(reference.url, { ecc: 'M', border: 4, pixelSize: 12 });
}
export function sharingView({ reference = null, savedAdId = '', canSave = false } = {}) {
  const esc = escapeHtml;
  return `<div class="sharing-layout"><section class="sharing-card"><span class="pill premium">QR-CODE & BEITRAGSLINK</span><h2>Dein Video. Ein Link.<br>Überall erreichbar.</h2><p>Kopiere den Beitragslink aus GRVKN hier hinein. Dein QR-Code führt direkt zum selben Beitrag – auf Flyern, Schaufenstern oder Einladungen.</p>
    <form id="sharing-form"><label class="field"><span>GRVKN-Beitragslink oder Beitrags-ID</span><input id="grvkn-ad-reference" maxlength="1000" autocomplete="off" spellcheck="false" value="${esc(reference?.url || savedAdId)}" placeholder="https://grvkn.github.io/v/?id=…" required></label><button class="button primary" type="submit">Link & QR vorbereiten <svg class="icon"><use href="#i-arrow"/></svg></button></form>
    <div class="note"><svg class="icon"><use href="#i-info"/></svg><span>Die Beitrags-ID entsteht beim Einreichen in GRVKN. Ein Studio-Entwurf bekommt hier keine neue Beitrags-ID. Nach der Freigabe erscheint das Video unter demselben Link.</span></div>
    ${reference ? `<label class="field"><span>Dein dauerhafter Beitragslink</span><input id="grvkn-public-link" value="${esc(reference.url)}" readonly aria-label="Dauerhafter GRVKN-Beitragslink"></label><div class="sharing-actions"><button class="button primary" data-action="copy-ad-link"><svg class="icon"><use href="#i-link"/></svg>Link kopieren</button><a class="button secondary" href="${esc(reference.url)}" target="_blank" rel="noopener noreferrer">Beitrag öffnen ↗</a><button class="button secondary" data-action="share-ad-link">Link teilen</button>${canSave ? '<button class="button quiet" data-action="save-ad-reference">Mit Entwurf speichern</button>' : ''}</div><p class="field-help">Der Link ist vorbereitet. Den Veröffentlichungsstatus prüfst du in GRVKN; das Studio hat ihn noch nicht abgefragt.</p>` : ''}</section>
    <aside class="sharing-preview" aria-label="QR-Code-Vorschau">${reference ? `<div class="qr-paper"><div class="qr-image" role="img" aria-label="QR-Code zum GRVKN-Beitrag">${qrSvg(reference.url)}</div><strong>GRVKN</strong><span>DEINE REGION. DEIN VIDEO.</span></div><p>Schwarz auf Weiß mit freiem Rand, damit der Code gut lesbar bleibt.</p><div class="sharing-downloads"><button class="button primary" data-action="download-qr-png"><svg class="icon"><use href="#i-download"/></svg>PNG herunterladen</button><button class="button secondary" data-action="download-qr-svg">SVG für den Druck</button></div>` : '<div class="qr-placeholder"><svg class="icon"><use href="#i-qr"/></svg><h3>Hier erscheint dein QR-Code.</h3><p>Füge zuerst einen vorhandenen GRVKN-Beitragslink ein.</p></div>'}</aside></div>`;
}

export async function qrPng(link) {
  const svg = qrSvg(link);
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image(); image.src = svgUrl; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1184;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Dein Browser konnte den QR-Code nicht vorbereiten. Nutze den SVG-Download.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = false; context.drawImage(image, 32, 32, 960, 960);
    context.fillStyle = '#070908'; context.textAlign = 'center';
    context.font = '900 56px sans-serif'; context.fillText('GRVKN', 512, 1070);
    context.font = '22px sans-serif'; context.fillText('DEINE REGION. DEIN VIDEO.', 512, 1120);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG konnte nicht erstellt werden. Nutze den SVG-Download.');
    return blob;
  } finally { URL.revokeObjectURL(svgUrl); }
}

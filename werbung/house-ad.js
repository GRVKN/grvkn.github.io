import {escapeHtml as esc} from './shared.js';

export const DEVELOPER_STUDIO_URL = 'https://grvkn.de/#entwicklung';
const queries = {app_launch:'launch',feed:'feed',category:'category',homepage:'homepage'};

// Static GRVKN promotion: no booking, delivery receipt or campaign event.
export function houseAdMarkup({placement='homepage',preview=false}={}) {
  const booking=new URL(preview?'./#anfrage':'./?preview='+(queries[placement]||'all'),import.meta.url).href;
  const logo=new URL('../studio/assets/grvkn-mark.svg',import.meta.url).href;
  const photo=new URL('./grvkn-hero.webp',import.meta.url).href;
  const sameOrigin=globalThis.location?.origin===new URL(DEVELOPER_STUDIO_URL).origin;
  return `<div class="house-visual" aria-hidden="true"><img src="${esc(photo)}" alt="" width="1199" height="675" loading="lazy" decoding="async"></div><div class="house-copy"><span class="house-label">Werbung · GRVKN${preview?' · Vorschau':''}</span><div class="house-brand"><img src="${esc(logo)}" alt="" width="56" height="56"><div><strong>GRVKN</strong><span>Entwicklerstudio · grvkn.de</span></div></div><h3>Deine Idee. Unsere Entwicklung.</h3><p>Apps, Webanwendungen und digitale Lösungen für deinen Betrieb.</p><span class="house-services">Apps · Webanwendungen · Automatisierung</span></div><div class="house-actions"><a class="house-link" data-grvkn-house-link="developer" href="${DEVELOPER_STUDIO_URL}" target="${sameOrigin?'_self':'_blank'}" rel="noopener noreferrer">Entwicklerstudio ansehen</a><a class="house-link house-booking" data-grvkn-house-link="booking" href="${esc(booking)}">Werbeplatz buchen</a></div>`;
}

export const houseAdCss=`
.house-ad[hidden]{display:none}
.house-ad{position:relative;isolation:isolate;overflow:hidden;color:#f3f7ec;border:1px solid #a8e660!important;background:#0a1712!important;box-shadow:0 14px 40px #060e0b24;gap:24px}
.house-ad .house-visual{position:absolute;inset:0;z-index:-2;pointer-events:none;overflow:hidden}
.house-ad .house-visual img{width:100%;height:100%;border-radius:0;object-fit:cover;object-position:70% 42%;animation:grvkn-house-arrival 7s ease-out both}
.house-ad:after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(100deg,#0a1712f5 0%,#0a1712c9 40%,#0a171266 70%,#0a1712c9 100%)}
.house-copy{flex:1;min-width:0;position:relative}
.house-label{display:inline-block;color:#d9f2bd;font-size:11px;font-weight:750;letter-spacing:.08em;text-transform:uppercase;border:1px solid #a8e66066;border-radius:99px;padding:5px 9px;background:#0a171280}
.house-brand{display:flex;align-items:center;gap:12px;margin:16px 0}
.house-brand img{width:56px;height:56px;object-fit:contain;flex:none;filter:drop-shadow(0 2px 10px #0005)}
.house-brand strong{display:block;font-size:28px!important;letter-spacing:.08em;color:#c4ff64}
.house-brand span{display:block;font-size:12px;color:#e2ecda}
.house-copy h3{max-width:530px;font-size:clamp(26px,3.6vw,38px);line-height:1.1;letter-spacing:-.025em;margin:14px 0;text-wrap:balance;text-shadow:0 2px 18px #0008}
.house-copy p{max-width:490px;font-size:16px;line-height:1.5;color:#e3ebdd;margin:10px 0}
.house-services{display:block;font-size:12px;line-height:1.5;color:#d5f6ab}
.house-actions{position:relative;display:flex;flex-direction:column;align-items:stretch;gap:10px;flex:none;max-width:100%}
.house-actions a.house-link{display:flex;justify-content:center;align-items:center;min-height:46px;padding:12px 16px;border:1px solid #b7ff3c;border-radius:12px;background:#b7ff3c;color:#142008;text-decoration:none;font-size:14px;font-weight:750;line-height:1.4;white-space:normal;text-align:center;box-shadow:0 4px 18px #0002;transition:background .18s,transform .18s}
.house-actions a.house-link:hover{background:#ceff80;transform:translateY(-1px)}
.house-actions a.house-booking{background:#0a1712b3;color:#e5f6d3;border-color:#a6bf8c}
.house-actions a.house-booking:hover{background:#233d2b}
.house-actions a:focus-visible{outline:3px solid white;outline-offset:4px}
.sample-ad.house-ad{padding:22px;border-radius:18px}
.sample-ad .house-actions{margin-top:20px}
.sample-ad .house-copy h3{font-size:29px}
.sample-ad .house-brand img{width:48px;height:48px}
@keyframes grvkn-house-arrival{from{transform:scale(1.045)}to{transform:scale(1)}}
@media(max-width:700px){.house-ad{flex-wrap:wrap}.house-ad:after{background:linear-gradient(110deg,#0a1712ef,#0a1712a6 65%,#0a1712cf)}.house-ad .house-visual img{object-position:72% center}.house-actions{width:100%;flex-direction:row;flex-wrap:wrap}.house-actions a.house-link{flex:1 1 180px;margin-left:0}.house-copy p{font-size:15px}}
@media(prefers-reduced-motion:reduce){.house-ad .house-visual img{animation:none}.house-actions a.house-link{transition:none}.house-actions a.house-link:hover{transform:none}}
`;

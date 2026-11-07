import {api,safeLink,money} from './shared.js';
import {prepareGoogleSlot} from './google.js';
export function homepagePlaceholder(root,catalog={}){
 const section=document.createElement('section');section.className='sponsor example';section.setAttribute('aria-label','Werbeplatz auf der Homepage · Beispiel');
 const copy=document.createElement('div');copy.className='copy';const label=document.createElement('span');label.className='label';label.textContent='WERBEPLATZ · BEISPIEL';
 const title=document.createElement('strong');title.textContent='Hier könnte dein Unternehmen stehen.';
 const text=document.createElement('p');text.textContent='Zeig dein Angebot auf der GRVKN-Homepage. Dies ist eine Beispielansicht und keine laufende Kampagne.';
 const plans=document.createElement('p');plans.className='label';plans.textContent=(catalog.products||[]).filter(p=>p.placements.includes('homepage')).map(p=>p.name+' · '+money(p.amountMinor)+' netto / '+p.days+' Tage').join(' · ');
 copy.append(label,title,text,plans);const link=document.createElement('a');link.href=new URL('./?preview=homepage',import.meta.url).href;link.textContent='Platz & Pakete ansehen';section.append(copy,link);root.append(section);
 return section;
}
export async function installHomepageAdvertising(){
 const mount=document.querySelector('[data-grvkn-ad-slot="homepage"]');if(!mount)return;
 const root=mount.attachShadow({mode:'open'});let viewTimer,seen=false;let campaign;
 const style=document.createElement('style');style.textContent=':host{display:block}*{box-sizing:border-box}.sponsor{display:flex;align-items:center;gap:20px;padding:22px;border:1px solid #38442f;border-radius:20px;background:#101610;color:#f8faf7;font:16px system-ui;max-width:1120px;margin:24px auto}.sponsor img{width:104px;height:76px;object-fit:contain;border-radius:10px}.copy{flex:1;min-width:0}.label{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#c0cbb9}.copy strong{display:block;margin:6px 0;font-size:20px}.copy p{margin:4px 0;color:#c2ccbd}.sponsor a{padding:12px 16px;border-radius:12px;background:#b7ff3c;color:#142008;text-decoration:none;font-weight:750;white-space:nowrap}.google{max-width:1120px;margin:24px auto;min-height:100px}.grvkn-google-label{display:block;font:11px system-ui;color:#77836f}@media(max-width:600px){.sponsor{margin:16px;padding:16px;gap:12px;flex-wrap:wrap}.sponsor img{width:64px;height:60px}.copy strong{font-size:17px}.sponsor a{margin-left:auto}.copy p{font-size:14px}}';root.append(style);
 try{
  const [catalog,delivery]=await Promise.all([api('/catalog'),api('/delivery?surface=homepage&region='+encodeURIComponent(mount.dataset.grvknRegion||'grafschaft-bentheim'))]);
  campaign=delivery.campaigns?.find(c=>c.placement==='homepage');
  if(!campaign){if(catalog.google?.enabled&&catalog.google.siteOrigin===window.location.origin){const google=document.createElement('div');google.className='grvkn-google-slot';google.style.cssText='max-width:1120px;margin:24px auto;min-height:100px';google.hidden=true;mount.after(google);prepareGoogleSlot(google,catalog.google);}else homepagePlaceholder(root,catalog);return;}
  const section=document.createElement('section');section.className='sponsor';section.setAttribute('aria-label','Werbung von '+campaign.advertiser);
  const link=safeLink(campaign.targetUrl);if(!link)return;
  if(campaign.imageUrl){const img=document.createElement('img');img.src=campaign.imageUrl;img.alt='';img.loading='lazy';img.onerror=()=>img.remove();section.append(img);}
  const copy=document.createElement('div');copy.className='copy';const label=document.createElement('span');label.className='label';label.textContent='Werbung · '+campaign.advertiser;const title=document.createElement('strong');title.textContent=campaign.headline;const text=document.createElement('p');text.textContent=campaign.body;copy.append(label,title,text);section.append(copy);
  const cta=document.createElement('a');cta.href=link;cta.target='_blank';cta.rel='noopener noreferrer sponsored';cta.textContent='Mehr erfahren';cta.addEventListener('click',()=>{api('/events',{method:'POST',data:{deliveryId:campaign.deliveryId,event:'click'}}).catch(()=>{});});section.append(cta);root.append(section);
  const qualify=visible=>{clearTimeout(viewTimer);if(visible&&!document.hidden&&!seen)viewTimer=setTimeout(()=>{seen=true;api('/events',{method:'POST',data:{deliveryId:campaign.deliveryId,event:'impression',visibleMs:2000}}).catch(()=>{});},2050);};
  let inView=false;const observer=new IntersectionObserver(entries=>{inView=entries[0].intersectionRatio>=.5;qualify(inView);},{threshold:[.5]});observer.observe(section);
  document.addEventListener('visibilitychange',()=>qualify(inView));window.addEventListener('pagehide',()=>{clearTimeout(viewTimer);observer.disconnect();},{once:true});
 }catch{mount.hidden=true;}
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>installHomepageAdvertising(),{once:true});else installHomepageAdvertising();}

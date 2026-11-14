import {api,safeLink} from './shared.js';
import {prepareGoogleSlot} from './google.js';
import {houseAdMarkup,houseAdCss} from './house-ad.js';
export function homepageHouseAd(root) {
 const section=document.createElement('section');section.className='sponsor house-ad';section.setAttribute('aria-label','Werbung · GRVKN Entwicklerstudio');
 section.innerHTML=houseAdMarkup();root.append(section);return section;
}
// Retained for callers of the previous empty-slot helper.
export const homepagePlaceholder=homepageHouseAd;
export async function installHomepageAdvertising(){
 const mount=document.querySelector('[data-grvkn-ad-slot="homepage"]');if(!mount)return;
 const root=mount.attachShadow({mode:'open'});let viewTimer,seen=false;let campaign;
 const style=document.createElement('style');style.textContent=':host{display:block}*{box-sizing:border-box}.sponsor{display:flex;align-items:center;gap:20px;padding:22px;border:1px solid #38442f;border-radius:20px;background:#101610;color:#f8faf7;font:16px system-ui;max-width:1120px;margin:24px auto}.sponsor img{width:104px;height:76px;object-fit:contain;border-radius:10px}.copy{flex:1;min-width:0}.label{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#c0cbb9}.copy strong{display:block;margin:6px 0;font-size:20px}.copy p{margin:4px 0;color:#c2ccbd}.sponsor a{padding:12px 16px;border-radius:12px;background:#b7ff3c;color:#142008;text-decoration:none;font-weight:750;white-space:nowrap}.google{max-width:1120px;margin:24px auto;min-height:100px}.grvkn-google-label{display:block;font:11px system-ui;color:#77836f}@media(max-width:600px){.sponsor{margin:16px;padding:16px;gap:12px;flex-wrap:wrap}.sponsor img{width:64px;height:60px}.copy strong{font-size:17px}.sponsor a{margin-left:auto}.copy p{font-size:14px}}';style.textContent+=houseAdCss;root.append(style);
 const house=homepageHouseAd(root);
 try{
  const results=await Promise.allSettled([api('/catalog'),api('/delivery?surface=homepage&region='+encodeURIComponent(mount.dataset.grvknRegion||'grafschaft-bentheim'))]);
  const catalog=results[0].status==='fulfilled'?results[0].value:{};
  if(results[1].status!=='fulfilled')return;
  const delivery=results[1].value;
  campaign=delivery.campaigns?.find(c=>c.placement==='homepage');
  if(!campaign){if(catalog.google?.enabled&&catalog.google.siteOrigin===window.location.origin){const google=document.createElement('div');google.className='grvkn-google-slot';google.style.cssText='max-width:1120px;margin:24px auto;min-height:100px';google.hidden=true;mount.after(google);prepareGoogleSlot(google,catalog.google);const observer=new MutationObserver(()=>{house.hidden=!google.hidden;});observer.observe(google,{attributes:true,attributeFilter:['hidden']});window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});}return;}
  const section=document.createElement('section');section.className='sponsor';section.setAttribute('aria-label','Werbung von '+campaign.advertiser);
  const link=safeLink(campaign.targetUrl);if(!link)return;house.remove();
  if(campaign.imageUrl){const img=document.createElement('img');img.src=campaign.imageUrl;img.alt='';img.loading='lazy';img.onerror=()=>img.remove();section.append(img);}
  const copy=document.createElement('div');copy.className='copy';const label=document.createElement('span');label.className='label';label.textContent='Werbung · '+campaign.advertiser;const title=document.createElement('strong');title.textContent=campaign.headline;const text=document.createElement('p');text.textContent=campaign.body;copy.append(label,title,text);section.append(copy);
  const cta=document.createElement('a');cta.href=link;cta.target='_blank';cta.rel='noopener noreferrer sponsored';cta.textContent='Mehr erfahren';cta.addEventListener('click',()=>{api('/events',{method:'POST',data:{deliveryId:campaign.deliveryId,event:'click'}}).catch(()=>{});});section.append(cta);root.append(section);
  const qualify=visible=>{clearTimeout(viewTimer);if(visible&&!document.hidden&&!seen)viewTimer=setTimeout(()=>{seen=true;api('/events',{method:'POST',data:{deliveryId:campaign.deliveryId,event:'impression',visibleMs:2000}}).catch(()=>{});},2050);};
  let inView=false;const observer=new IntersectionObserver(entries=>{inView=entries[0].intersectionRatio>=.5;qualify(inView);},{threshold:[.5]});observer.observe(section);
  document.addEventListener('visibilitychange',()=>qualify(inView));window.addEventListener('pagehide',()=>{clearTimeout(viewTimer);observer.disconnect();},{once:true});
 }catch{/* The local GRVKN promotion remains available during a catalog outage. */}
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>installHomepageAdvertising(),{once:true});else installHomepageAdvertising();}


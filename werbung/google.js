import {googleConsentAllowed} from './shared.js';
export function prepareGoogleSlot(element,configuration,{scope=window,doc=document}={}){
 if(!configuration?.enabled||configuration.siteOrigin!==scope.location?.origin||!/^ca-pub-\d{16}$/.test(configuration.publisherId)||!/^\d{6,20}$/.test(configuration.homepageAdSlot)||!Number.isInteger(configuration.cmpId))return ()=>{};
 let disposed=false,loaded=false,attempts=0,timer,listenerId;
 const remove=()=>{disposed=true;clearTimeout(timer);if(listenerId&&typeof scope.__tcfapi==='function')scope.__tcfapi('removeEventListener',2,()=>{},listenerId);};
 function consent(tc,ok){
  if(disposed)return;listenerId=tc?.listenerId;
  if(!ok||!googleConsentAllowed(tc,configuration.cmpId)){
   if(loaded){remove();element.replaceChildren();scope.location.reload();}return;
  }
  if(loaded)return;loaded=true;element.hidden=false;
  const label=doc.createElement('span');label.textContent='Werbung';label.className='grvkn-google-label';
  const ins=doc.createElement('ins');ins.className='adsbygoogle';ins.style.display='block';ins.dataset.adClient=configuration.publisherId;ins.dataset.adSlot=configuration.homepageAdSlot;ins.dataset.adFormat='auto';ins.dataset.fullWidthResponsive='true';element.replaceChildren(label,ins);
  if(!doc.querySelector('script[data-grvkn-google]')){const script=doc.createElement('script');script.async=true;script.crossOrigin='anonymous';script.dataset.grvknGoogle='true';script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+configuration.publisherId;doc.head.append(script);}
  (scope.adsbygoogle=scope.adsbygoogle||[]).push({});
 }
 function connect(){if(disposed)return;if(typeof scope.__tcfapi==='function'){scope.__tcfapi('addEventListener',2,consent);return;}if(++attempts<20)timer=setTimeout(connect,500);}
 connect();return remove;
}

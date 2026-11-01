export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeLink=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
export const money=minor=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(minor)/100);
export const stateLabel=state=>({requested:'Angefragt',reserved:'48 Stunden reserviert',active:'Freigegeben',paused:'Pausiert',rejected:'Abgelehnt',canceled:'Storniert'}[state]||state);
let configuration;
export async function config(){configuration??=fetch(new URL('../studio/config.json',import.meta.url),{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Die Einrichtung konnte nicht geladen werden.');return r.json();});return configuration;}
export async function api(path,{method='GET',data,token,signal}={}){
 const c=await config();const r=await fetch(c.supabaseUrl+'/functions/v1/grvkn-advertising'+path,{method,headers:{apikey:c.supabaseAnonKey,...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),cache:'no-store',signal:signal||AbortSignal.timeout(15000)});
 let result;try{result=await r.json();}catch{throw Error('Die Werbeplatzverwaltung ist gerade nicht erreichbar.');}
 if(!r.ok)throw Error(result.message||'Die Anfrage konnte nicht verarbeitet werden.');return result;
}
export function adsTxt(publisher){return /^ca-pub-\d{16}$/.test(publisher)?'google.com, '+publisher.slice(3)+', DIRECT, f08c47fec0942fa0\n':'';}
export function googleConsentAllowed(tc,expectedCmpId){
 if(!tc||tc.cmpStatus!=='loaded'||!['tcloaded','useractioncomplete'].includes(tc.eventStatus)||tc.cmpId!==expectedCmpId||typeof tc.tcString!=='string'||tc.tcString.length<10)return false;
 // Fail closed. The publisher must supply a certified CMP; this is not a CMP.
 if(tc.vendor?.consents?.[755]!==true)return false;
 for(const purpose of[1,2,3,4,7,9,10]){
  if(tc.purpose?.consents?.[purpose]!==true)return false;
  const restriction=tc.publisher?.restrictions?.[purpose]?.[755];
  if(restriction!==undefined&&restriction!==1)return false;
 }
 return true;
}

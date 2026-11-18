import {account} from './client.js';
export async function administrationRequest(route,{method='GET',body,signal}={}) {
  const {data:{session},error}=await account.client.auth.getSession();
  if(error||!session?.access_token)throw new Error('Bitte melde dich erneut an.');
  const response=await fetch(account.client.supabaseUrl+'/functions/v1/grvkn-studio/admin/'+route,{method,cache:'no-store',headers:{apikey:account.client.supabaseKey,Authorization:'Bearer '+session.access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:signal||AbortSignal.timeout(30000)});
  const data=await response.json();
  if(!response.ok){const error=new Error(data.error||'Die Administration konnte nicht geladen werden.');error.code=data.code;error.status=response.status;throw error;}return data;
}
export async function revealAdministration(root=document){
  try{const access=await administrationRequest('access');root.querySelectorAll('[data-administration]').forEach(a=>a.hidden=access.allowed!==true);}catch{/* Studio remains usable if the separate administration is unavailable. */}
}

// Raw Storage upload retains Supabase Auth/RLS and exposes measured browser bytes.
// It never writes a publication status or uses a service-role key.
export async function uploadVideoWithProgress({client,path,blob,onProgress=()=>{},xhrFactory=()=>new XMLHttpRequest()}){
  const {data:{session},error}=await client.auth.getSession();
  if(error||!session?.access_token)throw new Error('Bitte melde dich erneut an. Deine Angaben bleiben erhalten.');
  const base=new URL(client.supabaseUrl);
  if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co'))throw new Error('Die Upload-Verbindung ist nicht eingerichtet.');
  return new Promise((resolve,reject)=>{
    const xhr=xhrFactory();xhr.open('POST',base.origin+'/storage/v1/object/ad-videos/'+path.split('/').map(encodeURIComponent).join('/'));
    xhr.timeout=900000;xhr.withCredentials=false;
    xhr.setRequestHeader('apikey',client.supabaseKey);xhr.setRequestHeader('Authorization','Bearer '+session.access_token);xhr.setRequestHeader('Content-Type',blob.type.split(';')[0]);xhr.setRequestHeader('x-upsert','false');xhr.setRequestHeader('cache-control','max-age=3600');
    xhr.upload.onprogress=e=>onProgress(e.lengthComputable&&e.total>0?Math.min(100,Math.floor(e.loaded/e.total*100)):null);
    xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve({data:{path},error:null}):reject(new Error(xhr.status===401||xhr.status===403?'Die Upload-Berechtigung fehlt oder ist abgelaufen. Prüfe deine Anmeldung.':'Der Upload konnte nicht bestätigt werden. Deine Angaben bleiben erhalten.'));
    xhr.onerror=()=>reject(new Error('Der Upload wurde durch eine Verbindungsstörung unterbrochen. Prüfe deine Verbindung und versuche es erneut.'));
    xhr.ontimeout=()=>reject(new Error('Der Upload hat zu lange gedauert. Prüfe deine Verbindung und versuche es erneut.'));
    xhr.onabort=()=>reject(new Error('Der Upload wurde abgebrochen.'));
    onProgress(0);xhr.send(blob);
  });
}

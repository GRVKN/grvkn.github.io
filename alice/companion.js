// Existing portraits only. The state controller does not claim facial animation
// or lip sync. Device speech has no GRVKN audio API charge and uploads no raw
// audio to GRVKN; the OS/browser recognizer may use its own online service.
export const ALICE_POSES={idle:'seated',listening:'invite',thinking:'hair',speaking:'invite',happy:'welcome',surprised:'invite',playful:'hair',serious:'seated',goodbye:'farewell',paused:'seated'};
export function createCompanion({request,getStatus,onRefresh,onChange,onWords,getText,onError}={}){
 let root,expanded=true,enabled=false,state='idle',session=null,timer,recognition,utterance,lastText='',remaining='',prefix='',generation=0,accountEpoch=0,starting=false,playfulAt=0,turn=0,destroyed=false,mood='idle';
 const status=()=>getStatus()||{},prefs=()=>status().preferences||{};
 const supported=()=>typeof window.SpeechRecognition==='function'||typeof window.webkitSpeechRecognition==='function';
 function visual(){return state==='speaking'&&mood==='serious'?'serious':state==='idle'?mood:state;}
 function set(next){if(!ALICE_POSES[next])next='idle';state=next;const stage=root?.querySelector('.alice-stage');if(!stage)return;
  stage.dataset.state=state;const old=stage.querySelector('img:last-of-type'),src='/alice/assets/alice-'+ALICE_POSES[visual()]+'.webp';
  if(old?.getAttribute('src')===src)return;const img=document.createElement('img');img.src=src;img.alt='Alice · KI-generierte GRVKN-Assistentin';img.className='pose entering';stage.append(img);
  requestAnimationFrame(()=>{img.classList.remove('entering');old?.classList.add('leaving');});setTimeout(()=>old?.remove(),650);
 }
 function emotion(value){turn++;if(value==='playful'){if(turn-playfulAt<12){mood='idle';return set('idle');}playfulAt=turn;}mood=['happy','serious','playful','surprised'].includes(value)?value:'idle';set('idle');}
 async function finish(){const previous=session;session=null;clearTimeout(timer);if(!previous)return;try{await request('voice/'+previous+'/finish',{method:'POST',body:{}});await onRefresh();}catch{} }
 async function stop({discard=false}={}){const own=++generation;const wasListening=state==='listening';recognition?.abort();recognition=null;window.speechSynthesis?.cancel();utterance=null;await finish();if(own!==generation)return;if(discard&&wasListening)onWords(prefix);set('idle');if(!destroyed)onChange();}
 async function consent(){if(prefs().voiceConsent)return true;
  if(!window.confirm('Sprache verwendet den Dienst deines Browsers oder Betriebssystems. Die Erkennung kann Audio an dessen Anbieter übertragen, zum Beispiel Google bei Chrome. GRVKN speichert keine Rohaufnahme. Möchtest du die Geräte-Sprachfunktion verwenden?'))return false;
  await request('preferences',{method:'POST',body:{voiceConsent:true}});await onRefresh();return true;
 }
 async function begin(kind){const value=await request('voice',{method:'POST',body:{kind}});session=value.id;timer=setTimeout(()=>{void stop();},value.maxSeconds*1000);return value;}
 async function speak(text,{resume=false}={}){if(starting)return;starting=true;
  const account=accountEpoch;
  try{await stop();const command=generation;if(!enabled||document.hidden||account!==accountEpoch||!await consent()||account!==accountEpoch||command!==generation)return;if(!window.speechSynthesis||typeof SpeechSynthesisUtterance!=='function')throw Error('Auf diesem Gerät ist keine Sprachausgabe verfügbar.');
   await begin('output');if(!enabled||command!==generation||account!==accountEpoch||document.hidden){await finish();return;}lastText=text;remaining=resume&&remaining?remaining:text;const own=++generation,u=new SpeechSynthesisUtterance(remaining);utterance=u;u.lang=prefs().language||'de-DE';u.rate=.96;
   const voices=window.speechSynthesis.getVoices().filter(v=>v.lang.startsWith(u.lang.slice(0,2))).sort((a,b)=>Number(/katja|anna|hedda|petra|female|sara|aria|jenny/i.test(b.name))-Number(/katja|anna|hedda|petra|female|sara|aria|jenny/i.test(a.name)));
   if(voices[0])u.voice=voices[0];let offset=0;u.onboundary=e=>{offset=e.charIndex;};u.onstart=()=>{if(own===generation)set('speaking');};
   u.onend=()=>{if(own!==generation)return;void finish().then(()=>{if(own!==generation||destroyed)return;set('idle');onChange();});};
   u.onerror=()=>{if(own!==generation)return;void finish();set('idle');onError('Die Gerätestimme ist gerade nicht verfügbar. Du kannst den Text weiterhin lesen.');};
   u.pauseAt=()=>{remaining=remaining.slice(offset);};set('speaking');window.speechSynthesis.speak(u);onChange();
  }catch(error){await finish();set('idle');onError(error.message);}finally{starting=false;}
 }
 async function pause(){if(state!=='speaking')return;utterance?.pauseAt?.();const own=++generation;window.speechSynthesis.cancel();await finish();if(own!==generation)return;set('paused');onChange();}
 async function listen(){if(starting)return;starting=true;
  const account=accountEpoch;
  try{await stop();const command=generation;if(!enabled||document.hidden||account!==accountEpoch||!await consent()||account!==accountEpoch||command!==generation)return;if(!supported())throw Error('Dein Browser bietet keine Spracherkennung an. Du kannst den Text weiter eintippen.');
   const lease=await begin('input');if(!enabled||command!==generation||account!==accountEpoch||document.hidden){await finish();return;}const own=++generation,Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;r();
   function r(){recognition=new Recognition();recognition.lang=prefs().language||'de-DE';recognition.interimResults=true;recognition.continuous=false;prefix=getText();
    recognition.onresult=event=>{if(own!==generation)return;const words=Array.from(event.results).map(result=>result[0].transcript).join(' ');onWords((prefix+' '+words).trim());};
    recognition.onend=()=>{if(own!==generation)return;recognition=null;void finish().then(()=>{if(own!==generation||destroyed)return;set('idle');onChange();});};
    recognition.onerror=()=>{if(own!==generation)return;void stop();onError('Spracherkennung nicht freigegeben oder gerade nicht erreichbar. Der Textchat bleibt verfügbar.');};
    set('listening');recognition.start();onChange();
   }void lease;
  }catch(error){await finish();set('idle');onError(error.message);}finally{starting=false;}
 }
 function avatarMarkup(){return `<figure class="alice-stage" data-state="${state}"><img class="pose" src="/alice/assets/alice-${ALICE_POSES[visual()]||'seated'}.webp" alt="Alice · KI-generierte GRVKN-Assistentin"><figcaption>${state==='listening'?'🎙 Alice hört zu …':state==='thinking'?'Alice denkt nach …':'Deine KI-Assistentin'}</figcaption></figure>`;}
 function controlsMarkup(){return `<div class="voice-controls">${state==='listening'?'<button type="button" id="voice-stop">Aufnahme beenden</button><button type="button" id="voice-cancel" class="quiet">Abbrechen</button>':`<button type="button" id="voice-mic" class="quiet" ${starting||!status().allowed?'disabled':''}>🎙 Diktieren</button>`}${state==='speaking'?'<button type="button" id="voice-pause" class="quiet">Pause</button><button type="button" id="voice-stop" class="quiet">Stopp</button>':''}${state==='paused'?'<button type="button" id="voice-resume" class="quiet">Weiter vorlesen</button><button type="button" id="voice-stop" class="quiet">Stopp</button>':''}</div>`;}
 function keyboard(){const panel=root?.querySelector('.panel'),viewport=window.visualViewport;if(!panel||!viewport)return;const active=viewport.height<window.innerHeight*.76;panel.classList.toggle('keyboard-open',active);panel.style.maxHeight=active?Math.max(200,viewport.height-85)+'px':'';}
 window.visualViewport?.addEventListener('resize',keyboard);
 function visibility(){if(document.hidden)void stop();}document.addEventListener('visibilitychange',visibility);
 function bind(nextRoot){root=nextRoot;keyboard();root.querySelector('#avatar-toggle')?.addEventListener('click',()=>{expanded=!expanded;onChange();});
  root.querySelector('#voice-mic')?.addEventListener('click',()=>void listen());root.querySelector('#voice-stop')?.addEventListener('click',()=>void stop());root.querySelector('#voice-cancel')?.addEventListener('click',()=>void stop({discard:true}));
  root.querySelector('#voice-pause')?.addEventListener('click',()=>void pause());root.querySelector('#voice-resume')?.addEventListener('click',()=>void speak(lastText,{resume:true}));
 }
 return {get expanded(){return expanded;},get state(){return state;},set,emotion,avatarMarkup,controlsMarkup,bind,speak,stop,activate(value){enabled=value;if(!value)void stop();},reset(){accountEpoch++;lastText=remaining=prefix='';mood='idle';playfulAt=turn=0;void stop();},
  async maybeSpeak(reply){emotion(reply?.emotion);if(prefs().voiceOutput&&reply?.message)await speak(reply.message);},destroy(){destroyed=true;accountEpoch++;lastText=remaining=prefix='';document.removeEventListener('visibilitychange',visibility);window.visualViewport?.removeEventListener('resize',keyboard);void stop();root=null;}};
}

import {expressionMarkup} from './expressions.js';
export const ALICE_POSES={idle:'seated',listening:'invite',thinking:'hair',speaking:'invite',happy:'welcome',surprised:'invite',playful:'hair',serious:'seated',goodbye:'farewell',paused:'seated'};
export function speechChunks(value){let rest=String(value);const result=[];while(rest.length){let end=Math.min(220,rest.length);if(end<rest.length){const cuts=[...rest.slice(0,end).matchAll(/[.!?]\s+|\s+/g)];const cut=cuts.at(-1);if(cut&&cut.index>60)end=cut.index+cut[0].length;}result.push(rest.slice(0,end));rest=rest.slice(end);}return result;}
export async function deviceVoices(synthesis){
 if(synthesis.getVoices().length)return synthesis.getVoices();
 return new Promise(resolve=>{let timer;const finish=()=>{clearTimeout(timer);synthesis.removeEventListener?.('voiceschanged',finish);resolve(synthesis.getVoices());};synthesis.addEventListener?.('voiceschanged',finish,{once:true});timer=setTimeout(finish,1200);});
}
export function createCompanion({request,getStatus,onRefresh,onChange,onWords,getText,onSubmit,onError}={}){
 let root,expanded=true,enabled=false,state='idle',session=null,timer,recognition,utterance,audio,audioUrl,lastText='',lastTurn='',remaining='',prefix='',generation=0,accountEpoch=0,starting=false,playfulAt=0,turn=0,destroyed=false,mood='idle',dialogue=false,listenTimer;
 const cache=new Map(),keys=new Map(),status=()=>getStatus()||{},prefs=()=>status().preferences||{},cloud=()=>prefs().voiceEngine==='cloud';
 const supported=()=>typeof window.SpeechRecognition==='function'||typeof window.webkitSpeechRecognition==='function';
 function visual(){return state==='speaking'&&mood==='serious'?'serious':state==='idle'?mood:state;}
 function set(next){if(!ALICE_POSES[next])next='idle';state=next;const stage=root?.querySelector('.alice-stage');if(!stage)return;
  stage.dataset.state=state;const expression=stage.querySelector('.alice-expression');if(expression)expression.outerHTML=expressionMarkup(visual());const old=stage.querySelector('img:last-of-type'),src='/alice/assets/alice-'+ALICE_POSES[visual()]+'.webp';
  if(old?.getAttribute('src')===src)return;const img=document.createElement('img');img.src=src;img.alt='Alice · KI-generierte GRVKN-Assistentin';img.className='pose entering';stage.append(img);
  requestAnimationFrame(()=>{img.classList.remove('entering');old?.classList.add('leaving');});setTimeout(()=>old?.remove(),650);
 }
 function emotion(value){turn++;if(value==='playful'){if(turn-playfulAt<12){mood='idle';return set('idle');}playfulAt=turn;}mood=['happy','serious','playful','surprised'].includes(value)?value:'idle';if(!['speaking','listening','paused'].includes(state))set('idle');}
 async function finish(){const previous=session;session=null;clearTimeout(timer);if(!previous)return;try{await request('voice/'+previous+'/finish',{method:'POST',body:{}});await onRefresh();}catch{} }
 function releaseAudio(){if(audio){audio.onended=audio.onplaying=audio.onerror=null;audio.pause();audio.removeAttribute('src');audio.load?.();audio=null;}if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=null;}
 async function stop({discard=false,keepDialogue=false,keepPosition=false}={}){const own=++generation,wasListening=state==='listening';clearTimeout(listenTimer);if(!keepDialogue)dialogue=false;
  if(recognition){recognition.onend=recognition.onresult=recognition.onerror=null;recognition.abort();recognition=null;}
  window.speechSynthesis?.cancel();utterance=null;if(!keepPosition){remaining='';releaseAudio();}else audio?.pause();
  await finish();if(own!==generation)return;if(discard&&wasListening)onWords(prefix);set('idle');if(!destroyed)onChange();
 }
 async function consent(kind){if(kind==='output'&&cloud()){
   if(!status().cloudVoiceEnabled)throw Error('Die KI-Stimme ist derzeit nicht eingerichtet. Wähle die kostenlose Gerätestimme.');
   if(prefs().cloudVoiceConsent)return true;
   if(!window.confirm('Alices KI-Stimme wird von OpenAI erzeugt. Dafür wird der Antworttext an OpenAI übertragen und innerhalb des vorhandenen KI-Kontingents berechnet. GRVKN speichert keine Audiodatei. KI-Stimme aktivieren?'))return false;
   await request('preferences',{method:'POST',body:{cloudVoiceConsent:true}});await onRefresh();return true;
  }
  if(prefs().voiceConsent)return true;
  if(!window.confirm('Sprache nutzt deinen Browser oder dein Betriebssystem. Zur Erkennung kann Audio etwa an Google oder Microsoft übertragen werden. GRVKN speichert keine Rohaufnahme. Geräte-Sprachfunktion verwenden?'))return false;
  await request('preferences',{method:'POST',body:{voiceConsent:true}});await onRefresh();return true;
 }
 const valid=(command,account)=>enabled&&!destroyed&&!document.hidden&&command===generation&&account===accountEpoch;
 async function begin(kind,command,account){const value=await request('voice',{method:'POST',body:{kind}});session=value.id;if(!valid(command,account)){await finish();return false;}
  timer=setTimeout(()=>{if(kind==='output')void pause();else void stop();},value.maxSeconds*1000);return true;
 }
 function nextListen(){if(!dialogue||!enabled||document.hidden)return;clearTimeout(listenTimer);listenTimer=setTimeout(()=>{if(dialogue)void listen({conversation:true});},450);}
 async function ended(command){if(command!==generation)return;await finish();if(command!==generation||destroyed)return;remaining='';set('idle');onChange();nextListen();}
 async function playCloud(command,account,{resume=false}={}){
  if(!resume||!audio){
   const key=lastTurn+':'+(prefs().language||'de-DE');let clip=cache.get(key);
   if(!clip){if(!lastTurn)throw Error('Speichere diese Antwort zuerst im Chat.');set('thinking');onChange();
    if(!keys.has(key))keys.set(key,crypto.randomUUID());clip=await request('speech',{method:'POST',body:{turn:lastTurn,requestKey:keys.get(key)}});
    if(!valid(command,account))return;cache.set(key,clip);while(cache.size>3)cache.delete(cache.keys().next().value);
   }
   releaseAudio();const bytes=Uint8Array.from(atob(clip.audio),c=>c.charCodeAt(0));audioUrl=URL.createObjectURL(new Blob([bytes],{type:clip.mime}));audio=new Audio(audioUrl);audio.preload='auto';
  }
  if(!valid(command,account)||!await begin('output',command,account))return;
  audio.onplaying=()=>{if(valid(command,account)){set('speaking');onChange();}};
  audio.onended=()=>void ended(command);audio.onerror=()=>{if(command!==generation)return;dialogue=false;void stop();onError('Die KI-Stimme konnte nicht abgespielt werden. Der Text bleibt verfügbar.');};
  try{await audio.play();}catch{audio.pause();await finish();if(command!==generation)return;dialogue=false;set('paused');onChange();onError('Dein Browser benötigt einen Klick: Mit „Weiter vorlesen“ startest du die bereits erzeugte Stimme.');}
 }
 async function playDevice(command,account){
  if(!window.speechSynthesis||typeof SpeechSynthesisUtterance!=='function')throw Error('Auf diesem Gerät ist keine Sprachausgabe verfügbar. Wähle die KI-Stimme.');
  const voices=await deviceVoices(window.speechSynthesis);if(!valid(command,account))return;
  const lang=prefs().language||'de-DE',voice=voices.filter(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2))).sort((a,b)=>Number(/katja|anna|hedda|petra|female|sara|aria|jenny|colette/i.test(b.name))-Number(/katja|anna|hedda|petra|female|sara|aria|jenny|colette/i.test(a.name)))[0];
  if(!voice)throw Error('Dein Browser stellt keine passende Gerätestimme bereit. Wähle die KI-Stimme.');
  if(!await begin('output',command,account))return;
  function chunk(){if(!valid(command,account))return;const part=speechChunks(remaining)[0];if(!part){void ended(command);return;}
   const u=new SpeechSynthesisUtterance(part);utterance=u;u.lang=lang;u.voice=voice;u.rate=1;let offset=0;
   u.onboundary=e=>{if(Number.isInteger(e.charIndex))offset=e.charIndex;};u.pauseAt=()=>{remaining=remaining.slice(offset);};
   u.onstart=()=>{if(valid(command,account)){set('speaking');onChange();}};
   u.onend=()=>{if(!valid(command,account))return;remaining=remaining.slice(part.length);chunk();};
   u.onerror=()=>{if(command!==generation)return;dialogue=false;void stop();onError('Die Gerätestimme ist gerade nicht verfügbar. Wähle die KI-Stimme oder lies im Textchat weiter.');};window.speechSynthesis.speak(u);
  }chunk();
 }
 async function speak(text,{resume=false,turnId=''}={}){if(starting)return;starting=true;const account=accountEpoch;
  try{await stop({keepDialogue:true,keepPosition:resume});const command=generation;if(!valid(command,account)||!await consent('output')||!valid(command,account))return;
   lastText=text;lastTurn=turnId||lastTurn;remaining=resume&&remaining?remaining:text;
   if(cloud())await playCloud(command,account,{resume});else await playDevice(command,account);
  }catch(error){await finish();dialogue=false;set('idle');onError(error.message);}finally{starting=false;if(!destroyed)onChange();}
 }
 async function pause(){if(!['speaking','thinking'].includes(state))return;dialogue=false;clearTimeout(listenTimer);utterance?.pauseAt?.();const own=++generation;window.speechSynthesis?.cancel();audio?.pause();await finish();if(own!==generation)return;set('paused');onChange();}
 async function listen({conversation=false}={}){if(starting)return;starting=true;const account=accountEpoch;
  try{await stop({keepDialogue:conversation});const command=generation;if(!valid(command,account)||!await consent('input')||!valid(command,account))return;
   if(!supported())throw Error('Dein Browser bietet keine Spracherkennung an. Tippe deine Nachricht; Alice kann sie weiterhin mit Stimme beantworten.');
   if(!await begin('input',command,account))return;
   const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition,r=new Recognition();recognition=r;r.lang=prefs().language||'de-DE';r.interimResults=true;r.continuous=false;prefix=getText();let finalWords='';
   r.onresult=event=>{if(!valid(command,account))return;let words='';finalWords='';for(const result of Array.from(event.results)){words+=result[0].transcript+' ';if(result.isFinal)finalWords+=result[0].transcript+' ';}onWords((prefix+' '+words).trim());};
   r.onend=()=>{if(command!==generation)return;recognition=null;void finish().then(()=>{if(!valid(command,account))return;set('idle');onChange();if(dialogue&&finalWords.trim()){onWords((prefix+' '+finalWords).trim());onSubmit?.();}else if(dialogue){dialogue=false;onChange();}});};
   r.onerror=event=>{if(command!==generation)return;dialogue=false;void stop();onError(event.error==='no-speech'?'Ich habe nichts verstanden. Starte das Mikrofon noch einmal.':'Die Spracherkennung ist nicht freigegeben oder gerade nicht erreichbar. Der Textchat bleibt verfügbar.');};
   r.onstart=()=>{if(valid(command,account)){set('listening');onChange();}};r.start();
  }catch(error){await finish();dialogue=false;set('idle');onError(error.message);}finally{starting=false;if(!destroyed)onChange();}
 }
 async function startDialogue(){if(dialogue)return void stop();if(getText().trim()){onError('Sende oder leere zuerst deinen Text, bevor du das Sprachgespräch startest.');return;}
  if(!window.confirm('Im Sprachgespräch wird dein fertig erkannter Satz automatisch als Chatnachricht gesendet. Danach spricht Alice und das Mikrofon hört wieder zu. Du kannst jederzeit beenden. Produktionen und Freigaben bestätigst du weiter separat. Starten?'))return;
  try{if(!await consent('output'))return;dialogue=true;await listen({conversation:true});}catch(error){dialogue=false;onError(error.message);}
 }
 function avatarMarkup(){return '<figure class="alice-stage" data-state="'+state+'"><img class="pose" src="/alice/assets/alice-'+(ALICE_POSES[visual()]||'seated')+'.webp" alt="Alice · KI-generierte GRVKN-Assistentin">'+expressionMarkup(visual())+'<figcaption>'+(state==='listening'?'🎙 Alice hört zu …':state==='thinking'?'Alice bereitet die Antwort vor …':state==='speaking'?'Alice spricht · KI-Stimme':state==='paused'?'Vorlesen pausiert':'Deine KI-Assistentin')+'</figcaption></figure>';}
 function controlsMarkup(){return '<div class="voice-controls">'+(state==='listening'?'<button type="button" id="voice-finish">Satz beenden</button><button type="button" id="voice-cancel" class="quiet">Abbrechen</button>':'<button type="button" id="voice-mic" class="quiet" '+(starting||!status().allowed?'disabled':'')+'>🎙 Diktieren</button>')+'<button type="button" id="voice-dialogue" class="quiet" aria-pressed="'+dialogue+'" '+(starting||!status().allowed?'disabled':'')+'>'+(dialogue?'Sprachgespräch beenden':'Sprachgespräch starten')+'</button>'+(state==='speaking'?'<button type="button" id="voice-pause" class="quiet">Pause</button>':'')+(state==='paused'?'<button type="button" id="voice-resume" class="quiet">Weiter vorlesen</button>':'')+(['speaking','thinking','paused'].includes(state)?'<button type="button" id="voice-stop" class="quiet">Stopp</button>':'')+'</div>'+(dialogue?'<p class="muted" role="status">Sprachgespräch aktiv · fertige Sätze werden gesendet. Beim Schließen oder App-Wechsel endet es.</p>':'');}
 function keyboard(){const panel=root?.querySelector('.panel'),viewport=window.visualViewport;if(!panel||!viewport)return;const active=viewport.height<window.innerHeight*.76;panel.classList.toggle('keyboard-open',active);panel.style.maxHeight=active?Math.max(200,viewport.height-85)+'px':'';}
 window.visualViewport?.addEventListener('resize',keyboard);
 function visibility(){if(document.hidden)void stop();}document.addEventListener('visibilitychange',visibility);
 function bind(nextRoot){root=nextRoot;keyboard();root.querySelector('#avatar-toggle')?.addEventListener('click',()=>{expanded=!expanded;onChange();});
  root.querySelector('#voice-mic')?.addEventListener('click',()=>void listen());root.querySelector('#voice-dialogue')?.addEventListener('click',()=>void startDialogue());root.querySelector('#voice-finish')?.addEventListener('click',()=>recognition?.stop());root.querySelector('#voice-stop')?.addEventListener('click',()=>void stop());root.querySelector('#voice-cancel')?.addEventListener('click',()=>void stop({discard:true}));root.querySelector('#voice-pause')?.addEventListener('click',()=>void pause());root.querySelector('#voice-resume')?.addEventListener('click',()=>void speak(lastText,{resume:true,turnId:lastTurn}));
 }
 return {get expanded(){return expanded;},get state(){return state;},get dialogue(){return dialogue;},set,emotion,avatarMarkup,controlsMarkup,bind,speak,stop,activate(value){enabled=value;if(!value)void stop();},reset(){accountEpoch++;lastText=lastTurn=remaining=prefix='';cache.clear();keys.clear();mood='idle';playfulAt=turn=0;void stop();},
  async maybeSpeak(reply,turnId){emotion(reply?.emotion);if((prefs().voiceOutput||dialogue)&&reply?.message)await speak(reply.message,{turnId});else nextListen();},destroy(){destroyed=true;accountEpoch++;cache.clear();keys.clear();lastText=lastTurn=remaining=prefix='';document.removeEventListener('visibilitychange',visibility);window.visualViewport?.removeEventListener('resize',keyboard);void stop();root=null;}};
}



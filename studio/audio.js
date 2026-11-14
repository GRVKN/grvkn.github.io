// Shared editor/renderer settings. Only the server calls the speech provider.
export const VIDEO_VOICES = [
 {id:'marin',name:'Marin',character:'hell, warm und natürlich',group:'weiblich klingend'},
 {id:'coral',name:'Coral',character:'freundlich und lebendig',group:'weiblich klingend'},
 {id:'nova',name:'Nova',character:'klar und dynamisch',group:'weiblich klingend'},
 {id:'cedar',name:'Cedar',character:'warm und gelassen',group:'männlich klingend'},
 {id:'onyx',name:'Onyx',character:'tief und ruhig',group:'männlich klingend'},
 {id:'alloy',name:'Alloy',character:'ausgewogen und sachlich',group:'neutral klingend'},
];
export const VIDEO_LANGUAGES=[{id:'de',name:'Deutsch'},{id:'nl',name:'Nederlands'},{id:'en',name:'English'}];
export const VIDEO_VOICE_STYLES=[
 {id:'friendly',name:'Freundlich',instruction:'Warm, friendly and conversational; natural rather than theatrical.'},
 {id:'calm',name:'Ruhig',instruction:'Calm, relaxed and reassuring, with clear articulation.'},
 {id:'dynamic',name:'Dynamisch',instruction:'Energetic, confident and lively, without shouting.'},
 {id:'rock',name:'Rock / Power',instruction:'Confident rock-frontwoman delivery: energetic, punchy and rhythmically driven, with a slightly smoky, gritty vocal color and clear articulation. Speak the script; do not sing, scream or imitate any performer.'},
 {id:'serious',name:'Seriös',instruction:'Measured, professional and factual, with restrained emphasis.'},
 {id:'advertising',name:'Werblich',instruction:'Inviting and engaging, with a warm advertising cadence and no exaggerated emphasis.'},
];
export const VIDEO_MUSIC=[
 {id:'pop',name:'Modern / Pop',bpm:112,chords:[[48,52,55],[45,48,52],[41,45,48],[43,47,50]],pattern:[0,1,2,1,0,2,1,2],drums:.13,pluck:.21,pad:.06,bass:.12},
 {id:'lounge',name:'Entspannt / Lounge',bpm:88,chords:[[48,52,55,59],[45,48,52,55],[41,45,48,52],[43,47,50,53]],pattern:[0,2,1,3,2,1,3,2],drums:.055,pluck:.16,pad:.10,bass:.10},
 {id:'sport',name:'Dynamisch / Sportlich',bpm:128,chords:[[45,48,52],[41,45,48],[48,52,55],[43,47,50]],pattern:[0,0,2,1,0,2,2,1],drums:.21,pluck:.14,pad:.035,bass:.17},
 {id:'rock',name:'Rock / Power',bpm:132,chords:[[40,47,52],[43,50,55],[38,45,50],[45,52,57]],pattern:[0,0,1,0,2,1,0,1],drums:.22,pluck:0,pad:0,bass:.15},
 {id:'cinematic',name:'Emotional / Cinematic',bpm:70,chords:[[45,48,52,59],[41,45,48,55],[48,52,55,62],[43,47,50,57]],pattern:[0,1,2,3,2,1,0,2],drums:0,pluck:.10,pad:.19,bass:.09},
 {id:'corporate',name:'Seriös / Corporate',bpm:102,chords:[[48,52,55],[43,47,50],[45,48,52],[41,45,48]],pattern:[0,2,1,2,0,1,2,1],drums:.08,pluck:.19,pad:.07,bass:.10},
 {id:'family',name:'Fröhlich / Familie',bpm:116,chords:[[60,64,67],[65,69,72],[62,65,69],[67,71,74]],pattern:[0,2,1,0,2,1,2,0],drums:.075,pluck:.20,pad:.035,bass:.07},
 {id:'acoustic',name:'Ruhig / Akustisch',bpm:78,chords:[[48,52,55],[43,47,50],[45,48,52],[41,45,48]],pattern:[0,1,2,1,0,2,1,0],drums:0,pluck:.24,pad:.035,bass:.09},
 {id:'christmas',name:'Festlich / Weihnachten',bpm:96,chords:[[60,64,67],[57,60,64],[53,57,60],[55,59,62]],pattern:[2,0,1,2,1,0,2,1],drums:.045,pluck:.16,pad:.085,bass:.08},
];
const pick=(list,value,fallback)=>list.some(v=>v.id===value)?value:fallback;
const volume=value=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1.5,value)):1;
export function audioSettings(input={}) {
 return {voiceId:pick(VIDEO_VOICES,input.voiceId,'marin'),voiceLanguage:pick(VIDEO_LANGUAGES,input.voiceLanguage,'de'),
  voiceStyle:pick(VIDEO_VOICE_STYLES,input.voiceStyle,'friendly'),voiceVolume:volume(input.voiceVolume),musicVolume:volume(input.musicVolume),
  musicGenre:pick(VIDEO_MUSIC,input.musicGenre,input.style==='Dynamisch & direkt'?'sport':input.style==='Klar & modern'?'corporate':'lounge')};
}
export const sameSpeech=(a,b)=>['voiceId','voiceLanguage','voiceStyle'].every(key=>audioSettings(a)[key]===audioSettings(b)[key]);
export function speechInstructions(input={}) {
 const a=audioSettings(input),language={de:'German',nl:'Dutch',en:'English'}[a.voiceLanguage];
 return `Speak natural ${language}. ${VIDEO_VOICE_STYLES.find(v=>v.id===a.voiceStyle).instruction} Read only the supplied script, with no additions. Clear, fairly brisk pacing for a short regional video. Do not imitate any named real person.`;
}
export const VOICE_SAMPLE_TEXT={de:'Hallo, schön, dass du da bist. Entdecke Menschen, Ideen und Angebote aus deiner Region.',nl:'Hallo, fijn dat je er bent. Ontdek mensen, ideeën en aanbiedingen uit jouw regio.',en:'Hello, it is great to see you. Discover people, ideas and offers from your region.'};

// Original deterministic oscillator score, without recordings, samples or existing songs.
// Its generated recordings may be used and redistributed commercially in GRVKN exports.
export function createMusicWav(seconds,genre='lounge') {
 if(!Number.isFinite(seconds)||seconds<=0||seconds>60)throw Error('Die Musiklänge muss zwischen 0 und 60 Sekunden liegen.');
 const p=VIDEO_MUSIC.find(p=>p.id===genre)||VIDEO_MUSIC[1],rate=22050,count=Math.ceil(seconds*rate);
 const bytes=new Uint8Array(44+count*2),v=new DataView(bytes.buffer),ascii=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
 ascii(0,'RIFF');v.setUint32(4,36+count*2,true);ascii(8,'WAVE');ascii(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
 v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);ascii(36,'data');v.setUint32(40,count*2,true);
 const beat=60/p.bpm,hz=m=>440*2**((m-69)/12);
 let previousGuitar=0,guitarHighpass=0;
 for(let i=0;i<count;i++) {
  const t=i/rate,b=t/beat,chord=p.chords[Math.floor(b/4)%4],bt=t%beat,part=t%(beat/2),step=Math.floor(b*2),f=hz(chord[p.pattern[step%8]%chord.length]+12);
  const fade=Math.max(0,Math.min(1,t/.6,(seconds-t)/1.2)),decay=genre==='acoustic'?7:genre==='christmas'?4:6;
  const pluck=(Math.sin(2*Math.PI*f*t)+.25*Math.sin(2*Math.PI*f*2*t)+.08*Math.sin(2*Math.PI*f*3*t))*(1-Math.exp(-part*180))*Math.exp(-part*decay);
  const pad=chord.reduce((sum,n)=>sum+Math.sin(2*Math.PI*hz(n)*t),0)/chord.length,bass=Math.sin(2*Math.PI*hz(chord[0]-12)*t)*(.65+.35*Math.exp(-bt*8));
  const kick=Math.sin(2*Math.PI*(45*bt+20*(1-Math.exp(-bt*30))/30))*Math.exp(-bt*20),noise=(Math.sin(i*12.9898)*43758.5453)%1;
  const drums=kick+.15*noise*Math.exp(-part*110)+.20*noise*Math.exp(-bt*30)*(Math.floor(b)%2),bell=genre==='christmas'?Math.sin(2*Math.PI*f*4*t)*Math.exp(-part*12)*.075:0;
  let mix=p.pluck*pluck+p.pad*pad+p.bass*bass+p.drums*drums+bell;
  if(genre==='rock') {
   // Original power chords and palm-muted eighth-note riff; no external recordings.
   const strum=chord.reduce((sum,n,j)=>{const phase=2*Math.PI*hz(n)*(t-j*.0008);return sum+Math.sin(phase)+.30*Math.sin(phase*3)+.12*Math.sin(phase*5);},0)/chord.length;
   const driven=Math.tanh(strum*4.5);guitarHighpass=driven-previousGuitar+.96*guitarHighpass;previousGuitar=driven;
   const riff=guitarHighpass*(1-Math.exp(-part*800))*Math.exp(-part*8)*(step%8===3||step%8===6?1:.76);
   const barBeat=Math.floor(b)%4,rockKick=(barBeat===0||barBeat===2?kick:0),snare=barBeat%2?noise*Math.exp(-bt*22)+.22*Math.sin(2*Math.PI*180*bt)*Math.exp(-bt*30):0;
   const hats=noise*Math.exp(-part*100),crash=noise*Math.exp(-(t%(beat*8))*5);
   const lead=t>seconds*.7?Math.sin(2*Math.PI*hz(chord[p.pattern[step%8]%chord.length]+24)*t)*Math.exp(-part*9)*.035:0;
   mix=.25*riff+.15*bass+.24*rockKick+.13*snare+.04*hats+.025*crash+lead;
  }
  v.setInt16(44+i*2,Math.round(Math.max(-.95,Math.min(.95,mix*fade))*32767),true);
 }
 return bytes;
}


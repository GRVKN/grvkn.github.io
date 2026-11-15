// Only the Studio launcher moves. Its chat stays inside the visible viewport.
export function createLauncherPosition({host,root,enabled}){
 if(!enabled)return {bind(){},destroy(){}};
 const key='grvkn.alice.launcher.studio.v1';
 let position=null,drag=null,suppressClick=false,clickTimer,observedLauncher;
 const observer=window.ResizeObserver?new ResizeObserver(bind):null;
 try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&[saved.x,saved.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1))position=saved;}catch{}
 const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
 function viewport(){const v=window.visualViewport;return {x:v?.offsetLeft||0,y:v?.offsetTop||0,width:v?.width||window.innerWidth,height:v?.height||window.innerHeight};}
 function bounds(){
  const v=viewport(),size=root.querySelector('.launcher').getBoundingClientRect();
  return {left:v.x+12,top:v.y+20,right:Math.max(v.x+12,v.x+v.width-size.width-12),bottom:Math.max(v.y+20,v.y+v.height-size.height-12)};
 }
 function bind(){
  const container=root.querySelector('.alice-host'),panel=root.querySelector('.panel');if(!container)return;
  const launcher=root.querySelector('.launcher');if(launcher!==observedLauncher){observer?.disconnect();observer?.observe(launcher);observedLauncher=launcher;}
  container.classList.toggle('launcher-positioned',Boolean(position));container.classList.toggle('launcher-dragging',Boolean(drag?.moved));
  if(position){const b=bounds();container.style.left=(b.left+position.x*(b.right-b.left))+'px';container.style.top=(b.top+position.y*(b.bottom-b.top))+'px';}else{container.style.removeProperty('left');container.style.removeProperty('top');}
  if(panel){const v=viewport();panel.style.right=Math.max(12,window.innerWidth-v.x-v.width+12)+'px';panel.style.bottom=Math.max(12,window.innerHeight-v.y-v.height+12)+'px';panel.style.maxWidth=Math.max(0,v.width-24)+'px';panel.style.maxHeight=Math.max(0,v.height-24)+'px';}
 }
 function place(x,y){const b=bounds();position={x:(clamp(x,b.left,b.right)-b.left)/(b.right-b.left||1),y:(clamp(y,b.top,b.bottom)-b.top)/(b.bottom-b.top||1)};bind();}
 function save(){try{if(position)localStorage.setItem(key,JSON.stringify(position));else localStorage.removeItem(key);}catch{}}
 function blockNextClick(){suppressClick=true;clearTimeout(clickTimer);clickTimer=setTimeout(()=>{suppressClick=false;},0);}
 function start(event){
  const launcher=event.target.closest?.('.launcher');
  if(!launcher||event.button!==0||event.isPrimary===false||root.querySelector('.is-open'))return;
  const rect=launcher.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,previous:position,moved:false};
 }
 function move(event){
  if(!drag||event.pointerId!==drag.id)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(!drag.moved&&Math.hypot(dx,dy)<8)return;
  if(!drag.moved){drag.moved=true;try{host.setPointerCapture(event.pointerId);}catch{}}
  event.preventDefault();place(drag.left+dx,drag.top+dy);
 }
 function end(event){
  if(!drag||event.pointerId!==drag.id)return;
  const current=drag;drag=null;
  if(current.moved){blockNextClick();if(event.type==='pointercancel')position=current.previous;else save();}
  try{if(host.hasPointerCapture(current.id))host.releasePointerCapture(current.id);}catch{}
  bind();
 }
 function click(event){if(suppressClick&&event.detail!==0){suppressClick=false;event.preventDefault();event.stopImmediatePropagation();}}
 function keyboard(event){
  if(!event.target.closest?.('.launcher')||root.querySelector('.is-open')||event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
  event.preventDefault();event.stopPropagation();
  if(event.key==='Home'){position=null;save();bind();return;}
  const rect=root.querySelector('.launcher').getBoundingClientRect(),step=event.shiftKey?48:24;
  place(rect.left+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),rect.top+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0));save();
 }
 function resize(){if(drag){const current=drag;position=current.previous;drag=null;if(current.moved)blockNextClick();try{if(host.hasPointerCapture(current.id))host.releasePointerCapture(current.id);}catch{}}bind();}
 root.addEventListener('pointerdown',start);
 root.addEventListener('keydown',keyboard);
 host.addEventListener('click',click,true);
 window.addEventListener('pointermove',move,{passive:false});
 window.addEventListener('pointerup',end);
 window.addEventListener('pointercancel',end);
 window.addEventListener('resize',resize);
 window.visualViewport?.addEventListener('resize',resize);
 window.visualViewport?.addEventListener('scroll',bind);
 return {bind,destroy(){clearTimeout(clickTimer);observer?.disconnect();root.removeEventListener('pointerdown',start);root.removeEventListener('keydown',keyboard);host.removeEventListener('click',click,true);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('scroll',bind);}};
}

export type Direction = 'left' | 'right' | 'up' | 'down';
export interface Box { left:number; right:number; top:number; bottom:number }
export function remoteKey(event:Pick<KeyboardEvent,'key'|'keyCode'>):Direction|'ok'|'back'|undefined {
 const keys:Record<string,Direction|'ok'|'back'>={ArrowLeft:'left',Left:'left',ArrowRight:'right',Right:'right',ArrowUp:'up',Up:'up',ArrowDown:'down',Down:'down',Enter:'ok',Accept:'ok',Select:'ok',Escape:'back',Esc:'back',BrowserBack:'back',GoBack:'back',Back:'back',Backspace:'back'};
 return keys[event.key] ?? ({37:'left',38:'up',39:'right',40:'down',13:'ok',23:'ok',27:'back',4:'back',8:'back',461:'back',10009:'back'} as Record<number,Direction|'ok'|'back'>)[event.keyCode];
}
export function initialTvMode(search:string,stored:string|null|undefined,userAgent:string):boolean {
 const requested=new URLSearchParams(search).get('tv');
 if(requested==='1'||requested==='0')return requested==='1';
 if(stored==='1'||stored==='0')return stored==='1';
 return /Hisense|VIDAA|SmartTV|SMART-TV|HbbTV/i.test(userAgent);
}
export function inBeam(origin:Box,candidate:Box,direction:Direction):boolean {
 return direction==='left'||direction==='right'
  ? Math.min(origin.bottom,candidate.bottom)-Math.max(origin.top,candidate.top)>0
  : Math.min(origin.right,candidate.right)-Math.max(origin.left,candidate.left)>0;
}
export function nextSpatial<T extends Box>(origin:Box,items:T[],direction:Direction):T|undefined {
 const x=(origin.left+origin.right)/2,y=(origin.top+origin.bottom)/2;
 let best:T|undefined;let bestScore=Infinity;
 for(const item of items){
  const dx=(item.left+item.right)/2-x,dy=(item.top+item.bottom)/2-y;
  const primary=direction==='left'?-dx:direction==='right'?dx:direction==='up'?-dy:dy;
  if(primary<=4)continue;
  const perpendicular=direction==='left'||direction==='right'?Math.abs(dy):Math.abs(dx);
  const score=(inBeam(origin,item,direction)?0:100000)+primary*3+perpendicular*8+Math.hypot(dx,dy)*0.01;
  if(score<bestScore){best=item;bestScore=score;}
 }
 return best;
}
const selector='a[href],button,input:not([type="hidden"]),select,textarea,summary,[tabindex]';
export function installTvNavigation(options:{enabled:()=>boolean;onBack:()=>void}) {
 let lastMain:HTMLElement|undefined;let lastGroup:HTMLElement|undefined;let lastBox:Box|undefined;let frame=0;let disposed=false;
 function usable(el:HTMLElement):boolean {
  if(el.classList.contains('skip')||el.tabIndex<0||el.matches(':disabled')||el.getAttribute('aria-disabled')==='true'||el.closest('[hidden],[inert],[aria-hidden="true"]'))return false;
  const style=getComputedStyle(el),r=el.getBoundingClientRect();
  return style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0'&&r.width>0&&r.height>0;
 }
 function elements(root:ParentNode=document){return [...root.querySelectorAll<HTMLElement>(selector)].filter(usable);}
 function focus(el:HTMLElement|undefined){
  if(!el)return;el.focus({preventScroll:true});
  if(!el.closest('.bottom-nav')){
   const rect=el.getBoundingClientRect();const nav=document.querySelector('.bottom-nav')?.getBoundingClientRect();
   if(rect.top<24||rect.bottom>Math.min(innerHeight-32,nav?.top??innerHeight)-20)el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});
  }
 }
 function focusMain(id?:string){if(!options.enabled())return;const root=document.querySelector('#main');const preferred=id?root?.querySelector<HTMLElement>(`[data-tv-focus-id="${id.replace(/[^a-z0-9-]/gi,'')}"]`):undefined;focus(preferred&&usable(preferred)?preferred:root?elements(root)[0]:elements()[0]);}
 function focusNav(){focus(elements(document.querySelector('.bottom-nav')??document).find(el=>el.getAttribute('aria-current')==='page')??elements(document.querySelector('.bottom-nav')??document)[0]);}
 function onFocus(event:FocusEvent){
  if(!options.enabled()||!(event.target instanceof HTMLElement))return;
  if(event.target.closest('#main'))lastMain=event.target;
  lastGroup=event.target.closest<HTMLElement>('.quiz,.speaking-card')??undefined;
  lastBox=event.target.getBoundingClientRect();
 }
 function endEdit(el:HTMLElement){delete el.dataset.tvEditing;}
 function onKey(event:KeyboardEvent){
  if(!options.enabled()||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.isComposing)return;
  const key=remoteKey(event);if(!key)return;
  let active=document.activeElement instanceof HTMLElement?document.activeElement:undefined;
  const editing=active?.dataset.tvEditing==='true';
  if(editing){
   if(event.key==='Backspace'&&!(active instanceof HTMLSelectElement))return;
   if(key==='ok'&&active instanceof HTMLInputElement){endEdit(active);return;}
   if(key==='back'||key==='ok'&&active instanceof HTMLSelectElement){event.preventDefault();event.stopPropagation();endEdit(active!);return;}
   if(active instanceof HTMLSelectElement){
    event.preventDefault();event.stopPropagation();
    const delta=key==='up'||key==='left'?-1:1;
    let index=active.selectedIndex+delta;
    while(index>=0&&index<active.options.length&&active.options[index]?.disabled)index+=delta;
    if(index>=0&&index<active.options.length){active.selectedIndex=index;active.dispatchEvent(new Event('change',{bubbles:true}));}
   }
   // Native text entry keeps cursor arrows and Enter/form submit intact.
   return;
  }
  event.preventDefault();event.stopPropagation();
  if(key==='back'){options.onBack();return;}
  const candidates=elements();
  if(!active||!candidates.includes(active)){focusMain();return;}
  if(key==='ok'){
   if(event.repeat)return;
   if(active instanceof HTMLSelectElement||active instanceof HTMLTextAreaElement||active instanceof HTMLInputElement&&!['checkbox','radio','button','submit','reset','file'].includes(active.type)){
    active.dataset.tvEditing='true';active.click();return;
   }
   active.click();return;
  }
  const origin=active.getBoundingClientRect();
  let pool=candidates.filter(el=>el!==active);
  if(active.closest('.bottom-nav')){
   if(key==='up'){focus(lastMain&&usable(lastMain)?lastMain:elements(document.querySelector('#main')??document)[0]);return;}
   pool=pool.filter(el=>el.closest('.bottom-nav'));
  }else if(active.closest('#main')){
   const mainPool=pool.filter(el=>el.closest('#main'));
   const boxes=mainPool.map(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,el})) as (Box&{el:HTMLElement})[];
   if(key==='left'&&!nextSpatial(origin,boxes.filter(b=>inBeam(origin,b,key)),key)){focusNav();return;}
   const mainTarget=nextSpatial(origin,boxes,key);
   if(mainTarget){focus(mainTarget.el);return;}
   if(key==='down'){focusNav();return;}
   if(key==='right')return;
  }
  const target=nextSpatial(origin,pool.map(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,el})),key);
  focus(target?.el);
 }
 function repair(){
  frame=0;if(disposed||!options.enabled())return;
  const active=document.activeElement;
  if(active instanceof HTMLElement&&usable(active)&&active.matches(selector))return;
  if(lastGroup?.isConnected){const groupItems=elements(lastGroup);if(groupItems.length){focus(groupItems.find(el=>el.classList.contains('stop'))??groupItems[0]);return;}}
  const pool=elements(document.querySelector('#main')??document);
  if(lastBox&&pool.length){const x=(lastBox.left+lastBox.right)/2,y=(lastBox.top+lastBox.bottom)/2;pool.sort((a,b)=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return Math.hypot((ar.left+ar.right)/2-x,(ar.top+ar.bottom)/2-y)-Math.hypot((br.left+br.right)/2-x,(br.top+br.bottom)/2-y);});focus(pool[0]);}
  else focusMain();
 }
 const observer=new MutationObserver(()=>{if(!frame&&options.enabled())frame=requestAnimationFrame(repair);});
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','hidden','style','open']});
 document.addEventListener('keydown',onKey,true);document.addEventListener('focusin',onFocus);
 document.addEventListener('focusout',onBlur);
 function onBlur(event:FocusEvent){if(event.target instanceof HTMLElement)endEdit(event.target);}
 return {focusMain,focusNav,dispose(){disposed=true;observer.disconnect();cancelAnimationFrame(frame);document.removeEventListener('keydown',onKey,true);document.removeEventListener('focusin',onFocus);document.removeEventListener('focusout',onBlur);document.querySelectorAll<HTMLElement>('[data-tv-editing]').forEach(endEdit);}};
}

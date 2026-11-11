// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialTvMode, inBeam, installTvNavigation, nextSpatial, remoteKey } from './tv';
const rect=(left:number,top:number,width=90,height=50)=>({left,top,right:left+width,bottom:top+height});
let navigation:ReturnType<typeof installTvNavigation>|undefined;
afterEach(()=>{navigation?.dispose();navigation=undefined;document.body.innerHTML='';vi.restoreAllMocks();});
function setup(){
 document.body.innerHTML='<main id="main"><button id="a">A</button><button id="b">B</button><button id="c" disabled>C</button><button id="d">D</button><select id="select"><option value="one">One</option><option value="two">Two</option></select><input id="text" value="word"><input type="checkbox" id="check"></main><nav class="bottom-nav"><button id="nav" aria-current="page">Home</button><button id="nav2">Courses</button></nav>';
 const boxes:Record<string,ReturnType<typeof rect>>={a:rect(100,100),b:rect(220,100),c:rect(340,100),d:rect(100,200),select:rect(100,300),text:rect(100,400),check:rect(220,400),nav:rect(100,600),nav2:rect(220,600)};
 for(const el of document.querySelectorAll<HTMLElement>('[id]:not(main)')){
  const box=boxes[el.id]!;el.getBoundingClientRect=()=>({...box,x:box.left,y:box.top,width:box.right-box.left,height:box.bottom-box.top,toJSON:()=>box});el.scrollIntoView=vi.fn();
 }
 const onBack=vi.fn();let enabled=true;
 navigation=installTvNavigation({enabled:()=>enabled,onBack});
 const get=(id:string)=>document.getElementById(id)!;
 const key=(key:string,keyCode=0)=>{const e=new KeyboardEvent('keydown',{key,keyCode,bubbles:true,cancelable:true});document.activeElement!.dispatchEvent(e);return e;};
 return {get,key,onBack,disable:()=>enabled=false};
}
describe('remote mapping and opt-in',()=>{
 it('gives the direct URL priority, remembers the choice and detects TV user agents only',()=>{
  expect(initialTvMode('?tv=1','0','Android')).toBe(true);expect(initialTvMode('?tv=0','1','VIDAA')).toBe(false);
  expect(initialTvMode('','0','Hisense')).toBe(false);expect(initialTvMode('',null,'VIDAA')).toBe(true);
  expect(initialTvMode('',null,'Android Mobile Chrome')).toBe(false);expect(initialTvMode('',null,'Windows Chrome')).toBe(false);
 });
 it('supports arrows, OK, common browser back and legacy remote codes',()=>{
  expect(remoteKey({key:'ArrowLeft',keyCode:0})).toBe('left');expect(remoteKey({key:'Enter',keyCode:13})).toBe('ok');
  for(const code of [4,8,27,461,10009])expect(remoteKey({key:'Unidentified',keyCode:code})).toBe('back');
  expect(remoteKey({key:'BrowserBack',keyCode:0})).toBe('back');expect(remoteKey({key:'x',keyCode:0})).toBeUndefined();
 });
});
describe('spatial targeting',()=>{
 it('follows the same row or column before a nearer diagonal and does not wrap',()=>{
  const origin=rect(100,100),sameRow=rect(300,100),diagonal=rect(205,180);
  expect(nextSpatial(origin,[diagonal,sameRow],'right')).toBe(sameRow);
  expect(nextSpatial(origin,[sameRow,rect(100,220)],'down')).toEqual(rect(100,220));
  expect(nextSpatial(origin,[sameRow],'left')).toBeUndefined();
  expect(inBeam(origin,sameRow,'right')).toBe(true);
 });
});
describe('TV input controller',()=>{
 it('moves focus with the d-pad and skips disabled controls',()=>{
  const{get,key}=setup();get('a').focus();key('ArrowRight');expect(document.activeElement).toBe(get('b'));
  key('ArrowDown');expect(document.activeElement).toBe(get('check'));
 });
 it('clicks OK once and leaves native checkbox semantics intact',()=>{
  const{get,key}=setup();const click=vi.fn();get('a').addEventListener('click',click);get('a').focus();expect(key('Enter').defaultPrevented).toBe(true);expect(click).toHaveBeenCalledTimes(1);
  get('check').focus();key('Enter');expect((get('check') as HTMLInputElement).checked).toBe(true);
 });
 it('goes left to navigation and up returns to the content focus',()=>{
  const{get,key}=setup();get('d').focus();key('ArrowLeft');expect(document.activeElement).toBe(get('nav'));key('ArrowUp');expect(document.activeElement).toBe(get('d'));
 });
 it('uses OK to edit a select and arrows to change it, then returns to navigation mode',()=>{
  const{get,key}=setup();const select=get('select') as HTMLSelectElement;const changed=vi.fn();select.addEventListener('change',changed);
  select.focus();key('Enter');expect(select.dataset.tvEditing).toBe('true');key('ArrowDown');expect(select.value).toBe('two');expect(changed).toHaveBeenCalledOnce();
  key('Enter');expect(select.dataset.tvEditing).toBeUndefined();key('ArrowUp');expect(document.activeElement).toBe(get('d'));
 });
 it('keeps input cursor keys native during editing and consumes back only to end editing',()=>{
  const{get,key,onBack}=setup();const text=get('text');text.focus();key('Enter');expect(text.dataset.tvEditing).toBe('true');expect(key('ArrowLeft').defaultPrevented).toBe(false);expect(key('Backspace').defaultPrevented).toBe(false);
  key('Escape');expect(text.dataset.tvEditing).toBeUndefined();expect(onBack).not.toHaveBeenCalled();key('Escape');expect(onBack).toHaveBeenCalledOnce();
 });
 it('does not intercept a single key in ordinary phone/desktop mode',()=>{
  const{get,key,onBack,disable}=setup();disable();get('a').focus();expect(key('ArrowRight').defaultPrevented).toBe(false);expect(document.activeElement).toBe(get('a'));expect(key('Escape').defaultPrevented).toBe(false);expect(onBack).not.toHaveBeenCalled();
 });
 it('focuses the next action when a quiz answer becomes disabled',async()=>{
  const{get,key}=setup();const quiz=document.createElement('section');quiz.className='quiz';get('a').before(quiz);quiz.append(get('a'),get('b'));get('a').focus();(get('a') as HTMLButtonElement).disabled=true;
  await Promise.resolve();await new Promise(resolve=>requestAnimationFrame(resolve));
  expect(document.activeElement).toBe(get('b'));
 });
 it('restores a course card by its stable focus id',()=>{
  const{get}=setup();get('b').setAttribute('data-tv-focus-id','primary-02');navigation!.focusMain('primary-02');expect(document.activeElement).toBe(get('b'));
 });
});

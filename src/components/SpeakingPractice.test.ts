// @vitest-environment happy-dom
import { createApp, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SpeakingPractice from './SpeakingPractice.vue';
import { latestRecording, saveRecording } from '../lib/db';
vi.mock('../lib/db',()=>({ latestRecording:vi.fn(async()=>undefined),saveRecording:vi.fn(async()=>{}),deleteRecording:vi.fn(async()=>{}) }));
let app:ReturnType<typeof createApp>|undefined;let root:HTMLDivElement;const tracks={stop:vi.fn()};
const getUserMedia=vi.fn(async()=>({getTracks:()=>[tracks]}));
class FakeRecorder {
 static isTypeSupported(){return true;} state='inactive';mimeType='audio/webm';ondataavailable:((e:{data:Blob})=>void)|undefined;onstop:(()=>void)|undefined;onerror:(()=>void)|undefined;
 start(){this.state='recording';} stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['synthetic audio'],{type:'audio/webm'})});this.onstop?.();}
}
const flush=async()=>{await new Promise(resolve=>setTimeout(resolve,0));await nextTick();};
function button(text:string){return [...root.querySelectorAll('button')].find(b=>b.textContent!.includes(text))!;}
async function mount(){root=document.createElement('div');document.body.append(root);const busy=vi.fn(),message=vi.fn();app=createApp(SpeakingPractice,{itemId:'primary-01-s1',text:'Hello.',translation:'你好。',tip:'清楚收尾。',onBusy:busy,onMessage:message});app.mount(root);await flush();return{busy,message};}
beforeEach(()=>{
 vi.clearAllMocks();vi.stubGlobal('MediaRecorder',FakeRecorder);Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia}});
 Object.defineProperty(URL,'createObjectURL',{configurable:true,value:vi.fn(()=> 'blob:test-audio')});Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:vi.fn()});
 vi.stubGlobal('confirm',vi.fn(()=>true));getUserMedia.mockResolvedValue({getTracks:()=>[tracks]});vi.mocked(latestRecording).mockResolvedValue(undefined);
});
afterEach(()=>{app?.unmount();root?.remove();vi.unstubAllGlobals();});
describe('local speaking recording lifecycle with synthetic audio',()=>{
 it('records, releases the mic and stores the selected item with a replay link',async()=>{
  const{busy}=await mount();button('开始录音').click();await flush();expect(root.textContent).toContain('停止');expect(busy).toHaveBeenCalledWith(true);
  button('停止').click();await flush();expect(tracks.stop).toHaveBeenCalled();expect(saveRecording).toHaveBeenCalledWith(expect.objectContaining({id:'primary-01-s1',mimeType:'audio/webm'}));
  expect(button('听自己').disabled).toBe(false);expect(busy).toHaveBeenLastCalledWith(false);
 });
 it('shows a helpful message and releases busy state when permission fails',async()=>{
  getUserMedia.mockRejectedValueOnce(new Error('denied'));const{busy,message}=await mount();button('开始录音').click();await flush();expect(message).toHaveBeenCalledWith(expect.stringContaining('未能开启麦克风'));expect(busy).toHaveBeenLastCalledWith(false);expect(saveRecording).not.toHaveBeenCalled();
 });
 it('does not overwrite an existing recording when re-record is cancelled',async()=>{
  vi.mocked(latestRecording).mockResolvedValue({id:'primary-01-s1',itemId:'primary-01-s1',audio:new Blob(['old']),mimeType:'audio/webm',createdAt:1});vi.mocked(confirm).mockReturnValue(false);
  await mount();button('重新录音').click();await flush();expect(getUserMedia).not.toHaveBeenCalled();expect(saveRecording).not.toHaveBeenCalled();
 });
 it('releases a delayed microphone stream if the component was left during permission request',async()=>{
  let resolve!:(x:{getTracks:()=>typeof tracks[]})=>void;getUserMedia.mockReturnValueOnce(new Promise(r=>resolve=r));await mount();button('开始录音').click();await flush();app!.unmount();app=undefined;resolve({getTracks:()=>[tracks]});await flush();expect(tracks.stop).toHaveBeenCalled();expect(saveRecording).not.toHaveBeenCalled();
 });
 it('reports storage errors and unlocks navigation after stopping',async()=>{
  vi.mocked(saveRecording).mockRejectedValueOnce(new Error('Storage full'));const{busy,message}=await mount();button('开始录音').click();await flush();button('停止').click();await flush();expect(message).toHaveBeenCalledWith('Storage full');expect(busy).toHaveBeenLastCalledWith(false);
 });
});

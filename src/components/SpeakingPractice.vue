<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import { latestRecording, saveRecording, deleteRecording } from '../lib/db';
const props = defineProps<{ itemId: string; text: string; translation: string; tip: string }>();
const emit = defineEmits<{ speak: [text:string]; busy: [value:boolean]; message: [text:string] }>();
const state = ref<'idle'|'requesting'|'recording'|'saving'>('idle');
const url = ref(''); const checks = ref<boolean[]>([]); const seconds = ref(0);
let recorder:MediaRecorder|undefined; let stream:MediaStream|undefined; let timer:ReturnType<typeof setInterval>|undefined;
let loadVersion=0; let alive=true; let playback:HTMLAudioElement|undefined;
function release() { if(timer) clearInterval(timer); timer=undefined; stream?.getTracks().forEach(t=>t.stop()); stream=undefined; }
function setState(value:typeof state.value) {state.value=value;emit('busy',value!=='idle');}
function clearUrl() {playback?.pause();playback=undefined;if(url.value) URL.revokeObjectURL(url.value);url.value='';}
watch(()=>props.itemId, async id=>{
 const version=++loadVersion; checks.value=[];clearUrl();
 try {const saved=await latestRecording(id);if(saved&&version===loadVersion&&alive)url.value=URL.createObjectURL(saved.audio);}catch{emit('message','暂时无法读取录音，可稍后重试。');}
},{immediate:true});
async function start() {
 if(state.value!=='idle')return;
 if(!navigator.mediaDevices?.getUserMedia||!('MediaRecorder' in window)){emit('message','此浏览器不支持录音，请在手机 Safari 或新版浏览器的 HTTPS 页面打开。');return;}
 if(url.value&&!confirm('重新录音将覆盖当前词句的旧录音，继续吗？'))return;
 const id=props.itemId;setState('requesting');
 if('speechSynthesis'in window)speechSynthesis.cancel();playback?.pause();
 try {
  const acquired=await navigator.mediaDevices.getUserMedia({audio:true});
  if(!alive||props.itemId!==id){acquired.getTracks().forEach(t=>t.stop());setState('idle');return;}
  stream=acquired;const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  const active=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);recorder=active;
  const chunks:Blob[]=[];let failed=false;
  active.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  active.onerror=()=>{failed=true;release();if(active.state!=='inactive')active.stop();setState('idle');emit('message','录音失败，请检查麦克风后重试。');};
  active.onstop=async()=>{
   release();if(failed)return;setState('saving');
   try {
    const audio=new Blob(chunks,{type:active.mimeType||'audio/mp4'});
    if(!audio.size)throw Error('没有录到声音，请重试。');
    await saveRecording({id,itemId:id,createdAt:Date.now(),mimeType:audio.type,audio});
    if(alive&&props.itemId===id){clearUrl();url.value=URL.createObjectURL(audio);emit('message','录音已保存在本机。');}
   }catch(e){emit('message',e instanceof Error?e.message:'保存失败，请检查存储空间。');}
   finally{setState('idle');}
  };
  active.start();seconds.value=0;setState('recording');
  timer=setInterval(()=>{seconds.value++;if(seconds.value>=60)stop();},1000);
 }catch{release();setState('idle');emit('message','未能开启麦克风。请允许浏览器录音权限后重试；仍可听示范和阅读。');}
}
function stop(){if(recorder?.state==='recording')recorder.stop();}
function hidden(){if(document.hidden)stop();}
document.addEventListener('visibilitychange',hidden);
function play(){if(!url.value)return;if('speechSynthesis'in window)speechSynthesis.cancel();playback?.pause();playback=new Audio(url.value);void playback.play().catch(()=>emit('message','回放失败，请再点一次并检查设备音量。'));}
async function remove(){if(!confirm('删除这条录音？删除后可重新录制。'))return;try{await deleteRecording(props.itemId);clearUrl();emit('message','已删除录音。');}catch{emit('message','删除失败，请稍后重试。');}}
onUnmounted(()=>{document.removeEventListener('visibilitychange',hidden);alive=false;loadVersion++;if(recorder?.state==='recording')recorder.stop();release();clearUrl();});
</script>
<template>
 <section class="speaking-card" aria-labelledby="practice-title">
  <p class="eyebrow">LISTEN · RECORD · COMPARE</p><h2 id="practice-title">{{ text }}</h2><p class="translation">{{ translation }}</p>
  <p class="sound-tip"><strong>发音提示</strong> {{ tip }}</p>
  <div class="actions"><button class="secondary" :disabled="state!=='idle'" @click="emit('speak',text)">▶ 听示范</button><button v-if="state!=='recording'" class="primary" :disabled="state!=='idle'" @click="start">{{ state==='requesting'?'等待麦克风…':state==='saving'?'保存中…':url?'● 重新录音':'● 开始录音' }}</button><button v-else class="stop" @click="stop">■ 停止 · {{ seconds }} 秒</button><button class="secondary" :disabled="!url||state!=='idle'" @click="play">▷ 听自己</button><button v-if="url" class="text-button" :disabled="state!=='idle'" @click="remove">删除录音</button></div>
  <p class="muted" role="status">{{ state==='recording'?'正在录音，最长 60 秒；完成后点击停止。':url?'已有本机录音，可回放对照示范。':'每个词句保留一条最新录音，不上传服务器。' }}</p>
  <fieldset><legend>听完后，自己检查</legend><label v-for="(label,i) in ['关键词和词尾是否清楚？','重音、停顿是否自然？','不看文字能再说一遍吗？']" :key="label"><input v-model="checks[i]" type="checkbox">{{ label }}</label></fieldset>
  <p class="muted">自评帮助你发现问题，不代表自动发音评分。换设备前请注意：JSON 备份不包含录音。</p>
 </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { lessonsByTrack, builtInWords, wordById, foundations, practiceWords } from './data/content';
import type { Lesson, TrackId, WordItem, CustomWord, Rating, PracticeRecord, DailySession } from './types/wordbook';
import { allProgress, allSessions, allCustomWords, getSetting, setSetting, saveProgress, saveSession, progressFor, saveCustomWord, deleteCustomWord } from './lib/db';
import { createBackup, downloadBackup, importBackup, parseBackup } from './lib/backup';
import { rateItem, dueRecords, selectNextLesson, localDate } from './lib/scheduler';
import { searchWords } from './lib/search';
import { selectVoice } from './lib/speech';
import { checkWaitingUpdate } from './lib/updates';
import WordCard from './components/WordCard.vue';
import SpeakingPractice from './components/SpeakingPractice.vue';
import LessonQuiz from './components/LessonQuiz.vue';
type Page='today'|'courses'|'lesson'|'speaking'|'wordbook'|'mine';
const page=ref<Page>('today'); const track=ref<TrackId>('primary');
const names={primary:'小学英语',middle:'初中英语'};const trackName=computed(()=>names[track.value]);
const ready=ref(false);const fatal=ref('');const toast=ref('');const busy=ref(false);
const online=ref(navigator.onLine);const now=ref(Date.now());const rate=ref(0.9);
const progress=ref<PracticeRecord[]>([]);const sessions=ref<DailySession[]>([]);const custom=ref<CustomWord[]>([]);
const activeId=ref('primary-01');const courseList=computed(()=>lessonsByTrack[track.value]);
const lesson=computed(()=>courseList.value.find(x=>x.id===activeId.value)??courseList.value[0]!);
const completed=computed(()=>new Set(sessions.value.filter(x=>x.track===track.value&&x.completedAt).map(x=>x.lessonId)));
const next=computed(()=>selectNextLesson(courseList.value,completed.value));
const due=computed(()=>dueRecords(progress.value,track.value,now.value).map(r=>wordById(r.itemId)??custom.value.find(w=>w.id===r.itemId)).filter((w):w is WordItem=>!!w));
const units=computed(()=>[...new Set(courseList.value.map(x=>x.unit))]);
const search=ref('');const trackWords=computed(()=>[...builtInWords(track.value),...custom.value.filter(x=>x.track===track.value)]);
const results=computed(()=>searchWords(trackWords.value,search.value));
const dictionary=computed(()=>({youdao:`https://www.youdao.com/result?word=${encodeURIComponent(search.value.trim())}&lang=en`,bing:`https://www.bing.com/dict/search?q=${encodeURIComponent(search.value.trim())}`}));
const oralMode=ref<'sounds'|'words'|'sentences'>('sentences');const oralIndex=ref(0);const override=ref<WordItem|null>(null);
const oralItems=computed(()=>oralMode.value==='sounds'?foundations[track.value].map(x=>({id:x.id,text:x.text,zh:x.zh,tip:x.tip,title:x.title})): (oralMode.value==='words'?lesson.value.words:practiceWords(lesson.value).slice(lesson.value.words.length)).map(w=>({id:w.id,text:w.word,zh:w.translation,tip:lesson.value.sound,title:lesson.value.title})));
const oralItem=computed(()=>override.value?{id:override.value.id,text:override.value.word,zh:override.value.translation,tip:override.value.linkingNotes??lesson.value.sound,title:'自主跟读'}:oralItems.value[oralIndex.value]??oralItems.value[0]!);
const form=ref({word:'',translation:'',phonetic:'',exampleEn:'',exampleZh:''});const editing=ref('');
const voiceList=ref<SpeechSynthesisVoice[]>([]);const selectedVoice=computed(()=>selectVoice(voiceList.value));
const voiceStatus=computed(()=>!('speechSynthesis'in window)?'此浏览器不支持系统朗读。':selectedVoice.value?selectedVoice.value.localService?'已检测到本地英文语音，可尝试离线朗读。':'已检测到英文语音，播放可能需要联网。':'未检测到英文声线。请在设备设置中安装英文语音，再重新打开应用。');
const {needRefresh,updateServiceWorker}=useRegisterSW();const updating=ref(false);const updateText=ref('联网检查新版本，更新保留已保存的数据。');
let timer:ReturnType<typeof setInterval>;let toastTimer:ReturnType<typeof setTimeout>;let backupUrl='';
function message(text:string){toast.value=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.value='',4000);}
function refreshVoices(){if('speechSynthesis'in window)voiceList.value=speechSynthesis.getVoices();}
function connection(){online.value=navigator.onLine;}
function stopVoice(){if('speechSynthesis'in window)speechSynthesis.cancel();}
function speak(text:string){
 if(busy.value)return;if(!('speechSynthesis'in window)){message('此浏览器不支持朗读。');return;}
 refreshVoices();stopVoice();const utterance=new SpeechSynthesisUtterance(text);utterance.lang=selectedVoice.value?.lang??'en-US';utterance.voice=selectedVoice.value??null;utterance.rate=rate.value;
 utterance.onerror=e=>{if(e.error!=='interrupted'&&e.error!=='canceled')message('朗读未完成，请检查设备语音、音量和网络。');};speechSynthesis.speak(utterance);
}
async function load(){try{const[p,s,c,t]=await Promise.all([allProgress(),allSessions(),allCustomWords(),getSetting('track')]);progress.value=p;sessions.value=s;custom.value=c;if(t==='primary'||t==='middle')track.value=t;activeId.value=courseList.value[0]!.id;ready.value=true;}catch{fatal.value='无法打开本地存储，请检查浏览器是否允许网站保存数据，再刷新重试。';}}
onMounted(()=>{void load();refreshVoices();if('speechSynthesis'in window)speechSynthesis.addEventListener('voiceschanged',refreshVoices);window.addEventListener('online',connection);window.addEventListener('offline',connection);timer=setInterval(()=>now.value=Date.now(),30000);});
onUnmounted(()=>{clearInterval(timer);clearTimeout(toastTimer);stopVoice();if(backupUrl)URL.revokeObjectURL(backupUrl);if('speechSynthesis'in window)speechSynthesis.removeEventListener('voiceschanged',refreshVoices);window.removeEventListener('online',connection);window.removeEventListener('offline',connection);});
function navigate(target:Page){if(busy.value)return;stopVoice();page.value=target;window.scrollTo({top:0});}
async function switchTrack(value:TrackId){if(busy.value||track.value===value)return;stopVoice();track.value=value;activeId.value=courseList.value[0]!.id;oralIndex.value=0;override.value=null;search.value='';clearForm();navigate('today');try{await setSetting('track',value);}catch{message('切换成功，但未能保存学段选择。');}}
function openLesson(value:Lesson){if(busy.value)return;activeId.value=value.id;override.value=null;oralIndex.value=0;navigate('lesson');}
function practice(word?:WordItem){if(word){const owner=courseList.value.find(l=>practiceWords(l).some(w=>w.id===word.id));if(owner)activeId.value=owner.id;}override.value=word??null;if(!word){oralMode.value='sentences';oralIndex.value=0;}navigate('speaking');}
function chooseMode(mode:typeof oralMode.value){if(busy.value)return;stopVoice();oralMode.value=mode;override.value=null;oralIndex.value=0;}
function chooseOralLesson(){stopVoice();override.value=null;oralIndex.value=0;}
async function remember(word:WordItem,rating:Rating){try{const previous=await progressFor(word.id);const record=rateItem(word.id,track.value,rating,previous);await saveProgress(record);progress.value=[...progress.value.filter(x=>x.itemId!==word.id),record];now.value=Date.now();message('已安排下次复习。');}catch{message('保存失败，请检查本地存储空间。');}}
async function complete(){try{const date=localDate();const session:DailySession={id:`${date}:${lesson.value.id}`,track:track.value,date,lessonId:lesson.value.id,completedAt:Date.now(),reviewedItemIds:progress.value.filter(x=>practiceWords(lesson.value).some(w=>w.id===x.itemId)).map(x=>x.itemId)};await saveSession(session);sessions.value=[...sessions.value.filter(x=>x.id!==session.id),session];message('本课已完成！可以继续复习或选下一课。');navigate('courses');}catch{message('完成记录保存失败。');}}
function clearForm(){editing.value='';form.value={word:'',translation:'',phonetic:'',exampleEn:'',exampleZh:''};}
async function saveWord(){const f=form.value;if(!f.word.trim()||!f.translation.trim()||!f.exampleEn.trim()){message('请填写词句、中文意思和英文例句。');return;}try{const w:CustomWord={id:editing.value||`custom-${track.value}-${crypto.randomUUID()}`,track:track.value,word:f.word.trim(),translation:f.translation.trim(),phonetic:f.phonetic.trim(),category:'custom',updatedAt:Date.now(),examples:[{en:f.exampleEn.trim(),zh:f.exampleZh.trim()}]};await saveCustomWord(w);custom.value=[...custom.value.filter(x=>x.id!==w.id),w];clearForm();message('已加入本学段词库。');}catch{message('词条保存失败。');}}
function editWord(word:CustomWord){editing.value=word.id;form.value={word:word.word,translation:word.translation,phonetic:word.phonetic,exampleEn:word.examples[0]?.en??'',exampleZh:word.examples[0]?.zh??''};document.getElementById('word-editor')?.scrollIntoView({behavior:'smooth'});}
async function removeWord(word:CustomWord){if(!confirm(`删除自定义词条“${word.word}”？`))return;try{await deleteCustomWord(word.id);custom.value=custom.value.filter(x=>x.id!==word.id);if(editing.value===word.id)clearForm();message('已删除词条。');}catch{message('删除失败。');}}
async function exportData(){try{if(backupUrl)URL.revokeObjectURL(backupUrl);const result=downloadBackup(await createBackup());backupUrl=result.url;message('已生成备份，请保存到文件。');}catch{message('导出失败，请重试。');}}
async function importData(event:Event){const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;try{if(file.size>5000000)throw Error('备份文件不得超过 5 MB。');const backup=parseBackup(await file.text());await importBackup(backup);await load();message('已合并备份，不会用旧记录覆盖新进度。');}catch(e){message(e instanceof Error?e.message:'导入失败。');}finally{input.value='';}}
async function updateApp(){if(busy.value||updating.value)return;if(!online.value&&!needRefresh.value){updateText.value='当前离线，请联网后检查更新。';return;}updating.value=true;try{if(needRefresh.value){await updateServiceWorker(true);return;}if(!('serviceWorker'in navigator)){updateText.value='此浏览器不支持离线应用更新。';return;}const reg=await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);if(!reg){updateText.value='更新服务正在准备，请稍后重新打开应用。';return;}needRefresh.value=await checkWaitingUpdate(reg);updateText.value=needRefresh.value?'新版本已下载，点击立即更新。':'已检查，当前没有发现新版本。';}catch{updateText.value='检查更新失败，请联网后重试。';}finally{updating.value=false;}}
const nav:{id:Page;icon:string;label:string}[]=[{id:'today',icon:'⌂',label:'今日'},{id:'courses',icon:'▦',label:'课程'},{id:'speaking',icon:'◉',label:'口语'},{id:'wordbook',icon:'▤',label:'词库'},{id:'mine',icon:'○',label:'我的'}];
</script>
<template>
 <a class="skip" href="#main">跳到主要内容</a>
 <header class="site-header"><a class="brand" href="#" @click.prevent="navigate('today')"><span class="brand-mark">Aa</span><span>每日英语<small>一点一点，开口表达</small></span></a><span class="connection">{{online?'本机学习 · 已联网':'离线学习中'}}</span></header>
 <template v-if="ready">
  <div class="top-controls"><div class="track-switch" aria-label="选择学段"><button v-for="(label,key) in names" :key="key" :disabled="busy" :class="{active:track===key}" :aria-pressed="track===key" @click="switchTrack(key)">{{label}}<small>{{key==='primary'?'字母 · 短句 · 生活':'句型 · 阅读 · 表达'}}</small></button></div><label class="speed-control">语速<select v-model.number="rate" :disabled="busy"><option :value="0.7">慢速</option><option :value="0.9">正常</option></select></label></div>
  <p v-if="busy" class="notice" role="status">正在处理录音，请先停止并等待保存，再切换页面。</p>
  <div v-if="needRefresh" class="notice">有新版本可用。<button class="text-button" :disabled="busy||updating" @click="updateApp">立即更新 →</button></div>
  <main id="main">
   <section v-if="page==='today'">
    <div class="hero"><div><p class="eyebrow">A LITTLE ENGLISH, EVERY DAY</p><h1>今天，<br>说一点英语<span>。</span></h1><p>{{trackName}} · 从听懂一个词，到说清一句话。</p><div class="hero-actions"><button class="primary" @click="openLesson(next??courseList[0]!)">{{next?'开始下一课':'回顾第一课'}} →</button><button class="secondary" @click="practice()">去练口语</button></div></div><div class="hero-art" aria-hidden="true"><div class="art-orbit"></div><div class="speech-bubble">Hello!</div><div class="art-book">Aa<small>LISTEN • SPEAK • GROW</small></div><span class="spark">✦</span></div></div>
    <div class="metrics"><div><strong>{{completed.size}}<small> / {{courseList.length}}</small></strong><span>课程已完成</span></div><div><strong>{{due.length}}</strong><span>词句待复习</span></div><div><strong>{{custom.filter(x=>x.track===track).length}}</strong><span>我的新词句</span></div></div>
    <section class="panel search-panel"><label for="home-search"><strong>今天想了解哪个词？</strong></label><form class="search-row" role="search" @submit.prevent="navigate('wordbook')"><input id="home-search" v-model="search" type="search" placeholder="输入英文单词、短语或中文" enterkeyhint="search"><button class="primary" type="submit">搜索</button></form><p class="muted">查询当前学段；本地未收录时，可一键前往有道或必应词典。</p></section>
    <div class="section-heading"><div><p class="eyebrow">YOUR NEXT STEP</p><h2>{{next?'下一课，继续探索':'全部新课已完成'}}</h2></div><button class="text-button" @click="navigate('courses')">全部课程 →</button></div>
    <button v-if="next" class="next-card" @click="openLesson(next)"><span class="lesson-number">{{String(next.order).padStart(2,'0')}}</span><span><small>{{next.unit}}</small><strong>{{next.title}}</strong><span>{{next.words.length}} 个表达 · 听说与小测</span></span><b>↗</b></button><p v-else class="panel">继续复习到期词句，或打开任意一课重练。</p>
    <div class="section-heading"><div><p class="eyebrow">MAKE IT STICK</p><h2>到期复习</h2></div><span class="muted">先练旧的，再学新的</span></div><p v-if="!due.length" class="empty">暂时没有到期词句。学习时点“再练／困难／良好／熟练”，就会安排下次复习。</p><div v-else class="word-grid"><WordCard v-for="word in due.slice(0,12)" :key="word.id" :word="word" @speak="speak" @rate="remember" @practice="practice"/></div><p v-if="due.length>12" class="muted">先显示最早到期的 12 项，完成后继续显示。</p>
    <p class="footnote">通用基础学习课程，不对应特定教材版本；建议结合课堂学习，每天练习 10–15 分钟。</p>
   </section>
   <section v-else-if="page==='courses'">
    <div class="page-title"><p class="eyebrow">{{trackName}} · COURSE MAP</p><h1>每一课，向前一点</h1><p>按顺序打基础，也可以自由选择你需要的主题。</p></div>
    <section v-for="(unit,i) in units" :key="unit" class="unit"><div class="section-heading"><h2><span class="unit-index">{{String(i+1).padStart(2,'0')}}</span>{{unit}}</h2><span class="muted">4 课</span></div><div class="course-grid"><button v-for="item in courseList.filter(x=>x.unit===unit)" :key="item.id" class="course-card" @click="openLesson(item)"><small>LESSON {{String(item.order).padStart(2,'0')}}</small><h3>{{item.title}}</h3><p>{{item.words.length}} 个表达 · 口语 · 小测</p><span :class="{done:completed.has(item.id)}">{{completed.has(item.id)?'已完成 ✓':'开始学习 ↗'}}</span></button></div></section>
   </section>
   <section v-else-if="page==='lesson'">
    <button class="text-button" @click="navigate('courses')">← 返回课程</button><div class="page-title"><p class="eyebrow">{{trackName}} · LESSON {{lesson.order}} · {{lesson.unit}}</p><h1>{{lesson.title}}</h1><p>{{lesson.focus}}</p></div><div class="sound-tip"><strong>本课发音重点</strong><p>{{lesson.sound}}</p><button class="text-button" @click="practice()">开始本课口语跟读 →</button></div>
    <div class="section-heading"><h2>词汇与表达</h2><span class="muted">听一听，再说一遍</span></div><div class="word-grid"><WordCard v-for="word in lesson.words" :key="word.id" :word="word" @speak="speak" @rate="remember" @practice="practice"/></div>
    <section class="panel"><p class="eyebrow">USE IT IN A SENTENCE</p><h2>{{track==='middle'?'短文与常用句':'常用句'}}</h2><p v-if="track==='middle'" class="reading-passage">{{lesson.sentences.map(x=>x.en).join(' ')}}</p><article v-for="sentence in lesson.sentences" :key="sentence.id" class="sentence"><div><h3>{{sentence.en}}</h3><p class="muted">{{sentence.zh}}</p></div><div class="actions"><button class="play-button" :aria-label="`朗读 ${sentence.en}`" @click="speak(sentence.en)">▶</button><button class="text-button" @click="practice(wordById(sentence.id))">跟读</button></div></article></section>
    <section class="panel"><p class="eyebrow">A LITTLE CONVERSATION</p><h2>情景对话</h2><article v-for="(line,i) in lesson.dialogue" :key="i" class="dialogue-line"><span class="speaker">{{line.speaker}}</span><div><p>{{line.en}}</p><p class="muted">{{line.zh}}</p></div><button class="play-button" :aria-label="`朗读对话第 ${i+1} 句`" @click="speak(line.en)">▶</button></article></section>
    <section class="panel"><h2>换成自己的话</h2><article v-for="(prompt,i) in lesson.practicePrompts" :key="i" class="prompt"><p>{{i+1}}. {{prompt.zh}}</p><details><summary>查看参考表达</summary><p>{{prompt.en}}</p><button class="text-button" @click="speak(prompt.en)">听参考</button></details></article></section><LessonQuiz :key="lesson.id" :lesson="lesson"/><div class="actions end-actions"><button class="secondary" @click="practice()">录音跟读</button><button class="primary" @click="complete">完成本课 ✓</button></div>
   </section>
   <section v-else-if="page==='speaking'">
    <div class="page-title"><p class="eyebrow">{{trackName}} · SPEAKING STUDIO</p><h1>听一句，自己说一句</h1><p>听示范 → 录音 → 回放对照 → 自评。练习过程不上传录音。</p></div>
    <div class="mode-tabs"><button v-for="mode in [{id:'sounds' as const,label:'发音基础'},{id:'words' as const,label:'单词跟读'},{id:'sentences' as const,label:'句子跟读'}]" :key="mode.id" :disabled="busy" :class="{active:oralMode===mode.id&&!override}" @click="chooseMode(mode.id)">{{mode.label}}</button></div>
    <label v-if="oralMode!=='sounds'" class="field-label">选择课程<select v-model="activeId" :disabled="busy" @change="chooseOralLesson"><option v-for="item in courseList" :key="item.id" :value="item.id">{{item.order}}. {{item.title}}</option></select></label>
    <p v-if="override" class="muted">自主跟读 · 从词条进入 <button class="text-button" :disabled="busy" @click="override=null">回到本课列表</button></p>
    <label v-else class="field-label">选择练习<select v-model.number="oralIndex" :disabled="busy" @change="stopVoice"><option v-for="(item,i) in oralItems" :key="item.id" :value="i">{{i+1}}. {{oralMode==='sounds'?item.title:item.text}}</option></select></label>
    <SpeakingPractice :key="oralItem.id" :item-id="oralItem.id" :text="oralItem.text" :translation="oralItem.zh" :tip="oralItem.tip" @speak="speak" @busy="busy=$event" @message="message"/>
    <div v-if="!override" class="actions end-actions"><button class="secondary" :disabled="busy||oralIndex===0" @click="stopVoice();oralIndex--">← 上一项</button><button class="primary" :disabled="busy||oralIndex>=oralItems.length-1" @click="stopVoice();oralIndex++">下一项 →</button></div>
    <div v-if="wordById(oralItem.id)||custom.some(w=>w.id===oralItem.id)" class="panel"><h2>安排下次复习</h2><p class="muted">选择你现在的掌握程度，自评不会生成发音分数。</p><div class="rating-row"><button v-for="r in [{id:'again' as const,label:'再练'},{id:'hard' as const,label:'困难'},{id:'good' as const,label:'良好'},{id:'easy' as const,label:'熟练'}]" :key="r.id" :disabled="busy" @click="remember((wordById(oralItem.id)??custom.find(w=>w.id===oralItem.id))!,r.id)">{{r.label}}</button></div></div>
    <p class="footnote">{{voiceStatus}} 首次使用录音需允许麦克风；示范使用设备系统语音，实际效果取决于设备声线。</p>
   </section>
   <section v-else-if="page==='wordbook'">
    <div class="page-title"><p class="eyebrow">{{trackName}} · WORD BANK</p><h1>把想学的词，留在这里</h1><p>内置 {{builtInWords(track).length}} 项，自定义 {{custom.filter(x=>x.track===track).length}} 项。两个学段分别保存。</p></div>
    <form class="search-row" role="search" @submit.prevent="stopVoice"><label class="sr-only" for="word-search">搜索本学段</label><input id="word-search" v-model="search" type="search" placeholder="输入英文、中文、例句或音标" enterkeyhint="search"><button class="primary" type="submit">搜索</button><button v-if="search" class="text-button" type="button" @click="search=''">清空</button></form><p class="muted" role="status">{{search.trim()?`找到 ${results.length} 项相关内容`:'默认显示前 24 项；搜索可查全部内容，完全匹配优先。'}}</p>
    <section v-if="search.trim()&&!results.length" class="panel"><h2>本地未找到「{{search.trim()}}」</h2><p>可以前往词典查看中文意思、发音和例句。</p><div class="actions"><a class="secondary" :href="dictionary.youdao" target="_blank" rel="noopener noreferrer">去有道查词 ↗</a><a class="secondary" :href="dictionary.bing" target="_blank" rel="noopener noreferrer">去必应词典 ↗</a></div><p class="muted">{{online?'将打开外部网站并自动带上搜索词。':'当前离线，联网后可打开词典。'}}外部结果不会自动保存，也可在下方手动添加。</p></section>
    <div class="word-grid"><div v-for="word in results" :key="word.id"><WordCard :word="word" @speak="speak" @rate="remember" @practice="practice"/><div v-if="word.category==='custom'" class="custom-actions"><button class="text-button" @click="editWord(word as CustomWord)">编辑</button><button class="text-button" @click="removeWord(word as CustomWord)">删除</button></div></div></div>
    <section id="word-editor" class="panel"><h2>{{editing?'编辑词条':'添加自己的词句'}}</h2><form class="word-form" @submit.prevent="saveWord"><label>英文单词或短语<input v-model="form.word" required maxlength="200" placeholder="例如：Good morning"></label><label>中文意思<input v-model="form.translation" required maxlength="300" placeholder="例如：早上好"></label><label>音标（可选）<input v-model="form.phonetic" maxlength="200" placeholder="可从词典查阅后填写"></label><label>英文例句<input v-model="form.exampleEn" required maxlength="500" placeholder="例如：Good morning, Mia."></label><label>例句翻译（可选）<input v-model="form.exampleZh" maxlength="500" placeholder="例如：早上好，米娅。"></label><div class="actions"><button class="primary" type="submit">{{editing?'保存修改':'加入本学段词库'}}</button><button v-if="editing" class="secondary" type="button" @click="clearForm">取消编辑</button></div></form></section>
   </section>
   <section v-else>
    <div class="page-title"><p class="eyebrow">MY LEARNING</p><h1>学习，留在你手里</h1><p>无需账号，进度、自定义词条和录音保存在当前设备。</p></div><section class="panel"><h2>应用更新</h2><p role="status">{{updateText}}</p><button class="primary wide" :disabled="busy||updating" @click="updateApp">{{updating?'正在处理…':needRefresh?'立即更新':'检查更新'}}</button></section>
    <section class="panel"><h2>学习备份</h2><p>导出两个学段的课程进度、复习记录和自定义词库；录音不包含在 JSON 中。</p><div class="actions"><button class="primary" @click="exportData">导出备份 JSON</button><label class="secondary file-button">导入备份 JSON<input type="file" accept=".json,application/json" @change="importData"></label></div><p class="muted">只接受本应用的备份，不与完整版互导。Safari 和主屏幕应用可能使用不同存储；换设备、卸载或清理网站数据前请先导出。</p></section>
    <section class="panel"><h2>语音与离线</h2><p>{{voiceStatus}}</p><p>首次联网打开并缓存后，课程、词库和小测可离线使用；系统朗读的离线能力取决于安装的语音。iPhone 可在系统设置中搜索“朗读内容”或“语音”，下载英文声线。</p><p class="muted">录音最长 60 秒，每项保留最新一条，重录前确认。应用不接入语音识别，不生成自动发音分数。</p></section>
    <section class="panel"><h2>关于课程</h2><p>小学 24 课、初中 32 课，共 402 个词汇／表达，另有 14 项发音基础练习。按通用基础难度组织，非特定教材同步版。例句、对话和练习为本项目编写。</p><p class="muted">适合配合课堂与家长指导使用；系统合成示范不等同于真人教师纠音。无广告、无账号、无收费接口。</p></section>
   </section>
  </main>
  <nav class="bottom-nav" aria-label="主要导航"><button v-for="item in nav" :key="item.id" :class="{active:page===item.id||(page==='lesson'&&item.id==='courses')}" :disabled="busy" @click="navigate(item.id)"><span>{{item.icon}}</span>{{item.label}}</button></nav>
 </template><main v-else><p class="panel" role="status">{{fatal||'正在打开你的英语练习…'}}</p><button v-if="fatal" class="primary" @click="load">重试</button></main>
 <div v-if="toast" class="toast" role="status">{{toast}}</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Lesson } from '../types/wordbook';
const props=defineProps<{lesson:Lesson}>();
const questions=computed(()=>[
 ...props.lesson.words.map((w,i)=>({question:`“${w.word}” 的意思是什么？`,choices:[w.translation,props.lesson.words[(i+1)%props.lesson.words.length]!.translation,props.lesson.words[(i+2)%props.lesson.words.length]!.translation].map((text,j)=>({text,correct:j===0})).sort((a,b)=>a.text.localeCompare(b.text,'zh')),explanation:`${w.word}：${w.translation}`})),
 ...(props.lesson.check?[{question:props.lesson.check.question,choices:props.lesson.check.choices.map((text,i)=>({text,correct:i===props.lesson.check!.answer})),explanation:props.lesson.check.explanation}]:[]),
 ...(props.lesson.track==='middle'?[{question:'阅读上方短文：第一句表达的是什么？',choices:[{text:props.lesson.sentences[1]!.zh,correct:false},{text:props.lesson.sentences[0]!.zh,correct:true},{text:props.lesson.sentences[2]!.zh,correct:false}],explanation:props.lesson.sentences[0]!.en+' '+props.lesson.sentences[0]!.zh}]:[])
]);
const index=ref(0);const answers=ref<number[]>([]);const question=computed(()=>questions.value[index.value]);
const score=computed(()=>answers.value.filter((a,i)=>questions.value[i]!.choices[a]?.correct).length);
</script>
<template><section class="panel quiz"><p class="eyebrow">QUICK CHECK</p><h2>本课小测</h2><p class="muted">检查词义{{lesson.track==='middle'?'、句型和阅读理解':''}}；小测不改变复习安排，也不评价发音。</p><template v-if="question"><p class="muted">{{index+1}} / {{questions.length}}</p><h3>{{question.question}}</h3><div class="quiz-options"><button v-for="(option,i) in question.choices" :key="i" :disabled="answers[index]!==undefined" :class="{correct:answers[index]!==undefined&&option.correct,wrong:answers[index]===i&&!option.correct}" @click="answers[index]=i">{{option.text}}</button></div><div v-if="answers[index]!==undefined" role="status"><p>{{question.choices[answers[index]!]!.correct?'答对了！':'再记一次：'}}{{question.explanation}}</p><button class="secondary" @click="index++">{{index+1===questions.length?'查看结果':'下一题'}}</button></div></template><template v-else><p role="status">完成！答对 {{score}} / {{questions.length}} 题。</p><button class="secondary" @click="index=0;answers=[]">再测一次</button></template></section></template>

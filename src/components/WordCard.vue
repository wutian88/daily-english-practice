<script setup lang="ts">
import type { WordItem, Rating } from '../types/wordbook';
defineProps<{word:WordItem}>();
const emit=defineEmits<{speak:[text:string];rate:[word:WordItem,rating:Rating];practice:[word:WordItem]}>();
const options:{id:Rating;label:string}[]=[{id:'again',label:'再练'},{id:'hard',label:'困难'},{id:'good',label:'良好'},{id:'easy',label:'熟练'}];
</script>
<template><article class="word-card"><div class="word-head"><h3>{{word.word}}</h3><button class="play-button" :aria-label="`朗读 ${word.word}`" @click="emit('speak',word.word)">▶</button></div><p v-if="word.phonetic" class="muted">{{word.phonetic}}</p><p class="meaning">{{word.translation}}</p><div v-for="(example,i) in word.examples" :key="i" class="example"><p>{{example.en}}</p><p class="muted">{{example.zh}}</p><button class="text-button" :aria-label="`朗读例句 ${example.en}`" @click="emit('speak',example.en)">听例句 ↗</button></div><button class="text-button" @click="emit('practice',word)">录音跟读 →</button><div class="rating-row"><button v-for="option in options" :key="option.id" @click="emit('rate',word,option.id)">{{option.label}}</button></div></article></template>

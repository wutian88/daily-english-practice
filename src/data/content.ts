import data from './lessons.json';
import type { Lesson, TrackId, WordItem } from '../types/wordbook';
export const lessons = data as Lesson[];
export const lessonsByTrack: Record<TrackId, Lesson[]> = {
 primary: lessons.filter(x => x.track === 'primary'), middle: lessons.filter(x => x.track === 'middle'),
};
export const builtInWords = (track: TrackId): WordItem[] => lessonsByTrack[track].flatMap(x => x.words);
export const practiceWords = (lesson: Lesson): WordItem[] => [...lesson.words, ...lesson.sentences.map(s => ({id:s.id,word:s.en,translation:s.zh,phonetic:'',category:lesson.track,examples:[{en:s.en,zh:s.zh}],linkingNotes:s.notes}))];
export function wordById(id: string): WordItem | undefined { return lessons.flatMap(practiceWords).find(x => x.id === id); }
export const foundations: Record<TrackId, {id:string;title:string;text:string;zh:string;tip:string}[]> = {
 primary: [
 {id:'p-alphabet',title:'字母名称 · 26 个字母',text:'A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z.',zh:'对照大写与小写，分组读字母名称。',tip:'字母名称与单词中的发音不同。先练 A–F，再逐组练习；不要追求速度。'},
 {id:'p-a',title:'短元音 /æ/ · a',text:'cat. bag. hat. A cat is in the bag.',zh:'猫、包、帽子。一只猫在包里。',tip:'嘴张开，舌位靠前。a 在这些词中读 /æ/，但不是所有含 a 的词都这样读。'},
 {id:'p-e',title:'短元音 /e/ · e',text:'pen. bed. red. A red pen is on the bed.',zh:'钢笔、床、红色。床上有一支红色钢笔。',tip:'/e/ 嘴张得比 /æ/ 小。对照 pen 与 pan，听清差别后再模仿。'},
 {id:'p-i',title:'短元音 /ɪ/ · i',text:'sit. big. fish. A big fish can swim.',zh:'坐、大的、鱼。一条大鱼会游泳。',tip:'/ɪ/ 短而放松，不要拖成 /iː/。先说 fish，再说整句。'},
 {id:'p-u',title:'长元音 /uː/ · oo',text:'food. moon. spoon. I eat food with a spoon.',zh:'食物、月亮、勺子。我用勺子吃东西。',tip:'双唇收圆，声音拉长。oo 在 food 中读 /uː/，在 book 中却读 /ʊ/。'},
 {id:'p-end',title:'保留词尾音',text:'cat. dog. book. I have a book.',zh:'猫、狗、书。我有一本书。',tip:'听清词尾 /t/、/ɡ/、/k/，轻轻收尾，不在结尾额外添加“特、格、克”。'},
 ],
 middle: [
 {id:'m-vowels',title:'/ɪ/ 与 /iː/',text:'ship. sheep. sit. seat. The sheep is near the ship.',zh:'轮船与绵羊、坐与座位。绵羊在船附近。',tip:'/ɪ/ 短而放松；/iː/ 更长、更紧。对比长度，也注意舌位，不能只靠拉长。'},
 {id:'m-th',title:'/θ/ 与 /ð/',text:'three. think. this. mother. This is my mother.',zh:'三、想、这个、母亲。这是我的母亲。',tip:'舌尖轻放齿间送气；/θ/ 不振动声带，/ð/ 振动声带。不要代成 /s/ 或 /z/。'},
 {id:'m-v',title:'/v/ 与 /w/',text:'vest. west. vine. wine. We have five books.',zh:'背心与西方、藤蔓与葡萄酒。我们有五本书。',tip:'/v/ 上齿轻触下唇并振动声带；/w/ 双唇收圆，不咬下唇。'},
 {id:'m-stress',title:'单词重音',text:'student. teacher. guitar. enjoy. I enjoy playing the guitar.',zh:'学生、教师、吉他、喜欢。我喜欢弹吉他。',tip:'STU-dent、TEA-cher 首音节重读；gui-TAR、en-JOY 后音节重读。大小写仅用于提示。'},
 {id:'m-ed',title:'过去式 -ed 的三种读法',text:'watched. played. visited. We watched a film and visited a friend.',zh:'观看了、玩了、拜访了。我们看了电影，并拜访了一位朋友。',tip:'watched 结尾 /t/，played 结尾 /d/；词根以 /t/ 或 /d/ 结尾时，-ed 常读 /ɪd/，如 visited。'},
 {id:'m-link',title:'辅音接元音的衔接',text:'Turn off the light. Pick it up. Can I have an apple?',zh:'关灯。把它捡起来。我可以吃一个苹果吗？',tip:'off 与 the 不必刻意连接；重点练 turn‿off、pick‿it‿up、an‿apple，保持词义清楚，不添加多余音。'},
 {id:'m-rhythm',title:'句子重音与节奏',text:'I want to read a book. We can meet at the gate.',zh:'我想读一本书。我们可以在门口见面。',tip:'read、book、meet、gate 等承载信息的词可稍重，to、a、at 等常弱读。先慢读再恢复自然节奏。'},
 {id:'m-intonation',title:'问句语调与停顿',text:'Are you ready? Where is the library? I would love to, but I have a lesson.',zh:'你准备好了吗？图书馆在哪里？我很想去，但我有课。',tip:'一般疑问句常用升调，特殊疑问句常用降调，但实际语境会变化。but 前稍停顿，表达礼貌转折。'},
 ],
};

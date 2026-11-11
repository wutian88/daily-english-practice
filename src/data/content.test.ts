import { describe, expect, it } from 'vitest';
import { lessons, lessonsByTrack, foundations, builtInWords, practiceWords, wordById } from './content';
describe('curriculum integrity',()=>{
 it('provides the complete two-level curriculum and speaking foundations',()=>{
  expect(lessonsByTrack.primary).toHaveLength(24);expect(lessonsByTrack.middle).toHaveLength(32);
  expect(builtInWords('primary')).toHaveLength(146);expect(builtInWords('middle')).toHaveLength(256);
  expect(foundations.primary).toHaveLength(6);expect(foundations.middle).toHaveLength(8);
 });
 it('uses unique IDs and complete bilingual content with source examples',()=>{
  const ids=new Set<string>();
  for(const lesson of lessons){
   expect(ids.has(lesson.id)).toBe(false);ids.add(lesson.id);
   expect(lesson.words.length).toBeGreaterThanOrEqual(6);expect(lesson.sentences.length).toBeGreaterThanOrEqual(3);
   expect(lesson.dialogue).toHaveLength(4);expect(lesson.practicePrompts).toHaveLength(2);
   for(const w of practiceWords(lesson)){
    expect(ids.has(w.id)).toBe(false);ids.add(w.id);expect(w.word.trim()).not.toBe('');expect(w.translation.trim()).not.toBe('');
    expect(w.examples[0]!.en.toLowerCase()).toContain(w.word.toLowerCase());expect(w.examples[0]!.zh.trim()).not.toBe('');expect(wordById(w.id)?.id).toBe(w.id);
   }
   expect(lesson.sound.trim()).not.toBe('');expect(lesson.focus.trim()).not.toBe('');
   if(lesson.track==='middle'){expect(lesson.check).toBeDefined();expect(lesson.check!.choices).toHaveLength(3);expect(lesson.check!.choices[lesson.check!.answer]).toBeTruthy();}
  }
 });
 it('organizes four lessons in each unit and keeps levels separate',()=>{
  for(const track of ['primary','middle'] as const){
   const list=lessonsByTrack[track];const units=new Set(list.map(l=>l.unit));expect(units.size).toBe(track==='primary'?6:8);
   for(const unit of units)expect(list.filter(l=>l.unit===unit)).toHaveLength(4);
   expect(list.map(l=>l.order)).toEqual(Array.from({length:list.length},(_,i)=>i+1));
   expect(list.every(l=>l.id.startsWith(track+'-'))).toBe(true);
  }
 });
});

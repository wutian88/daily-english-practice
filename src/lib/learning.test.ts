import { describe, expect, it } from 'vitest';
import { parseBackup } from './backup';
import { rateItem, dueRecords, localDate } from './scheduler';
import { searchWords } from './search';
import { builtInWords } from '../data/content';
const empty=()=>({app:'daily-english-practice',schemaVersion:1,exportedAt:new Date().toISOString(),progress:[],sessions:[],customWords:[]});
describe('backup isolation and validation',()=>{
 it('accepts its own namespace and rejects other app backups',()=>{
  expect(parseBackup(JSON.stringify(empty())).app).toBe('daily-english-practice');
  expect(()=>parseBackup(JSON.stringify({...empty(),app:undefined}))).toThrow();
 });
 it('accepts a valid progress record but rejects cross-track and unknown IDs',()=>{
  const record=rateItem('primary-01-w1','primary','good',undefined,100);
  expect(parseBackup(JSON.stringify({...empty(),progress:[record]})).progress).toHaveLength(1);
  for(const changed of [{track:'middle'},{itemId:'d01-w01'},{reviewStage:-1},{userRating:'bad'},{track:'cantonese'}])expect(()=>parseBackup(JSON.stringify({...empty(),progress:[{...record,...changed}]}))).toThrow();
 });
 it('rejects invalid custom words and lesson sessions before writes',()=>{
  expect(()=>parseBackup(JSON.stringify({...empty(),customWords:[{id:'bad',track:'primary'}]}))).toThrow();
  expect(()=>parseBackup(JSON.stringify({...empty(),sessions:[{id:'x',date:'2026-11-11',track:'primary',lessonId:'middle-01',reviewedItemIds:[]}]}))).toThrow();
 });
});
describe('review and search',()=>{
 it('schedules again for ten minutes and good for tomorrow',()=>{
  expect(rateItem('x','primary','again',undefined,0).nextReviewDate).toBe(600000);
  expect(rateItem('x','primary','good',undefined,0).nextReviewDate).toBe(86400000);
 });
 it('keeps due reviews in their own level',()=>{
  const p=rateItem('p','primary','again',undefined,0),m=rateItem('m','middle','again',undefined,0);
  expect(dueRecords([p,m],'primary',700000)).toEqual([p]);
 });
 it('searches all words, examples, Chinese and prioritizes exact matches',()=>{
  const words=builtInWords('primary');expect(searchWords(words,'  HELLO ')[0]!.word).toBe('hello');
  expect(searchWords(words,'我的名字是米娅').length).toBeGreaterThan(0);
  expect(searchWords(words,'Saturday')[0]!.word).toBe('Saturday');expect(searchWords(words,'zzzzz')).toHaveLength(0);
  expect(searchWords(words,' ')).toHaveLength(24);
 });
});

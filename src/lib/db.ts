import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CustomWord, DailySession, PracticeRecord, RecordingRecord } from '../types/wordbook';

interface SettingsEntry {
  key: string;
  value: string;
}

interface EnglishDB extends DBSchema {
  progress: { key: string; value: PracticeRecord };
  sessions: { key: string; value: DailySession };
  recordings: { key: string; value: RecordingRecord };
  customWords: { key: string; value: CustomWord };
  settings: { key: string; value: SettingsEntry };
}

let dbPromise: Promise<IDBPDatabase<EnglishDB>> | undefined;

function database(): Promise<IDBPDatabase<EnglishDB>> {
  dbPromise ??= openDB<EnglishDB>('daily-english-practice-v1', 1, {
    upgrade(db) {
      db.createObjectStore('progress', { keyPath: 'itemId' });
      db.createObjectStore('sessions', { keyPath: 'id' });
      db.createObjectStore('recordings', { keyPath: 'id' });
      db.createObjectStore('customWords', { keyPath: 'id' });
      db.createObjectStore('settings', { keyPath: 'key' });
    },
  });
  return dbPromise;
}

export async function allProgress(): Promise<PracticeRecord[]> {
  return (await database()).getAll('progress');
}

export async function progressFor(itemId: string): Promise<PracticeRecord | undefined> {
  return (await database()).get('progress', itemId);
}

export async function saveProgress(record: PracticeRecord): Promise<void> {
  await (await database()).put('progress', record);
}

export async function allSessions(): Promise<DailySession[]> {
  return (await database()).getAll('sessions');
}

export async function saveSession(session: DailySession): Promise<void> {
  await (await database()).put('sessions', session);
}

export async function allCustomWords(): Promise<CustomWord[]> {
  return (await database()).getAll('customWords');
}

export async function saveCustomWord(word: CustomWord): Promise<void> {
  await (await database()).put('customWords', word);
}

export async function saveCustomWords(words: CustomWord[]): Promise<void> {
  const tx = (await database()).transaction('customWords', 'readwrite');
  for (const word of words) await tx.store.put(word);
  await tx.done;
}

export async function deleteCustomWord(id: string): Promise<void> {
  await (await database()).delete('customWords', id);
}

export async function latestRecording(itemId: string): Promise<RecordingRecord | undefined> {
  return (await database()).get('recordings', itemId);
}

export async function saveRecording(record: RecordingRecord): Promise<void> {
  // One latest recording per sentence keeps storage use bounded on iPhone.
  await (await database()).put('recordings', record);
}

export async function getSetting(key: string): Promise<string | undefined> {
  return (await (await database()).get('settings', key))?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await (await database()).put('settings', { key, value });
}

export async function deleteRecording(id: string): Promise<void> { await (await database()).delete('recordings', id); }

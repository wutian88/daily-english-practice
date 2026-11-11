import { lessonsByTrack, practiceWords } from '../data/content';
import {
  allCustomWords,
  allProgress,
  allSessions,
  saveCustomWord,
  saveProgress,
  saveSession,
} from './db';
import type { CustomWord, DailySession, PracticeRecord } from '../types/wordbook';

export interface LearningBackup {
  schemaVersion: 1;
  app: 'daily-english-practice';
  exportedAt: string;
  progress: PracticeRecord[];
  sessions: DailySession[];
  customWords: CustomWord[];
}

export async function createBackup(): Promise<LearningBackup> {
  return {
    schemaVersion: 1,
    app: 'daily-english-practice',
    exportedAt: new Date().toISOString(),
    progress: await allProgress(),
    sessions: await allSessions(),
    customWords: await allCustomWords(),
  };
}

export function parseBackup(text: string): LearningBackup {
  const data: unknown = JSON.parse(text);
  if (!data || typeof data !== 'object') throw new Error('备份文件格式不正确');
  const candidate = data as Partial<LearningBackup>;
  if (candidate.schemaVersion !== 1 || candidate.app !== 'daily-english-practice' ||
      !Array.isArray(candidate.progress) ||
      !Array.isArray(candidate.sessions) ||
      !Array.isArray(candidate.customWords)) {
    throw new Error('不是受支持的学习进度备份');
  }
  const validTrack = (value: unknown) => value === 'primary' || value === 'middle';
  if (candidate.progress.length > 10000 || candidate.sessions.length > 20000 || candidate.customWords.length > 1000) throw new Error('备份记录过多');
  const belongs = (id: string, track: 'primary' | 'middle') =>
    id.startsWith(`custom-${track}-`) || lessonsByTrack[track].some(l => practiceWords(l).some(w => w.id === id));
  const validRating = (value: unknown) => value === 'again' || value === 'hard' || value === 'good' || value === 'easy';
  if (candidate.progress.some((item) =>
    !item || typeof item.itemId !== 'string' || !validTrack(item.track) ||
    !validRating(item.userRating) || !Number.isFinite(item.lastPracticed) ||
    !Number.isFinite(item.nextReviewDate) || !Number.isInteger(item.reviewStage) ||
    item.reviewStage < 0 || item.reviewStage > 7 ||
    !Number.isInteger(item.repetitions) || item.repetitions < 0)) {
    throw new Error('备份中的复习记录无效');
  }
  if (candidate.sessions.some((item) =>
    !item || typeof item.id !== 'string' || !validTrack(item.track) ||
    typeof item.lessonId !== 'string' || typeof item.date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
    (item.completedAt !== undefined && !Number.isFinite(item.completedAt)) ||
    !Array.isArray(item.reviewedItemIds) ||
    item.reviewedItemIds.some((id) => typeof id !== 'string'))) {
    throw new Error('备份中的课程记录无效');
  }
  if (candidate.customWords.some((item) =>
    !item || typeof item.id !== 'string' || !validTrack(item.track) ||
    item.category !== 'custom' || typeof item.word !== 'string' || !item.word.trim() ||
    typeof item.phonetic !== 'string' || typeof item.translation !== 'string' || !item.translation.trim() ||
    !Array.isArray(item.examples) || typeof item.examples[0]?.en !== 'string' ||
    typeof item.examples[0]?.zh !== 'string' ||
    item.examples.some((example) => example?.jyutping !== undefined && typeof example.jyutping !== 'string') ||
    (item.updatedAt !== undefined && !Number.isFinite(item.updatedAt)))) {
    throw new Error('备份中的自定义词条无效');
  }
  if (candidate.progress.some(x => !belongs(x.itemId, x.track)) ||
      candidate.sessions.some(x => !lessonsByTrack[x.track].some(l => l.id === x.lessonId) || x.reviewedItemIds.some(id => !belongs(id,x.track))) ||
      candidate.customWords.some(x => !x.id.startsWith(`custom-${x.track}-`))) {
    throw new Error('备份中含有不属于本应用或学段的内容');
  }
  return candidate as LearningBackup;
}

export async function importBackup(backup: LearningBackup): Promise<void> {
  // Merge by stable ID and timestamp; an older file cannot roll back newer study.
  const currentProgress = new Map((await allProgress()).map((item) => [item.itemId, item]));
  const currentSessions = new Map((await allSessions()).map((item) => [item.id, item]));
  const currentWords = new Map((await allCustomWords()).map((item) => [item.id, item]));
  for (const record of backup.progress) {
    if (record.lastPracticed > (currentProgress.get(record.itemId)?.lastPracticed ?? 0)) await saveProgress(record);
  }
  for (const session of backup.sessions) {
    if ((session.completedAt ?? 0) > (currentSessions.get(session.id)?.completedAt ?? 0)) await saveSession(session);
  }
  for (const word of backup.customWords) {
    const existing = currentWords.get(word.id);
    if (!existing || (word.updatedAt ?? 0) > (existing.updatedAt ?? 0)) await saveCustomWord(word);
  }
}

export function downloadBackup(backup: LearningBackup): { url: string; filename: string } {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filename = `daily-english-progress-${backup.exportedAt.slice(0, 10)}.json`;
  link.download = filename;
  link.click();
  return { url, filename };
}

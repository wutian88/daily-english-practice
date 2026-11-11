import type { PracticeRecord, Rating, TrackId } from '../types/wordbook';

const DAY = 24 * 60 * 60 * 1000;
const STAGE_DAYS = [0, 1, 2, 4, 7, 14, 30, 60] as const;

export function localDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function rateItem(
  itemId: string,
  track: TrackId,
  rating: Rating,
  previous?: PracticeRecord,
  now = Date.now(),
): PracticeRecord {
  const currentStage = previous?.reviewStage ?? 0;
  let reviewStage: number;
  let nextReviewDate: number;

  if (rating === 'again') {
    reviewStage = 0;
    nextReviewDate = now + 10 * 60 * 1000;
  } else if (rating === 'hard') {
    reviewStage = Math.max(1, currentStage);
    nextReviewDate = now + DAY;
  } else {
    reviewStage = Math.min(7, currentStage + (rating === 'easy' ? 2 : 1));
    nextReviewDate = now + STAGE_DAYS[reviewStage] * DAY;
  }

  return {
    itemId,
    track,
    userRating: rating,
    lastPracticed: now,
    nextReviewDate,
    reviewStage,
    repetitions: (previous?.repetitions ?? 0) + 1,
  };
}

export function dueRecords(records: PracticeRecord[], track: TrackId, now = Date.now()): PracticeRecord[] {
  return records
    .filter((record) => record.track === track && record.nextReviewDate <= now)
    .sort((a, b) => a.nextReviewDate - b.nextReviewDate);
}

export function selectNextLesson<T extends { id: string }>(
  lessons: T[],
  completedLessonIds: ReadonlySet<string>,
): T | undefined {
  return lessons.find((lesson) => !completedLessonIds.has(lesson.id));
}

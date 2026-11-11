import type { WordItem } from '../types/wordbook';

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

export function searchWords(words: WordItem[], input: string): WordItem[] {
  const query = normalize(input);
  if (!query) return words.slice(0, 24);
  const rank = (word: WordItem) => {
    const text = normalize(word.word);
    if (text === query) return 0;
    if (text.startsWith(query)) return 1;
    if (text.includes(query)) return 2;
    if ([word.translation, word.phonetic].some((value) => normalize(value).includes(query))) return 3;
    if (word.examples.some((example) => [example.en, example.zh, example.jyutping ?? ''].some((value) => normalize(value).includes(query)))) return 4;
    return 5;
  };
  return words.map((word) => ({ word, rank: rank(word) }))
    .filter((item) => item.rank < 5).sort((a, b) => a.rank - b.rank).map((item) => item.word);
}

export function selectVoice<T extends Pick<SpeechSynthesisVoice, 'lang' | 'localService'>>(voices: T[]): T | undefined {
 const english = voices.filter(v => /^en(?:-|_)/i.test(v.lang) || v.lang === 'en');
 return english.find(v => v.localService && /^en-US$/i.test(v.lang)) ?? english.find(v => v.localService) ?? english[0];
}

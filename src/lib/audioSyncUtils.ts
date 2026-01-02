/**
 * Utilities for synchronizing text highlighting with audio playback
 * Uses intelligent estimation based on word characteristics
 */

export interface WordTiming {
  word: string;
  index: number;
  startTime: number;
  endTime: number;
}

// Average speaking rate in characters per second (adjusted for Yorubá)
const BASE_CHARS_PER_SECOND = 12;

// Pause durations in seconds
const PAUSE_AFTER_COMMA = 0.3;
const PAUSE_AFTER_PERIOD = 0.5;
const PAUSE_AFTER_SEMICOLON = 0.4;
const PAUSE_AFTER_COLON = 0.3;
const PAUSE_AFTER_EXCLAMATION = 0.5;
const PAUSE_AFTER_QUESTION = 0.5;

// Minimum word duration
const MIN_WORD_DURATION = 0.15;

/**
 * Calculates the pause duration after a word based on trailing punctuation
 */
function getPauseDuration(word: string): number {
  const lastChar = word.slice(-1);
  
  switch (lastChar) {
    case '.':
      return PAUSE_AFTER_PERIOD;
    case ',':
      return PAUSE_AFTER_COMMA;
    case ';':
      return PAUSE_AFTER_SEMICOLON;
    case ':':
      return PAUSE_AFTER_COLON;
    case '!':
      return PAUSE_AFTER_EXCLAMATION;
    case '?':
      return PAUSE_AFTER_QUESTION;
    default:
      return 0.05; // Small natural pause between words
  }
}

/**
 * Estimates the speaking duration for a word based on its characteristics
 */
function estimateWordDuration(word: string): number {
  // Remove punctuation for character count
  const cleanWord = word.replace(/[.,;:!?'"()[\]{}]/g, '');
  
  // Base duration from character count
  let duration = cleanWord.length / BASE_CHARS_PER_SECOND;
  
  // Yorubá accented characters may take slightly longer
  const accentedChars = (cleanWord.match(/[àáèéìíòóùúẹọṣ]/gi) || []).length;
  duration += accentedChars * 0.02;
  
  // Ensure minimum duration
  return Math.max(duration, MIN_WORD_DURATION);
}

/**
 * Calculates timing information for each word in a text
 * Returns an array of WordTiming objects with estimated start/end times
 */
export function calculateWordTimings(text: string, totalDuration: number): WordTiming[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return [];
  
  // First pass: calculate raw durations
  const rawDurations = words.map(word => ({
    word,
    speakDuration: estimateWordDuration(word),
    pauseDuration: getPauseDuration(word)
  }));
  
  // Calculate total estimated duration
  const totalEstimated = rawDurations.reduce(
    (sum, item) => sum + item.speakDuration + item.pauseDuration,
    0
  );
  
  // Scale factor to match actual audio duration
  const scaleFactor = totalDuration / totalEstimated;
  
  // Second pass: generate timings with scaled durations
  const timings: WordTiming[] = [];
  let currentTime = 0;
  
  words.forEach((word, index) => {
    const scaledDuration = rawDurations[index].speakDuration * scaleFactor;
    const scaledPause = rawDurations[index].pauseDuration * scaleFactor;
    
    timings.push({
      word,
      index,
      startTime: currentTime,
      endTime: currentTime + scaledDuration
    });
    
    currentTime += scaledDuration + scaledPause;
  });
  
  return timings;
}

/**
 * Finds the word index that should be highlighted at a given time
 * Uses binary search for efficiency with long texts
 */
export function findWordAtTime(timings: WordTiming[], currentTime: number): number {
  if (timings.length === 0) return -1;
  if (currentTime < timings[0].startTime) return -1;
  if (currentTime >= timings[timings.length - 1].endTime) return timings.length - 1;
  
  // Binary search for the word
  let left = 0;
  let right = timings.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const timing = timings[mid];
    
    if (currentTime >= timing.startTime && currentTime < timing.endTime) {
      return mid;
    } else if (currentTime < timing.startTime) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  
  // If between words (in pause), return the previous word
  return Math.min(left, timings.length - 1);
}

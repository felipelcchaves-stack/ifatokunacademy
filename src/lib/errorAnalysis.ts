/**
 * Error Analysis Library
 * Analyzes text differences to categorize errors by type for pedagogical analysis
 */

import { normalizeText } from './textSimilarity';

export interface ErrorAnalysis {
  accentErrors: number;
  wordSwapErrors: number;
  omissionErrors: number;
  insertionErrors: number;
  otherErrors: number;
  details: ErrorDetail[];
}

export interface ErrorDetail {
  type: 'accent' | 'swap' | 'omission' | 'insertion' | 'other';
  original: string;
  typed: string;
  position: number;
}

/**
 * Tokenize text into words for comparison
 */
function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(w => w.length > 0);
}

/**
 * Check if two words differ only by accents/diacritics
 */
function isAccentDifference(word1: string, word2: string): boolean {
  const normalized1 = normalizeText(word1);
  const normalized2 = normalizeText(word2);
  return normalized1 === normalized2 && word1 !== word2;
}

/**
 * Check if words are anagrams or very similar (for swap detection)
 */
function areWordsSimilar(word1: string, word2: string): boolean {
  const n1 = normalizeText(word1);
  const n2 = normalizeText(word2);
  
  // Same normalized form
  if (n1 === n2) return true;
  
  // Check if characters are the same but rearranged (anagram)
  const sorted1 = n1.split('').sort().join('');
  const sorted2 = n2.split('').sort().join('');
  if (sorted1 === sorted2) return true;
  
  // Check Levenshtein distance for very similar words
  if (Math.abs(n1.length - n2.length) <= 1) {
    let diffs = 0;
    const maxLen = Math.max(n1.length, n2.length);
    for (let i = 0; i < maxLen; i++) {
      if (n1[i] !== n2[i]) diffs++;
    }
    return diffs <= 1;
  }
  
  return false;
}

/**
 * Analyze errors between original and typed text
 */
export function analyzeErrors(original: string, typed: string): ErrorAnalysis {
  const originalWords = tokenize(original);
  const typedWords = tokenize(typed);
  
  const errors: ErrorDetail[] = [];
  let accentErrors = 0;
  let wordSwapErrors = 0;
  let omissionErrors = 0;
  let insertionErrors = 0;
  let otherErrors = 0;
  
  // Use LCS-like approach to find the best alignment
  const alignment = alignWords(originalWords, typedWords);
  
  alignment.forEach((pair, index) => {
    if (pair.original && pair.typed) {
      // Both words exist - check for differences
      if (pair.original !== pair.typed) {
        if (isAccentDifference(pair.original, pair.typed)) {
          accentErrors++;
          errors.push({
            type: 'accent',
            original: pair.original,
            typed: pair.typed,
            position: index
          });
        } else if (areWordsSimilar(pair.original, pair.typed)) {
          // Similar but not exact - could be typo or minor swap
          otherErrors++;
          errors.push({
            type: 'other',
            original: pair.original,
            typed: pair.typed,
            position: index
          });
        } else {
          // Check if it's a word swap (word exists elsewhere)
          const typedIndex = originalWords.findIndex(w => 
            normalizeText(w) === normalizeText(pair.typed)
          );
          const originalIndex = typedWords.findIndex(w => 
            normalizeText(w) === normalizeText(pair.original)
          );
          
          if (typedIndex !== -1 && originalIndex !== -1) {
            wordSwapErrors++;
            errors.push({
              type: 'swap',
              original: pair.original,
              typed: pair.typed,
              position: index
            });
          } else {
            otherErrors++;
            errors.push({
              type: 'other',
              original: pair.original,
              typed: pair.typed,
              position: index
            });
          }
        }
      }
    } else if (pair.original && !pair.typed) {
      // Word was omitted
      omissionErrors++;
      errors.push({
        type: 'omission',
        original: pair.original,
        typed: '',
        position: index
      });
    } else if (!pair.original && pair.typed) {
      // Word was inserted
      insertionErrors++;
      errors.push({
        type: 'insertion',
        original: '',
        typed: pair.typed,
        position: index
      });
    }
  });
  
  return {
    accentErrors,
    wordSwapErrors,
    omissionErrors,
    insertionErrors,
    otherErrors,
    details: errors
  };
}

interface AlignmentPair {
  original: string | null;
  typed: string | null;
}

/**
 * Align words using a simple LCS-based approach
 */
function alignWords(original: string[], typed: string[]): AlignmentPair[] {
  const result: AlignmentPair[] = [];
  let i = 0;
  let j = 0;
  
  while (i < original.length || j < typed.length) {
    if (i >= original.length) {
      // Remaining typed words are insertions
      result.push({ original: null, typed: typed[j] });
      j++;
    } else if (j >= typed.length) {
      // Remaining original words are omissions
      result.push({ original: original[i], typed: null });
      i++;
    } else if (normalizeText(original[i]) === normalizeText(typed[j])) {
      // Words match (possibly with accent differences)
      result.push({ original: original[i], typed: typed[j] });
      i++;
      j++;
    } else {
      // Look ahead to find best match
      const lookAhead = 3;
      let foundMatch = false;
      
      // Check if current typed word appears later in original
      for (let k = 1; k <= lookAhead && i + k < original.length; k++) {
        if (normalizeText(original[i + k]) === normalizeText(typed[j])) {
          // Omissions before the match
          for (let m = 0; m < k; m++) {
            result.push({ original: original[i + m], typed: null });
          }
          i += k;
          foundMatch = true;
          break;
        }
      }
      
      if (!foundMatch) {
        // Check if current original word appears later in typed
        for (let k = 1; k <= lookAhead && j + k < typed.length; k++) {
          if (normalizeText(typed[j + k]) === normalizeText(original[i])) {
            // Insertions before the match
            for (let m = 0; m < k; m++) {
              result.push({ original: null, typed: typed[j + m] });
            }
            j += k;
            foundMatch = true;
            break;
          }
        }
      }
      
      if (!foundMatch) {
        // No match found - treat as substitution
        result.push({ original: original[i], typed: typed[j] });
        i++;
        j++;
      }
    }
  }
  
  return result;
}

/**
 * Get summary statistics label for error type
 */
export function getErrorTypeLabel(type: keyof Omit<ErrorAnalysis, 'details'>): string {
  const labels: Record<string, string> = {
    accentErrors: 'Acentuação',
    wordSwapErrors: 'Palavras Trocadas',
    omissionErrors: 'Omissões',
    insertionErrors: 'Inserções',
    otherErrors: 'Outros'
  };
  return labels[type] || type;
}

/**
 * Get color for error type
 */
export function getErrorTypeColor(type: string): string {
  const colors: Record<string, string> = {
    accent: 'hsl(var(--chart-1))',
    accentErrors: 'hsl(var(--chart-1))',
    swap: 'hsl(var(--chart-2))',
    wordSwapErrors: 'hsl(var(--chart-2))',
    omission: 'hsl(var(--chart-3))',
    omissionErrors: 'hsl(var(--chart-3))',
    insertion: 'hsl(var(--chart-4))',
    insertionErrors: 'hsl(var(--chart-4))',
    other: 'hsl(var(--chart-5))',
    otherErrors: 'hsl(var(--chart-5))'
  };
  return colors[type] || 'hsl(var(--muted))';
}

/**
 * Get emoji for error type
 */
export function getErrorTypeEmoji(type: string): string {
  const emojis: Record<string, string> = {
    accent: '🔤',
    accentErrors: '🔤',
    swap: '🔀',
    wordSwapErrors: '🔀',
    omission: '➖',
    omissionErrors: '➖',
    insertion: '➕',
    insertionErrors: '➕',
    other: '❓',
    otherErrors: '❓'
  };
  return emojis[type] || '📝';
}

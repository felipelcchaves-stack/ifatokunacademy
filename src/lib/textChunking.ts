/**
 * Utilitários para fragmentação e scaffolding de textos longos
 * Baseado em técnicas de neurociência: Chunking, Scaffolding, Chaining
 */

export interface TextChunk {
  id: number;
  text: string;
  words: string[];
  startIndex: number;
  endIndex: number;
}

export interface ScaffoldLevel {
  level: number;
  visiblePercent: number;
  visibleText: string;
  hiddenText: string;
  hint: string;
}

export interface FirstLetterHint {
  original: string;
  hint: string; // Ex: "O___ a___ f___"
}

/**
 * Divide texto em chunks respeitando pontuação e sentido
 * @param text Texto completo
 * @param targetChunkSize Tamanho alvo de cada chunk em palavras (5-10)
 */
export function splitIntoChunks(text: string, targetChunkSize: number = 7): TextChunk[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const chunks: TextChunk[] = [];
  
  if (words.length <= targetChunkSize) {
    return [{
      id: 0,
      text: text.trim(),
      words,
      startIndex: 0,
      endIndex: words.length - 1
    }];
  }

  let currentChunk: string[] = [];
  let chunkStartIndex = 0;
  let chunkId = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentChunk.push(word);

    // Verifica se é um bom ponto de quebra
    const isEndPunctuation = /[.!?;:]$/.test(word);
    const isComma = /[,]$/.test(word);
    const reachedTarget = currentChunk.length >= targetChunkSize;
    const isNearEnd = i >= words.length - 3;

    // Quebra no final de frase, ou quando atingir o target com vírgula, ou quando forçado
    const shouldBreak = 
      (isEndPunctuation && currentChunk.length >= 3) ||
      (reachedTarget && (isComma || isEndPunctuation)) ||
      (currentChunk.length >= targetChunkSize + 3) ||
      isNearEnd;

    if (shouldBreak && currentChunk.length > 0) {
      chunks.push({
        id: chunkId++,
        text: currentChunk.join(' '),
        words: [...currentChunk],
        startIndex: chunkStartIndex,
        endIndex: i
      });
      currentChunk = [];
      chunkStartIndex = i + 1;
    }
  }

  // Adiciona chunk restante
  if (currentChunk.length > 0) {
    chunks.push({
      id: chunkId,
      text: currentChunk.join(' '),
      words: currentChunk,
      startIndex: chunkStartIndex,
      endIndex: words.length - 1
    });
  }

  return chunks;
}

/**
 * Gera níveis progressivos de scaffolding
 * Nível 1: 80% visível, 20% oculto
 * Nível 5: 0% visível, 100% oculto
 */
export function generateScaffoldLevels(text: string): ScaffoldLevel[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const levels: ScaffoldLevel[] = [];
  const percentages = [80, 60, 40, 20, 0];

  percentages.forEach((visiblePercent, index) => {
    const visibleCount = Math.ceil(words.length * (visiblePercent / 100));
    const visibleWords = words.slice(0, visibleCount);
    const hiddenWords = words.slice(visibleCount);

    levels.push({
      level: index + 1,
      visiblePercent,
      visibleText: visibleWords.join(' '),
      hiddenText: hiddenWords.join(' '),
      hint: generatePartialHint(hiddenWords)
    });
  });

  return levels;
}

/**
 * Gera dica com primeira letra de cada palavra
 */
function generatePartialHint(words: string[]): string {
  return words.map(word => {
    if (word.length <= 1) return word;
    const firstChar = word[0];
    const lastChar = /[.,!?;:]/.test(word[word.length - 1]) ? word[word.length - 1] : '';
    return firstChar + '_'.repeat(Math.min(word.length - 1 - lastChar.length, 5)) + lastChar;
  }).join(' ');
}

/**
 * Gera dica de primeira letra para todo o texto
 */
export function generateFirstLetterHints(text: string): FirstLetterHint {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const hint = words.map(word => {
    if (word.length <= 1) return word;
    const firstChar = word[0];
    const punctuation = word.match(/[.,!?;:]+$/)?.[0] || '';
    const underscores = '_'.repeat(Math.min(word.length - 1 - punctuation.length, 4));
    return firstChar + underscores + punctuation;
  }).join(' ');

  return { original: text, hint };
}

/**
 * Extrai palavras-chave do texto (substantivos, verbos principais)
 */
export function extractKeywords(text: string, count: number = 3): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  // Remove pontuação para comparação
  const cleanWords = words.map(w => w.replace(/[.,!?;:]/g, '').toLowerCase());
  
  // Palavras funcionais comuns em português/yorubá a ignorar
  const stopWords = new Set([
    'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos',
    'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem',
    'e', 'ou', 'mas', 'que', 'se', 'como', 'quando', 'onde',
    'é', 'são', 'foi', 'era', 'será', 'está', 'estão',
    'ni', 'ti', 'si', 'ati', 'pelu', 'fun', 'lati'
  ]);

  // Filtra palavras significativas (mais longas, não são stop words)
  const significantWords = cleanWords
    .map((w, i) => ({ word: w, original: words[i], index: i }))
    .filter(({ word }) => word.length >= 4 && !stopWords.has(word));

  // Retorna as primeiras N palavras significativas
  return significantWords
    .slice(0, count)
    .map(({ original }) => original);
}

/**
 * Calcula dificuldade do texto baseado em métricas
 */
export function calculateTextDifficulty(text: string): {
  level: 'easy' | 'medium' | 'hard' | 'very_hard';
  wordCount: number;
  avgWordLength: number;
  hasYorubaCharacters: boolean;
  recommendedMode: 'scaffold' | 'chunk' | 'chain';
} {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / wordCount;
  
  // Detecta caracteres Yorubá especiais
  const yorubaPattern = /[ẹọṣẸỌṢ]/;
  const hasYorubaCharacters = yorubaPattern.test(text);

  let level: 'easy' | 'medium' | 'hard' | 'very_hard';
  let recommendedMode: 'scaffold' | 'chunk' | 'chain';

  if (wordCount <= 20) {
    level = 'easy';
    recommendedMode = 'scaffold';
  } else if (wordCount <= 50) {
    level = 'medium';
    recommendedMode = 'scaffold';
  } else if (wordCount <= 100) {
    level = 'hard';
    recommendedMode = 'chunk';
  } else {
    level = 'very_hard';
    recommendedMode = 'chain';
  }

  return {
    level,
    wordCount,
    avgWordLength,
    hasYorubaCharacters,
    recommendedMode
  };
}

/**
 * Gera sequência de encadeamento para memorização progressiva
 * chunk1 → chunk2 → chunk1+2 → chunk3 → chunk1+2+3...
 */
export function generateChainSequence(chunks: TextChunk[]): {
  step: number;
  chunksToMemorize: TextChunk[];
  isReview: boolean;
  description: string;
}[] {
  const sequence: {
    step: number;
    chunksToMemorize: TextChunk[];
    isReview: boolean;
    description: string;
  }[] = [];

  let step = 1;

  for (let i = 0; i < chunks.length; i++) {
    // Primeiro, memoriza o chunk individual
    sequence.push({
      step: step++,
      chunksToMemorize: [chunks[i]],
      isReview: false,
      description: `Memorize o trecho ${i + 1}`
    });

    // Se não é o primeiro, faz revisão encadeada
    if (i > 0) {
      sequence.push({
        step: step++,
        chunksToMemorize: chunks.slice(0, i + 1),
        isReview: true,
        description: `Recite do início até o trecho ${i + 1}`
      });
    }
  }

  // Revisão final completa
  if (chunks.length > 1) {
    sequence.push({
      step: step,
      chunksToMemorize: chunks,
      isReview: true,
      description: 'Recite o texto completo'
    });
  }

  return sequence;
}

/**
 * Combina chunks em texto único
 */
export function combineChunks(chunks: TextChunk[]): string {
  return chunks.map(c => c.text).join(' ');
}

/**
 * Calcula a distância de Levenshtein entre duas strings
 * (número mínimo de edições para transformar uma string em outra)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Criar matriz de distâncias
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Inicializar primeira coluna e linha
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Preencher matriz
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // Deleção
          dp[i][j - 1] + 1,     // Inserção
          dp[i - 1][j - 1] + 1  // Substituição
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Normaliza texto para comparação:
 * - Remove acentos/diacríticos
 * - Converte para minúsculas
 * - Mapeia caracteres Yorubá especiais (ẹ, ọ, ṣ) para equivalentes base
 * - Remove pontuação (preservando letras Unicode)
 * - Remove espaços extras
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos combinantes
    .replace(/[\u1E00-\u1EFF]/g, (char) => {
      // Mapeia caracteres Yorubá especiais (subdot) para equivalentes base
      const yorubaMap: Record<string, string> = {
        'ẹ': 'e', 'ọ': 'o', 'ṣ': 's',
        'Ẹ': 'e', 'Ọ': 'o', 'Ṣ': 's',
      };
      return yorubaMap[char] || char;
    })
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Remove apenas pontuação, preserva letras Unicode
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula a similaridade percentual entre duas strings (0-100)
 */
export function calculateSimilarity(original: string, typed: string): number {
  const normalizedOriginal = normalizeText(original);
  const normalizedTyped = normalizeText(typed);

  if (normalizedOriginal === normalizedTyped) return 100;
  if (normalizedTyped.length === 0) return 0;

  const distance = levenshteinDistance(normalizedOriginal, normalizedTyped);
  const maxLength = Math.max(normalizedOriginal.length, normalizedTyped.length);
  
  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.max(0, Math.round(similarity));
}

/**
 * Calcula threshold dinâmico baseado no tamanho do texto
 * Textos curtos têm threshold menor pois um erro tem mais impacto
 */
export function getDynamicThreshold(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  if (wordCount <= 5) return 65;      // Textos muito curtos: 65%
  if (wordCount <= 10) return 70;     // Textos curtos: 70%
  if (wordCount <= 20) return 75;     // Textos médios: 75%
  return 80;                          // Textos longos: 80%
}

/**
 * Verifica se a diferença entre textos é apenas de acentuação
 * Retorna true se textos são iguais ignorando acentos
 */
export function isOnlyAccentDifference(original: string, typed: string): boolean {
  const normalizedOriginal = normalizeText(original);
  const normalizedTyped = normalizeText(typed);
  return normalizedOriginal === normalizedTyped;
}

/**
 * Retorna feedback graduado baseado na similaridade
 */
export type SimilarityFeedback = {
  level: 'perfect' | 'excellent' | 'good' | 'close' | 'needs_review';
  label: string;
  emoji: string;
  color: string;
  allowSecondChance: boolean;
};

export function getSimilarityFeedback(similarity: number, threshold: number): SimilarityFeedback {
  if (similarity >= 95) {
    return { level: 'perfect', label: 'Perfeito!', emoji: '🎯', color: 'text-green-600', allowSecondChance: false };
  }
  if (similarity >= 85) {
    return { level: 'excellent', label: 'Excelente!', emoji: '✨', color: 'text-green-500', allowSecondChance: false };
  }
  if (similarity >= threshold) {
    return { level: 'good', label: 'Muito bom!', emoji: '👍', color: 'text-blue-500', allowSecondChance: false };
  }
  if (similarity >= threshold - 15) {
    return { level: 'close', label: 'Quase! Você está perto.', emoji: '💪', color: 'text-yellow-600', allowSecondChance: true };
  }
  return { level: 'needs_review', label: 'Precisa revisar', emoji: '📚', color: 'text-orange-500', allowSecondChance: false };
}

/**
 * Calcula similaridade com análise detalhada
 */
export interface DetailedSimilarity {
  similarity: number;
  isOnlyAccentError: boolean;
  dynamicThreshold: number;
  feedback: SimilarityFeedback;
  isCorrect: boolean;
}

export function calculateDetailedSimilarity(original: string, typed: string, baseThresholdModifier: number = 0): DetailedSimilarity {
  const similarity = calculateSimilarity(original, typed);
  const isOnlyAccentError = similarity < 100 && isOnlyAccentDifference(original, typed);
  const dynamicThreshold = Math.max(50, getDynamicThreshold(original) - baseThresholdModifier);
  
  // Se for apenas erro de acento, considera correto com feedback específico
  const effectiveSimilarity = isOnlyAccentError ? 100 : similarity;
  const isCorrect = effectiveSimilarity >= dynamicThreshold;
  const feedback = getSimilarityFeedback(effectiveSimilarity, dynamicThreshold);
  
  return {
    similarity: effectiveSimilarity,
    isOnlyAccentError,
    dynamicThreshold,
    feedback,
    isCorrect,
  };
}

/**
 * Extrai o restante do texto após as primeiras N palavras
 */
export function getTextRemainder(text: string, startWordCount: number = 3): string {
  const words = text.split(/\s+/);
  if (words.length <= startWordCount) return '';
  return words.slice(startWordCount).join(' ');
}

/**
 * Extrai as primeiras N palavras do texto
 */
export function getTextStart(text: string, wordCount: number = 3): string {
  const words = text.split(/\s+/);
  if (words.length <= wordCount) return text;
  return words.slice(0, wordCount).join(' ') + '...';
}

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
 * - Remove acentos
 * - Converte para minúsculas
 * - Remove pontuação
 * - Remove espaços extras
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .replace(/\s+/g, ' ') // Normaliza espaços
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

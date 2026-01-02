/**
 * Audio format utilities for cross-browser compatibility
 * Safari doesn't support webm/opus, so we need to detect and use mp4 when necessary
 */

export interface AudioFormat {
  mimeType: string;
  extension: string;
  contentType: string;
}

// Ordered by preference - webm is better quality but Safari needs mp4
const RECORDING_FORMATS: AudioFormat[] = [
  { mimeType: 'audio/webm;codecs=opus', extension: 'webm', contentType: 'audio/webm' },
  { mimeType: 'audio/webm', extension: 'webm', contentType: 'audio/webm' },
  { mimeType: 'audio/mp4', extension: 'mp4', contentType: 'audio/mp4' },
  { mimeType: 'audio/aac', extension: 'aac', contentType: 'audio/aac' },
  { mimeType: 'audio/mpeg', extension: 'mp3', contentType: 'audio/mpeg' },
];

/**
 * Detect the best recording format supported by the current browser
 * Safari will typically get mp4, Chrome/Firefox will get webm
 */
export function getBestRecordingFormat(): AudioFormat {
  if (typeof MediaRecorder === 'undefined') {
    console.warn('MediaRecorder not supported');
    return RECORDING_FORMATS[0]; // Fallback
  }

  for (const format of RECORDING_FORMATS) {
    if (MediaRecorder.isTypeSupported(format.mimeType)) {
      console.log(`Using audio format: ${format.mimeType}`);
      return format;
    }
  }

  // Fallback - let browser choose
  console.warn('No preferred format supported, using browser default');
  return { mimeType: '', extension: 'webm', contentType: 'audio/webm' };
}

/**
 * Check if the browser can play a specific audio format
 */
export function canPlayAudioFormat(mimeType: string): boolean {
  const audio = document.createElement('audio');
  return audio.canPlayType(mimeType) !== '';
}

/**
 * Check if a URL is likely playable based on extension
 * Safari can't play .webm files
 */
export function isAudioUrlPlayable(url: string): boolean {
  const extension = url.split('.').pop()?.toLowerCase();
  
  if (extension === 'webm') {
    return canPlayAudioFormat('audio/webm');
  }
  if (extension === 'mp4' || extension === 'm4a') {
    return canPlayAudioFormat('audio/mp4');
  }
  if (extension === 'mp3') {
    return canPlayAudioFormat('audio/mpeg');
  }
  
  // Unknown format - try anyway
  return true;
}

/**
 * Get a user-friendly message about format incompatibility
 */
export function getFormatCompatibilityMessage(url: string): string | null {
  if (isAudioUrlPlayable(url)) {
    return null;
  }
  
  const extension = url.split('.').pop()?.toLowerCase();
  
  if (extension === 'webm') {
    return 'Este áudio foi gravado em um formato (WebM) não suportado pelo Safari. Grave novamente neste navegador ou use Chrome/Edge.';
  }
  
  return 'Este formato de áudio não é suportado pelo seu navegador. Tente gravar novamente.';
}

/**
 * Check if current browser is Safari
 */
export function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

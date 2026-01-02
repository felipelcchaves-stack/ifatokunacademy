import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ColorCodedTextProps {
  text: string;
  mode: 'syllable' | 'word' | 'line';
  className?: string;
  style?: React.CSSProperties;
}

// Colors optimized for dyslexia and focus - high contrast, distinguishable
const LINE_COLORS = [
  'text-foreground',
  'text-primary',
  'text-foreground',
  'text-secondary-foreground',
];

const WORD_COLORS = [
  'text-foreground',
  'text-primary',
];

// Split text into syllables (simplified for Portuguese/Yoruba)
function splitSyllables(word: string): string[] {
  // Basic syllable splitting - vowels are syllable centers
  const vowels = /[aeiouáéíóúàèìòùâêîôûãõẹọ]/i;
  const syllables: string[] = [];
  let current = '';
  
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    current += char;
    
    // If current char is a vowel and next char is a consonant followed by a vowel, split
    if (vowels.test(char)) {
      const nextChar = word[i + 1];
      const afterNext = word[i + 2];
      
      if (nextChar && !vowels.test(nextChar)) {
        if (afterNext && vowels.test(afterNext)) {
          syllables.push(current);
          current = '';
        }
      } else if (!nextChar) {
        // End of word
        syllables.push(current);
        current = '';
      }
    }
  }
  
  if (current) {
    syllables.push(current);
  }
  
  return syllables.length > 0 ? syllables : [word];
}

const ColorCodedText: React.FC<ColorCodedTextProps> = ({ 
  text, 
  mode = 'word',
  className,
  style 
}) => {
  const renderedContent = useMemo(() => {
    if (mode === 'line') {
      const lines = text.split('\n');
      return lines.map((line, lineIndex) => (
        <span 
          key={lineIndex}
          className={cn(LINE_COLORS[lineIndex % LINE_COLORS.length], 'block')}
        >
          {line}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      ));
    }

    if (mode === 'word') {
      const words = text.split(/(\s+)/);
      let wordIndex = 0;
      
      return words.map((segment, i) => {
        if (/^\s+$/.test(segment)) {
          return <span key={i}>{segment}</span>;
        }
        
        const color = WORD_COLORS[wordIndex % WORD_COLORS.length];
        wordIndex++;
        
        return (
          <span key={i} className={color}>
            {segment}
          </span>
        );
      });
    }

    if (mode === 'syllable') {
      const words = text.split(/(\s+)/);
      let syllableIndex = 0;
      
      return words.map((word, wordIdx) => {
        if (/^\s+$/.test(word)) {
          return <span key={wordIdx}>{word}</span>;
        }
        
        const syllables = splitSyllables(word);
        
        return (
          <span key={wordIdx}>
            {syllables.map((syllable, sylIdx) => {
              const color = WORD_COLORS[syllableIndex % WORD_COLORS.length];
              syllableIndex++;
              
              return (
                <span key={`${wordIdx}-${sylIdx}`} className={color}>
                  {syllable}
                </span>
              );
            })}
          </span>
        );
      });
    }

    return text;
  }, [text, mode]);

  return (
    <div className={cn('font-serif', className)} style={style}>
      {renderedContent}
    </div>
  );
};

export default ColorCodedText;

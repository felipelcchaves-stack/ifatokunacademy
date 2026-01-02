import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Reading Mode Animation - Words highlighting in sequence
export const ReadingAnimation = () => {
  const words = ['Òrúnmìlà', 'ní', 'ó', 'di', 'àgbà'];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % words.length);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-wrap gap-2 justify-center items-center p-4">
      {words.map((word, i) => (
        <motion.span
          key={i}
          animate={{
            backgroundColor: i === activeIndex ? 'hsl(217, 91%, 60%)' : 'transparent',
            color: i === activeIndex ? 'white' : 'hsl(var(--foreground))',
            scale: i === activeIndex ? 1.1 : 1,
          }}
          transition={{ duration: 0.2 }}
          className="px-2 py-1 rounded font-medium"
        >
          {word}
        </motion.span>
      ))}
      <motion.div 
        className="ml-2 w-4 h-4 rounded-full bg-green-500"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      />
    </div>
  );
};

// Hints Mode Animation - Words fading out progressively
export const HintsAnimation = () => {
  const words = ['A', 'sabedoria', 'dos', 'anciãos', 'guia'];
  const [hiddenCount, setHiddenCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHiddenCount((prev) => (prev + 1) % (words.length + 2));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-wrap gap-2 justify-center items-center p-4">
      {words.map((word, i) => (
        <motion.span
          key={i}
          animate={{
            opacity: i < hiddenCount ? 0.2 : 1,
            filter: i < hiddenCount ? 'blur(4px)' : 'blur(0px)',
          }}
          transition={{ duration: 0.3 }}
          className="px-2 py-1 bg-purple-100 rounded font-medium text-purple-800"
        >
          {i < hiddenCount ? '___' : word}
        </motion.span>
      ))}
    </div>
  );
};

// Flashcard Animation - Card flipping
export const FlashcardAnimation = () => {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlipped((prev) => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="perspective-1000 h-24 w-40 mx-auto">
      <motion.div
        className="relative w-full h-full"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
          style={{ backfaceVisibility: 'hidden' }}
        >
          Àṣẹ?
        </div>
        {/* Back */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-800 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          Poder! ✓
        </div>
      </motion.div>
    </div>
  );
};

// Typing Animation - Simulated typing
export const TypingAnimation = () => {
  const text = 'Òrúnmìlà';
  const [typed, setTyped] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    let index = 0;
    const typeInterval = setInterval(() => {
      if (index <= text.length) {
        setTyped(text.slice(0, index));
        index++;
      } else {
        index = 0;
        setTyped('');
      }
    }, 300);

    const cursorInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);

    return () => {
      clearInterval(typeInterval);
      clearInterval(cursorInterval);
    };
  }, []);

  return (
    <div className="p-4 bg-orange-50 rounded-lg">
      <div className="font-mono text-lg text-orange-800">
        {typed}
        <span className={`${cursorVisible ? 'opacity-100' : 'opacity-0'} transition-opacity`}>|</span>
      </div>
      <div className="text-xs text-orange-600 mt-2">Digitando...</div>
    </div>
  );
};

// Microlearning Animation - Chunks appearing
export const MicrolearningAnimation = () => {
  const chunks = ['Chunk 1', 'Chunk 2', 'Chunk 3'];
  const [activeChunk, setActiveChunk] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveChunk((prev) => (prev + 1) % chunks.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-2 p-4">
      {chunks.map((chunk, i) => (
        <motion.div
          key={i}
          animate={{
            opacity: i === activeChunk ? 1 : 0.3,
            scale: i === activeChunk ? 1 : 0.95,
            x: i === activeChunk ? 0 : -10,
          }}
          transition={{ duration: 0.3 }}
          className={`p-2 rounded-lg text-sm ${
            i === activeChunk 
              ? 'bg-yellow-100 border-2 border-yellow-400 text-yellow-800' 
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${i === activeChunk ? 'bg-yellow-500' : 'bg-gray-300'}`} />
            {chunk}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Tap Complete Animation - Words being tapped
export const TapCompleteAnimation = () => {
  const words = ['anciãos', 'dos', 'sabedoria', 'A'];
  const orderedWords = ['A', 'sabedoria', 'dos', 'anciãos'];
  const [selected, setSelected] = useState<string[]>([]);
  const [available, setAvailable] = useState(words);

  useEffect(() => {
    const interval = setInterval(() => {
      if (selected.length < orderedWords.length) {
        const nextWord = orderedWords[selected.length];
        setSelected((prev) => [...prev, nextWord]);
        setAvailable((prev) => prev.filter((w) => w !== nextWord));
      } else {
        setSelected([]);
        setAvailable(words);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [selected.length]);

  return (
    <div className="space-y-3 p-4">
      {/* Selected area */}
      <div className="flex gap-1 min-h-8 p-2 bg-pink-50 rounded-lg border-2 border-dashed border-pink-200">
        <AnimatePresence>
          {selected.map((word, i) => (
            <motion.span
              key={word}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-2 py-1 bg-pink-500 text-white rounded text-sm font-medium"
            >
              {word}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      {/* Available words */}
      <div className="flex gap-1 flex-wrap">
        {available.map((word) => (
          <motion.span
            key={word}
            layout
            className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-sm font-medium cursor-pointer hover:bg-pink-200"
          >
            {word}
          </motion.span>
        ))}
      </div>
    </div>
  );
};

// Karaoke Animation - Words appearing with glow
export const KaraokeAnimation = () => {
  const words = ['Ifá', 'sọ', 'fún', 'wa'];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleWords, setVisibleWords] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setVisibleWords((prev) => [...prev, currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      } else {
        setCurrentIndex(0);
        setVisibleWords([]);
      }
    }, 700);
    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <div className="p-4 bg-gradient-to-br from-indigo-900 to-violet-900 rounded-lg">
      <div className="flex gap-2 justify-center items-center min-h-12">
        {words.map((word, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: visibleWords.includes(i) ? 1 : 0,
              y: visibleWords.includes(i) ? 0 : 10,
              textShadow: i === currentIndex - 1 
                ? '0 0 20px rgba(255,255,255,0.8)' 
                : '0 0 0px transparent',
            }}
            transition={{ duration: 0.3 }}
            className={`text-lg font-bold ${
              i === currentIndex - 1 ? 'text-white' : 'text-indigo-200'
            }`}
          >
            {word}
          </motion.span>
        ))}
      </div>
      {/* Audio wave visualization */}
      <div className="flex gap-1 justify-center mt-3">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              height: [8, 20, 8],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              delay: i * 0.1,
            }}
            className="w-1 bg-indigo-400 rounded-full"
          />
        ))}
      </div>
    </div>
  );
};

// Visual Builder Animation - Blocks connecting
export const VisualBuilderAnimation = () => {
  const blocks = [
    { id: 1, text: 'Àgbà', color: 'bg-teal-400' },
    { id: 2, text: 'kì í', color: 'bg-cyan-400' },
    { id: 3, text: 'wà', color: 'bg-emerald-400' },
  ];
  const [orderedBlocks, setOrderedBlocks] = useState<typeof blocks>([]);
  const [available, setAvailable] = useState(blocks);

  useEffect(() => {
    const interval = setInterval(() => {
      if (orderedBlocks.length < blocks.length) {
        const nextBlock = blocks[orderedBlocks.length];
        setOrderedBlocks((prev) => [...prev, nextBlock]);
        setAvailable((prev) => prev.filter((b) => b.id !== nextBlock.id));
      } else {
        setOrderedBlocks([]);
        setAvailable(blocks);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [orderedBlocks.length]);

  return (
    <div className="space-y-3 p-4">
      {/* Build area */}
      <div className="flex gap-1 min-h-12 p-2 bg-teal-50 rounded-lg border-2 border-dashed border-teal-300 items-center justify-center">
        <AnimatePresence>
          {orderedBlocks.map((block, i) => (
            <React.Fragment key={block.id}>
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                className={`px-3 py-2 ${block.color} text-white rounded-lg font-bold shadow-lg`}
              >
                {block.text}
              </motion.div>
              {i < orderedBlocks.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  className="w-4 h-1 bg-teal-500 rounded"
                />
              )}
            </React.Fragment>
          ))}
        </AnimatePresence>
      </div>
      {/* Available blocks */}
      <div className="flex gap-2 justify-center">
        {available.map((block) => (
          <motion.div
            key={block.id}
            layout
            className={`px-3 py-2 ${block.color} text-white rounded-lg font-bold opacity-60`}
          >
            {block.text}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Listen Repeat Animation - Audio waves and recording
export const ListenRepeatAnimation = () => {
  const [phase, setPhase] = useState<'listen' | 'record' | 'compare'>('listen');

  useEffect(() => {
    const phases: Array<'listen' | 'record' | 'compare'> = ['listen', 'record', 'compare'];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % phases.length;
      setPhase(phases[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 space-y-3">
      {/* Phase indicator */}
      <div className="flex gap-2 justify-center">
        {['listen', 'record', 'compare'].map((p) => (
          <div
            key={p}
            className={`px-2 py-1 rounded text-xs font-medium ${
              phase === p 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {p === 'listen' && '🎧 Ouvir'}
            {p === 'record' && '🎤 Gravar'}
            {p === 'compare' && '📊 Comparar'}
          </div>
        ))}
      </div>
      
      {/* Visualization */}
      <div className="flex gap-4 justify-center items-end h-16">
        {/* Original audio */}
        <div className="space-y-1">
          <div className="text-xs text-center text-gray-500">Original</div>
          <div className="flex gap-0.5">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  height: phase === 'listen' || phase === 'compare' 
                    ? [8, 24, 16, 20, 8] 
                    : 8,
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
                className="w-1 bg-blue-500 rounded-full"
              />
            ))}
          </div>
        </div>
        
        {/* User recording */}
        <div className="space-y-1">
          <div className="text-xs text-center text-gray-500">Você</div>
          <div className="flex gap-0.5">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  height: phase === 'record' || phase === 'compare' 
                    ? [8, 20, 12, 18, 8] 
                    : 8,
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
                className="w-1 bg-red-500 rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Export all animations as a map
export const modeAnimations: Record<string, React.FC> = {
  reading: ReadingAnimation,
  hints: HintsAnimation,
  flashcards: FlashcardAnimation,
  typing: TypingAnimation,
  microlearning: MicrolearningAnimation,
  tapComplete: TapCompleteAnimation,
  karaoke: KaraokeAnimation,
  visualBuilder: VisualBuilderAnimation,
  listenRepeat: ListenRepeatAnimation,
};

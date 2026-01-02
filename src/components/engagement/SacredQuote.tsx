import React, { useState, useEffect } from 'react';
import { getRandomProverb, YorubaProverb } from '@/data/yorubaProverbs';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface SacredQuoteProps {
  context?: YorubaProverb['context'];
  className?: string;
}

export const SacredQuote: React.FC<SacredQuoteProps> = ({ 
  context = 'greeting',
  className 
}) => {
  const [proverb, setProverb] = useState<YorubaProverb | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Get a random proverb on mount
    const randomProverb = getRandomProverb(context);
    setProverb(randomProverb);
    
    // Trigger fade-in animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [context]);

  if (!proverb) return null;

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl p-6",
        "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
        "border border-primary/20",
        "transition-all duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
    >
      {/* Decorative elements */}
      <div className="absolute top-2 right-2 opacity-20">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <div className="absolute bottom-2 left-2 opacity-10">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>

      {/* Quote content */}
      <div className="relative z-10">
        <p className="text-lg md:text-xl font-serif italic text-primary mb-2 leading-relaxed">
          "{proverb.yoruba}"
        </p>
        <p className="text-sm md:text-base text-muted-foreground">
          {proverb.portuguese}
        </p>
      </div>

      {/* Decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
  );
};

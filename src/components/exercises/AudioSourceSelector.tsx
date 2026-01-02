import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Volume2, Mic, Bot, ChevronDown, Play, Loader2 } from 'lucide-react';
import { useUserRecordings } from '@/hooks/useUserRecordings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export type AudioSource = 'ai' | 'personal';

interface AudioSourceSelectorProps {
  text: string;
  exerciseId?: string;
  lessonId?: string;
  moduleId?: string;
  onPlay: (audioUrl: string) => void;
  className?: string;
}

export function AudioSourceSelector({
  text,
  exerciseId,
  lessonId,
  moduleId,
  onPlay,
  className
}: AudioSourceSelectorProps) {
  const { toast } = useToast();
  const [source, setSource] = useState<AudioSource>('ai');
  const [selectedRecordingId, setSelectedRecordingId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const { recordings, isLoading: isLoadingRecordings } = useUserRecordings({
    exerciseId,
    lessonId,
    moduleId
  });

  // Also get all user recordings for fallback
  const { recordings: allRecordings } = useUserRecordings();

  // Combine context-specific and all recordings, removing duplicates
  const availableRecordings = React.useMemo(() => {
    const contextRecordings = recordings || [];
    const allRecs = allRecordings || [];
    
    const ids = new Set(contextRecordings.map(r => r.id));
    const unique = [...contextRecordings];
    
    allRecs.forEach(r => {
      if (!ids.has(r.id)) {
        unique.push(r);
      }
    });
    
    return unique;
  }, [recordings, allRecordings]);

  const handlePlayAI = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: { text, voiceId: 'onwK4e9ZLuTAKqWW03F9' }
      });

      if (error) throw error;

      if (data?.audioUrl) {
        onPlay(data.audioUrl);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating AI audio:', error);
      toast({
        title: "Erro ao gerar áudio",
        description: "Não foi possível gerar o áudio com IA.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPersonal = () => {
    const recording = availableRecordings.find(r => r.id === selectedRecordingId);
    if (recording) {
      onPlay(recording.audio_url);
    } else {
      toast({
        title: "Selecione uma gravação",
        description: "Escolha uma gravação pessoal para reproduzir.",
        variant: "destructive"
      });
    }
  };

  const handlePlay = () => {
    if (source === 'ai') {
      handlePlayAI();
    } else {
      handlePlayPersonal();
    }
  };

  const hasPersonalRecordings = availableRecordings.length > 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2"
          >
            {source === 'ai' ? (
              <Bot className="h-4 w-4 text-primary" />
            ) : (
              <Mic className="h-4 w-4 text-green-500" />
            )}
            <span className="hidden sm:inline">
              {source === 'ai' ? 'Áudio IA' : 'Minha Voz'}
            </span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-3">
            <div className="text-sm font-medium">Fonte de Áudio</div>
            
            {/* AI Option */}
            <div 
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-colors",
                source === 'ai' 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => setSource('ai')}
            >
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="font-medium">Áudio por IA</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Gerado automaticamente com ElevenLabs
              </p>
            </div>

            {/* Personal Recording Option */}
            <div 
              className={cn(
                "p-3 rounded-lg border transition-colors",
                !hasPersonalRecordings && "opacity-50",
                source === 'personal' 
                  ? "border-green-500 bg-green-500/5" 
                  : "border-border hover:border-green-500/50",
                hasPersonalRecordings ? "cursor-pointer" : "cursor-not-allowed"
              )}
              onClick={() => hasPersonalRecordings && setSource('personal')}
            >
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-green-500" />
                <span className="font-medium">Minha Gravação</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {hasPersonalRecordings 
                  ? `${availableRecordings.length} gravação(ões) disponível(is)`
                  : "Nenhuma gravação encontrada"}
              </p>
              
              {source === 'personal' && hasPersonalRecordings && (
                <div className="mt-2">
                  <Select
                    value={selectedRecordingId}
                    onValueChange={setSelectedRecordingId}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Selecionar gravação" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRecordings.map(rec => (
                        <SelectItem key={rec.id} value={rec.id}>
                          <div className="truncate max-w-[180px]">
                            {rec.title}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {!hasPersonalRecordings && (
              <p className="text-xs text-muted-foreground text-center">
                <a href="/recording-studio" className="text-primary hover:underline">
                  Grave sua voz
                </a>
                {' '}para usar áudio pessoal
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="default"
        size="sm"
        onClick={handlePlay}
        disabled={isLoading || (source === 'personal' && !selectedRecordingId)}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Ouvir</span>
      </Button>
    </div>
  );
}

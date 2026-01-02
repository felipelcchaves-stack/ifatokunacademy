import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectGroup,
  SelectItem, 
  SelectLabel,
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

interface UserRecording {
  id: string;
  title: string;
  text_content: string;
  audio_url: string;
  duration_seconds: number | null;
  exercise_id: string | null;
  lesson_id: string | null;
  module_id: string | null;
  created_at: string;
  module_title?: string | null;
  lesson_title?: string | null;
}

interface AudioSourceSelectorProps {
  text: string;
  exerciseId?: string;
  lessonId?: string;
  moduleId?: string;
  onPlay: (audioUrl: string) => void;
  className?: string;
}

// Helper to format recording label with context
function getRecordingLabel(rec: UserRecording): string {
  const date = new Date(rec.created_at);
  const dateStr = date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Preview of text content (max 25 chars)
  const textPreview = rec.text_content.length > 25 
    ? rec.text_content.substring(0, 25).trim() + '...'
    : rec.text_content;
  
  return `${textPreview} (${dateStr})`;
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

  // Group recordings by context: current lesson, current module, others
  const groupedRecordings = useMemo(() => {
    const all = allRecordings || [];
    
    const fromLesson = all.filter(r => r.lesson_id === lessonId && lessonId);
    const fromModule = all.filter(r => 
      r.module_id === moduleId && 
      r.lesson_id !== lessonId && 
      moduleId
    );
    const others = all.filter(r => 
      r.module_id !== moduleId && 
      r.lesson_id !== lessonId
    );
    
    return { fromLesson, fromModule, others };
  }, [allRecordings, lessonId, moduleId]);

  const totalRecordings = (allRecordings || []).length;

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
    const recording = allRecordings?.find(r => r.id === selectedRecordingId);
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

  const hasPersonalRecordings = totalRecordings > 0;

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
        <PopoverContent className="w-80 p-3" align="start">
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
                  ? `${totalRecordings} gravação(ões) disponível(is)`
                  : "Nenhuma gravação encontrada"}
              </p>
              
              {source === 'personal' && hasPersonalRecordings && (
                <div className="mt-2">
                  <Select
                    value={selectedRecordingId}
                    onValueChange={setSelectedRecordingId}
                  >
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder="Selecionar gravação..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {/* Recordings from current lesson */}
                      {groupedRecordings.fromLesson.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-xs font-semibold text-green-600">
                            📚 Desta Lição
                          </SelectLabel>
                          {groupedRecordings.fromLesson.map(rec => (
                            <SelectItem key={rec.id} value={rec.id} className="text-xs">
                              <div className="truncate max-w-[220px]">
                                {getRecordingLabel(rec)}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      
                      {/* Recordings from current module */}
                      {groupedRecordings.fromModule.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-xs font-semibold text-blue-600">
                            📦 Deste Módulo
                          </SelectLabel>
                          {groupedRecordings.fromModule.map(rec => (
                            <SelectItem key={rec.id} value={rec.id} className="text-xs">
                              <div className="truncate max-w-[220px]">
                                {rec.lesson_title && (
                                  <span className="text-muted-foreground">[{rec.lesson_title}] </span>
                                )}
                                {getRecordingLabel(rec)}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      
                      {/* Other recordings */}
                      {groupedRecordings.others.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-xs font-semibold text-muted-foreground">
                            📂 Outras Gravações
                          </SelectLabel>
                          {groupedRecordings.others.map(rec => (
                            <SelectItem key={rec.id} value={rec.id} className="text-xs">
                              <div className="truncate max-w-[220px]">
                                {rec.module_title && (
                                  <span className="text-muted-foreground">[{rec.module_title}] </span>
                                )}
                                {getRecordingLabel(rec)}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
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

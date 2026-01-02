import React, { useState, useCallback, useRef } from 'react';
import { 
  Volume2, 
  Mic, 
  MicOff,
  Play,
  RotateCcw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { splitIntoChunks, TextChunk } from '@/lib/textChunking';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ListenRepeatModeProps {
  text: string;
  onComplete: (correct: boolean) => void;
}

const ListenRepeatMode: React.FC<ListenRepeatModeProps> = ({
  text,
  onComplete
}) => {
  const { toast } = useToast();
  const [chunks] = useState<TextChunk[]>(() => splitIntoChunks(text, 5));
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'listening' | 'recording' | 'comparing'>('idle');
  const [audioLoading, setAudioLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [masteredChunks, setMasteredChunks] = useState<Set<number>>(new Set());
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const currentChunk = chunks[currentChunkIndex];
  const progress = (masteredChunks.size / chunks.length) * 100;
  const isComplete = masteredChunks.size === chunks.length;

  // Play the current chunk audio
  const playChunkAudio = useCallback(async () => {
    setAudioLoading(true);
    setPhase('listening');
    
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: { text: currentChunk.text, voiceId: 'onwK4e9ZLuTAKqWW03F9' }
      });

      if (error) throw error;

      if (data?.audioContent) {
        const url = `data:audio/mpeg;base64,${data.audioContent}`;
        const audio = new Audio(url);
        audio.onended = () => setPhase('idle');
        await audio.play();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      toast({
        title: "Erro ao reproduzir",
        description: "Não foi possível reproduzir o áudio",
        variant: "destructive"
      });
      setPhase('idle');
    } finally {
      setAudioLoading(false);
    }
  }, [currentChunk, toast]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudio(audioBlob);
        setPhase('comparing');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setPhase('recording');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erro no microfone",
        description: "Não foi possível acessar o microfone. Verifique as permissões.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Play recorded audio
  const playRecordedAudio = useCallback(() => {
    if (recordedAudio) {
      const url = URL.createObjectURL(recordedAudio);
      const audio = new Audio(url);
      audio.play();
    }
  }, [recordedAudio]);

  // Mark as mastered and move on
  const handleMastered = useCallback(() => {
    setMasteredChunks(prev => new Set([...prev, currentChunkIndex]));
    setAttempts(0);
    setRecordedAudio(null);
    
    if (currentChunkIndex < chunks.length - 1) {
      setCurrentChunkIndex(prev => prev + 1);
      setPhase('idle');
    } else {
      onComplete(true);
    }
  }, [currentChunkIndex, chunks.length, onComplete]);

  // Retry current chunk
  const handleRetry = useCallback(() => {
    setAttempts(prev => prev + 1);
    setRecordedAudio(null);
    setPhase('idle');
  }, []);

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Trecho {currentChunkIndex + 1} de {chunks.length}</span>
          <span>{masteredChunks.size} dominados</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Main Content */}
      <div className={cn(
        "min-h-[300px] rounded-xl border-2 p-8",
        "flex flex-col items-center justify-center text-center",
        "transition-all duration-300",
        phase === 'listening' && "bg-blue-50 border-blue-300",
        phase === 'recording' && "bg-red-50 border-red-300",
        phase === 'comparing' && "bg-muted/30 border-border",
        phase === 'idle' && "bg-muted/30 border-border"
      )}>
        
        {/* Idle - Start Instructions */}
        {phase === 'idle' && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Volume2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium">Escuta e Repete</p>
              <p className="text-sm text-muted-foreground">
                Ouça o trecho e depois repita em voz alta
              </p>
            </div>
            <Button
              onClick={playChunkAudio}
              className="gradient-forest text-primary-foreground"
              disabled={audioLoading}
            >
              <Play className="w-4 h-4 mr-2" />
              {audioLoading ? 'Carregando...' : 'Ouvir Trecho'}
            </Button>
          </div>
        )}

        {/* Listening */}
        {phase === 'listening' && (
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto animate-pulse">
              <Volume2 className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-blue-800">Ouvindo...</p>
              <p className="text-sm text-blue-600">
                Preste atenção na pronúncia e ritmo
              </p>
            </div>
          </div>
        )}

        {/* Ready to Record */}
        {phase === 'idle' && !audioLoading && (
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={startRecording}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <Mic className="w-4 h-4 mr-2" />
              Gravar Minha Voz
            </Button>
          </div>
        )}

        {/* Recording */}
        {phase === 'recording' && (
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto animate-pulse">
              <Mic className="w-10 h-10 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-red-800">Gravando...</p>
              <p className="text-sm text-red-600">
                Repita o trecho em voz alta
              </p>
            </div>
            <Button
              onClick={stopRecording}
              variant="destructive"
            >
              <MicOff className="w-4 h-4 mr-2" />
              Parar Gravação
            </Button>
          </div>
        )}

        {/* Comparing */}
        {phase === 'comparing' && (
          <div className="space-y-6 w-full">
            <div>
              <p className="text-lg font-medium">Compare sua Pronúncia</p>
              <p className="text-sm text-muted-foreground mb-4">
                Ouça o original e sua gravação
              </p>
            </div>

            {/* Original Text Display */}
            <div className="p-4 bg-card rounded-lg border">
              <p className="font-serif text-lg">{currentChunk.text}</p>
            </div>

            {/* Audio Comparison */}
            <div className="flex gap-4 justify-center flex-wrap">
              <Button variant="outline" onClick={playChunkAudio} disabled={audioLoading}>
                <Volume2 className="w-4 h-4 mr-2" />
                Original
              </Button>
              <Button variant="outline" onClick={playRecordedAudio}>
                <Mic className="w-4 h-4 mr-2" />
                Minha Gravação
              </Button>
            </div>

            {/* Self-Assessment */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                Sua pronúncia ficou boa?
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={handleRetry}
                  className="border-amber-300 text-amber-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
                <Button
                  onClick={handleMastered}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Ficou Boa!
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chunk Indicators */}
      <div className="flex gap-1 justify-center flex-wrap">
        {chunks.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-3 h-3 rounded-full transition-all",
              masteredChunks.has(index) && "bg-green-500",
              index === currentChunkIndex && !masteredChunks.has(index) && "bg-primary animate-pulse",
              index !== currentChunkIndex && !masteredChunks.has(index) && "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Attempts */}
      {attempts > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Tentativas neste trecho: {attempts}
        </p>
      )}

      {/* Microphone Permission Note */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Requer permissão do microfone para gravar
        </p>
      </div>
    </div>
  );
};

export default ListenRepeatMode;

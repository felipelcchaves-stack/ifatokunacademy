import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import ContentProtection from '@/components/ContentProtection';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AudioRecorder } from '@/components/recording/AudioRecorder';
import { useUserRecordings } from '@/hooks/useUserRecordings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mic, 
  Trash2, 
  Play, 
  Pause, 
  Clock, 
  BookOpen,
  Plus,
  Library,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { isAudioUrlPlayable, getFormatCompatibilityMessage } from '@/lib/audioFormatUtils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';

export default function RecordingStudio() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [showNewRecording, setShowNewRecording] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const { recordings, isLoading, refetch, deleteRecording } = useUserRecordings();

  // Fetch modules for association
  const { data: modules } = useQuery({
    queryKey: ['modules-for-recording'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('id, title')
        .eq('is_published', true)
        .order('display_order');
      
      if (error) throw error;
      return data;
    }
  });

  const handlePlay = (recordingId: string, audioUrl: string) => {
    // Check if format is playable in this browser
    if (!isAudioUrlPlayable(audioUrl)) {
      const message = getFormatCompatibilityMessage(audioUrl);
      toast({
        title: "Formato não suportado",
        description: message || "Este formato não é suportado pelo seu navegador.",
        variant: "destructive"
      });
      return;
    }
    
    if (playingId === recordingId) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play().catch((err) => {
          console.error('Playback error:', err);
          toast({
            title: "Erro ao reproduzir",
            description: "Não foi possível reproduzir este áudio. Tente gravar novamente.",
            variant: "destructive"
          });
        });
        setPlayingId(recordingId);
      }
    }
  };

  const handleDelete = async (id: string, audioUrl: string) => {
    if (confirm('Tem certeza que deseja excluir esta gravação?')) {
      await deleteRecording(id, audioUrl);
    }
  };

  const handleSaved = () => {
    setShowNewRecording(false);
    setNewTitle('');
    setNewText('');
    setSelectedModule('');
    refetch();
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ContentProtection>
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Mic className="h-8 w-8 text-primary" />
                  Estúdio de Gravação
                </h1>
                <p className="text-muted-foreground mt-2">
                  Grave textos com sua própria voz para melhorar a memorização
                </p>
              </div>
              <Button 
                onClick={() => setShowNewRecording(!showNewRecording)}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4" />
                Nova Gravação
              </Button>
            </div>

            {/* New Recording Form */}
            {showNewRecording && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="text-lg">Nova Gravação</CardTitle>
                  <CardDescription>
                    Digite o texto que deseja gravar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Título</label>
                    <Input
                      placeholder="Ex: Oração de Abertura"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Módulo (opcional)</label>
                    <Select value={selectedModule} onValueChange={setSelectedModule}>
                      <SelectTrigger>
                        <SelectValue placeholder="Associar a um módulo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {modules?.map(mod => (
                          <SelectItem key={mod.id} value={mod.id}>
                            {mod.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Texto para Gravar</label>
                    <Textarea
                      placeholder="Cole ou digite o texto que deseja memorizar..."
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      rows={6}
                    />
                  </div>

                  {newTitle && newText && (
                    <AudioRecorder
                      title={newTitle}
                      textContent={newText}
                      moduleId={selectedModule !== 'none' ? selectedModule : undefined}
                      onSaved={handleSaved}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recordings Library */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Library className="h-5 w-5" />
                  Suas Gravações
                </CardTitle>
                <CardDescription>
                  {recordings.length} gravação(ões) salva(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando gravações...
                  </div>
                ) : recordings.length === 0 ? (
                  <div className="text-center py-8">
                    <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Você ainda não tem gravações.
                    </p>
                    <Button 
                      variant="link" 
                      onClick={() => setShowNewRecording(true)}
                    >
                      Criar primeira gravação
                    </Button>
                  </div>
                ) : isMobile ? (
                  // Mobile: Cards empilhados
                  <div className="space-y-3">
                    {recordings.map(recording => {
                      const isPlayable = isAudioUrlPlayable(recording.audio_url);
                      return (
                        <div 
                          key={recording.id}
                          className="p-4 bg-muted/50 rounded-lg border space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium truncate">{recording.title}</h4>
                                {!isPlayable && (
                                  <span className="text-xs bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded shrink-0">
                                    Incompatível
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePlay(recording.id, recording.audio_url)}
                                disabled={!isPlayable}
                                className="h-8 w-8"
                              >
                                {!isPlayable ? (
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                ) : playingId === recording.id ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(recording.id, recording.audio_url)}
                                className="text-destructive hover:text-destructive h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(recording.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(recording.duration_seconds)}
                            </div>
                            <div className="truncate">
                              <span className="font-medium">Módulo:</span> {recording.module_title || '-'}
                            </div>
                            <div className="truncate">
                              <span className="font-medium">Lição:</span> {recording.lesson_title || '-'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Desktop: Tabela
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Play</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Módulo</TableHead>
                          <TableHead>Lição</TableHead>
                          <TableHead className="w-16">Duração</TableHead>
                          <TableHead className="w-12">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recordings.map(recording => {
                          const isPlayable = isAudioUrlPlayable(recording.audio_url);
                          return (
                            <TableRow key={recording.id}>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePlay(recording.id, recording.audio_url)}
                                  disabled={!isPlayable}
                                  className="h-8 w-8"
                                >
                                  {!isPlayable ? (
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                  ) : playingId === recording.id ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate max-w-[200px]">{recording.title}</span>
                                  {!isPlayable && (
                                    <span className="text-xs bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded shrink-0">
                                      Incompatível
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {format(new Date(recording.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {recording.module_title || '-'}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {recording.lesson_title || '-'}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDuration(recording.duration_seconds)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(recording.id, recording.audio_url)}
                                  className="text-destructive hover:text-destructive h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hidden audio element for playback */}
            <audio 
              ref={audioRef} 
              onEnded={() => setPlayingId(null)}
              className="hidden"
            />

            {/* Tips */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Dicas para Gravação Eficaz
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Grave em um ambiente silencioso para melhor qualidade</li>
                  <li>• Leia de forma clara e pausada, como se estivesse ensinando</li>
                  <li>• Use entonação natural para facilitar a memorização</li>
                  <li>• Grave várias vezes até ficar satisfeito com o resultado</li>
                  <li>• Ouça suas gravações durante momentos de descanso</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </main>
      </ContentProtection>
    </div>
  );
}

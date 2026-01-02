import React, { useState } from 'react';
import { Wand2, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Module {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
}

interface BatchBannerGeneratorProps {
  modules: Module[];
  onBannersGenerated: () => void;
}

interface GenerationResult {
  moduleId: string;
  moduleTitle: string;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
}

const BatchBannerGenerator: React.FC<BatchBannerGeneratorProps> = ({
  modules,
  onBannersGenerated,
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter modules without images
  const modulesWithoutImages = modules.filter(m => !m.image_url);

  const handleStartBatchGeneration = async () => {
    if (modulesWithoutImages.length === 0) {
      toast({
        title: 'Nenhum módulo sem banner',
        description: 'Todos os módulos já possuem imagens.',
      });
      return;
    }

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      toast({
        title: 'Sessão expirada',
        description: 'Faça login novamente para continuar.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setCurrentIndex(0);

    // Initialize results
    const initialResults: GenerationResult[] = modulesWithoutImages.map(m => ({
      moduleId: m.id,
      moduleTitle: m.title,
      status: 'pending',
    }));
    setResults(initialResults);

    // Generate banners sequentially (to avoid rate limits)
    for (let i = 0; i < modulesWithoutImages.length; i++) {
      const module = modulesWithoutImages[i];
      setCurrentIndex(i);

      // Update status to generating
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'generating' } : r
      ));

      try {
        // Add delay between requests to avoid rate limits
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        const { data, error } = await supabase.functions.invoke('generate-module-banner', {
          body: {
            moduleId: module.id,
            title: module.title,
            description: module.description,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        // Update status to success
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'success' } : r
        ));

      } catch (error: any) {
        console.error(`Error generating banner for ${module.title}:`, error);
        
        // Update status to error
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'error', error: error.message } : r
        ));

        // If rate limited, stop and notify
        if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
          toast({
            title: 'Limite de requisições atingido',
            description: 'Aguarde alguns minutos e tente novamente.',
            variant: 'destructive',
          });
          break;
        }
      }
    }

    setIsGenerating(false);
    onBannersGenerated();

    const successCount = results.filter(r => r.status === 'success').length + 1; // +1 for current
    toast({
      title: 'Geração em lote concluída',
      description: `${successCount} banners gerados com sucesso.`,
    });
  };

  const progress = modulesWithoutImages.length > 0 
    ? ((currentIndex + 1) / modulesWithoutImages.length) * 100 
    : 0;

  const getStatusIcon = (status: GenerationResult['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />;
      case 'generating':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={modulesWithoutImages.length === 0}>
          <Wand2 className="w-4 h-4" />
          Gerar Banners em Lote
          {modulesWithoutImages.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
              {modulesWithoutImages.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Gerar Banners em Lote
          </DialogTitle>
          <DialogDescription>
            Gera banners automaticamente para todos os módulos que ainda não possuem imagem.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {modulesWithoutImages.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-muted-foreground">
                Todos os módulos já possuem banners!
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <p className="text-sm text-muted-foreground">
                  {modulesWithoutImages.length} módulo(s) sem banner serão processados
                </p>
              </div>

              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{currentIndex + 1} de {modulesWithoutImages.length}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {results.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {results.map((result) => (
                    <div 
                      key={result.moduleId}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      {getStatusIcon(result.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.moduleTitle}</p>
                        {result.error && (
                          <p className="text-xs text-destructive truncate">{result.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isGenerating && results.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Módulos a processar:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {modulesWithoutImages.map((module) => (
                      <div 
                        key={module.id}
                        className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm"
                      >
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="truncate">{module.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isGenerating}>
            {isGenerating ? 'Aguarde...' : 'Fechar'}
          </Button>
          {modulesWithoutImages.length > 0 && (
            <Button 
              className="gradient-gold text-secondary"
              onClick={handleStartBatchGeneration}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Iniciar Geração
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchBannerGenerator;

import React, { useState, useEffect, useRef } from 'react';
import { Wand2, Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
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
  const [currentIndex, setCurrentIndex] = useState(-1);
  const abortRef = useRef(false);

  // Filter modules without images
  const modulesWithoutImages = modules.filter(m => !m.image_url);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setResults([]);
      setCurrentIndex(-1);
      setIsGenerating(false);
      abortRef.current = false;
    }
  }, [isOpen]);

  // Get failed and success counts from final results
  const failedModules = results.filter(r => r.status === 'error');
  const successCount = results.filter(r => r.status === 'success').length;
  const hasCompleted = results.length > 0 && !isGenerating && currentIndex === -1;

  const handleStartBatchGeneration = async (modulesToProcess?: Module[]) => {
    const targetModules = modulesToProcess || modulesWithoutImages;
    
    if (targetModules.length === 0) {
      toast({
        title: 'Nenhum módulo para processar',
        description: 'Todos os módulos já possuem imagens ou não há falhas para retentar.',
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
    abortRef.current = false;

    // Initialize results
    const initialResults: GenerationResult[] = targetModules.map(m => ({
      moduleId: m.id,
      moduleTitle: m.title,
      status: 'pending',
    }));
    setResults(initialResults);

    let completedSuccess = 0;
    let completedError = 0;

    // Generate banners sequentially (to avoid rate limits)
    for (let i = 0; i < targetModules.length; i++) {
      // Check if cancelled
      if (abortRef.current) {
        console.log('Batch generation cancelled by user');
        break;
      }

      const module = targetModules[i];
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

        // Check again if cancelled during delay
        if (abortRef.current) {
          break;
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
        completedSuccess++;

      } catch (error: any) {
        console.error(`Error generating banner for ${module.title}:`, error);
        
        // Update status to error
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'error', error: error.message } : r
        ));
        completedError++;

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
    setCurrentIndex(-1);

    // Only call onBannersGenerated if we had any success
    if (completedSuccess > 0) {
      onBannersGenerated();
    }

    // Show appropriate toast
    if (abortRef.current) {
      toast({
        title: 'Geração cancelada',
        description: `${completedSuccess} banner(s) gerado(s) antes do cancelamento.`,
      });
    } else if (completedError === 0) {
      toast({
        title: 'Geração concluída!',
        description: `${completedSuccess} banner(s) gerado(s) com sucesso.`,
      });
    } else {
      toast({
        title: 'Geração parcialmente concluída',
        description: `${completedSuccess} sucesso, ${completedError} falha(s). Você pode tentar novamente.`,
        variant: 'destructive',
      });
    }
  };

  const handleRetryFailed = () => {
    // Get the original module objects for failed ones
    const failedModuleIds = failedModules.map(f => f.moduleId);
    const modulesToRetry = modules.filter(m => failedModuleIds.includes(m.id));
    handleStartBatchGeneration(modulesToRetry);
  };

  const handleCancel = () => {
    abortRef.current = true;
  };

  const progress = results.length > 0 
    ? ((results.filter(r => r.status === 'success' || r.status === 'error').length) / results.length) * 100 
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
          {modulesWithoutImages.length === 0 && !hasCompleted ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-muted-foreground">
                Todos os módulos já possuem banners!
              </p>
            </div>
          ) : (
            <>
              {!isGenerating && results.length === 0 && (
                <>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      {modulesWithoutImages.length} módulo(s) sem banner serão processados. 
                      Mantenha esta janela aberta.
                    </p>
                  </div>

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
                </>
              )}

              {(isGenerating || results.length > 0) && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso</span>
                      <span>
                        {results.filter(r => r.status === 'success' || r.status === 'error').length} de {results.length}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    
                    {hasCompleted && (
                      <div className="flex gap-4 text-sm mt-2">
                        <span className="text-green-600 dark:text-green-400">
                          ✓ {successCount} sucesso
                        </span>
                        {failedModules.length > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            ✗ {failedModules.length} falha(s)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {results.map((result, index) => (
                      <div 
                        key={result.moduleId}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          result.status === 'generating' 
                            ? 'bg-primary/10 border border-primary/30' 
                            : result.status === 'error'
                            ? 'bg-red-500/10 border border-red-500/20'
                            : result.status === 'success'
                            ? 'bg-green-500/10 border border-green-500/20'
                            : 'bg-muted/50'
                        }`}
                      >
                        {getStatusIcon(result.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.moduleTitle}</p>
                          {result.error && (
                            <p className="text-xs text-destructive truncate">{result.error}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {index + 1}/{results.length}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {isGenerating ? (
            <>
              <Button 
                variant="destructive" 
                onClick={handleCancel}
                className="gap-2"
              >
                <XCircle className="w-4 h-4" />
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Fechar
              </Button>
              
              {hasCompleted && failedModules.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={handleRetryFailed}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tentar Novamente ({failedModules.length})
                </Button>
              )}
              
              {!hasCompleted && modulesWithoutImages.length > 0 && (
                <Button 
                  className="gradient-gold text-secondary"
                  onClick={() => handleStartBatchGeneration()}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Iniciar Geração
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchBannerGenerator;

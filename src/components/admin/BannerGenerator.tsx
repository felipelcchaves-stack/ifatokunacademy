import React, { useState } from 'react';
import { Wand2, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BannerGeneratorProps {
  moduleId: string;
  moduleTitle: string;
  moduleDescription: string | null;
  currentImageUrl: string | null;
  onBannerGenerated: (imageUrl: string) => void;
}

const BannerGenerator: React.FC<BannerGeneratorProps> = ({
  moduleId,
  moduleTitle,
  moduleDescription,
  currentImageUrl,
  onBannerGenerated,
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedUrl(null);

    try {
      // Get current session to send Authorization header explicitly
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({
          title: 'Sessão expirada',
          description: 'Faça login novamente para continuar.',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-module-banner', {
        body: {
          moduleId,
          title: moduleTitle,
          description: moduleDescription,
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

      if (data?.imageUrl) {
        setGeneratedUrl(data.imageUrl);
        onBannerGenerated(data.imageUrl);
        
        toast({
          title: 'Banner gerado com sucesso!',
          description: 'A imagem foi salva e aplicada ao módulo.',
        });
      }
    } catch (error: any) {
      console.error('Error generating banner:', error);
      
      let errorMessage = 'Erro ao gerar banner';
      if (error.message?.includes('Rate limit')) {
        errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
      } else if (error.message?.includes('Payment')) {
        errorMessage = 'Créditos insuficientes. Adicione mais créditos para continuar.';
      } else {
        errorMessage = error.message || 'Erro desconhecido';
      }
      
      toast({
        title: 'Erro ao gerar banner',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando...
            </>
          ) : generatedUrl ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              Banner Gerado
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Gerar Banner com IA
            </>
          )}
        </Button>
      </div>

      {(currentImageUrl || generatedUrl) && (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={generatedUrl || currentImageUrl || ''}
            alt="Banner do módulo"
            className="w-full h-32 object-cover"
          />
          {generatedUrl && (
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
              Novo
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        A IA irá gerar uma imagem baseada no título e descrição do módulo.
      </p>
    </div>
  );
};

export default BannerGenerator;

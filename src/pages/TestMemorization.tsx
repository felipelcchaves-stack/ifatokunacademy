import React from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import MemorizationExercise from '@/components/exercises/MemorizationExercise';

// Texto longo de exemplo (Odu de Ifá)
const LONG_TEXT_ITEMS = [
  {
    text: "Òrúnmìlà ní ó di àgbà tán, ọmọ araye ní wọ́n ò gbe ìsìn re kalẹ̀. A dífá fún Olófin Odùduwà, èyí tí ó ṣe bàbá àgbà láyé. Wọ́n ní kí ó rúbọ, kí ó sì máa sin àwọn àgbà. Ó gbọ́, ó rúbọ. Ìgbà tí ó rúbọ tán, gbogbo ènìyàn bẹ̀rẹ̀ sí í bọ̀wọ̀ fún un.",
    hint: "Sobre respeitar os mais velhos"
  },
  {
    text: "Àgbà kì í wà lọ́jà kí orí ọmọ tuntun wọ́. Àgbà kì í wà nílé kí a fi ìdí ọmọ wẹ̀wẹ̀ sílẹ̀ sọnù. Eléyìí ni Ifá sọ fún wa pé kí a máa bọ̀wọ̀ fún àwọn àgbàlagbà wa. Nítorí pé àgbà ò níí wà, àti ọmọdé ò níí gbọ́n.",
    hint: "A sabedoria dos anciãos"
  }
];

const TestMemorization: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="font-serif text-xl font-semibold">Teste de Memorização</h1>
              <p className="text-sm text-muted-foreground">
                Testando novos modos inclusivos com texto longo
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/memorization-guide')}
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Ver Guia
          </Button>
        </div>
      </div>

      {/* Exercise */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <h2 className="font-medium mb-2">Sobre este teste</h2>
          <p className="text-sm text-muted-foreground">
            Este exercício contém textos longos em Yorubá (Odus de Ifá) para testar os novos modos de memorização inclusivos.
            O sistema detectará automaticamente que são textos longos e oferecerá opções de modos especiais.
          </p>
          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
            <li>• <strong>Microlearning:</strong> 3-5 palavras por vez com pausas forçadas</li>
            <li>• <strong>Toque e Complete:</strong> Ordene palavras sem digitar</li>
            <li>• <strong>Karaokê Visual:</strong> Acompanhe palavra por palavra com áudio</li>
            <li>• <strong>Construção Visual:</strong> Monte o texto com blocos coloridos</li>
            <li>• <strong>Escuta e Repete:</strong> Ouça primeiro, depois grave sua voz</li>
          </ul>
        </div>

        <MemorizationExercise 
          items={LONG_TEXT_ITEMS}
          onComplete={() => {
            console.log('Exercício completo!');
          }}
        />
      </div>
    </div>
  );
};

export default TestMemorization;

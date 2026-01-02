import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Brain, 
  Lightbulb, 
  BookOpen, 
  Layers, 
  RefreshCw,
  Zap,
  Hand,
  Music,
  Puzzle,
  Headphones,
  CheckCircle,
  Clock,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface ModeInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  category: 'traditional' | 'inclusive';
  difficulty: 'easy' | 'medium' | 'hard';
  timeEstimate: string;
  bestFor: string[];
  description: string;
  howItWorks: string[];
  tips: string[];
  accessibility: string[];
}

const MODES: ModeInfo[] = [
  // Traditional Modes
  {
    id: 'reading',
    name: 'Leitura Guiada',
    icon: <BookOpen className="w-6 h-6" />,
    color: 'text-blue-600',
    bgGradient: 'from-blue-500 to-blue-600',
    category: 'traditional',
    difficulty: 'easy',
    timeEstimate: '5-10 min',
    bestFor: ['Primeiro contato com o texto', 'Compreensão geral', 'Aprendizado visual'],
    description: 'Acompanhe a leitura do texto com áudio sincronizado, permitindo absorver o conteúdo de forma passiva e natural.',
    howItWorks: [
      'O texto é exibido com destaque na palavra atual',
      'O áudio é reproduzido automaticamente',
      'Você pode pausar e retomar a qualquer momento',
      'Ideal para primeira exposição ao conteúdo'
    ],
    tips: [
      'Leia junto em voz alta para melhor memorização',
      'Repita várias vezes até se familiarizar',
      'Preste atenção na pronúncia do áudio'
    ],
    accessibility: ['Áudio sincronizado', 'Destaque visual de palavras', 'Controle de velocidade']
  },
  {
    id: 'hints',
    name: 'Ocultação Gradual',
    icon: <Layers className="w-6 h-6" />,
    color: 'text-purple-600',
    bgGradient: 'from-purple-500 to-purple-600',
    category: 'traditional',
    difficulty: 'medium',
    timeEstimate: '10-15 min',
    bestFor: ['Memorização progressiva', 'Teste de memória', 'Consolidação'],
    description: 'As palavras vão sendo ocultadas gradualmente, desafiando você a preencher as lacunas com sua memória.',
    howItWorks: [
      'O texto começa completo e visível',
      'Gradualmente, palavras são ocultadas',
      'Você precisa lembrar das palavras ocultas',
      'A dificuldade aumenta progressivamente'
    ],
    tips: [
      'Comece com o texto completo e avance devagar',
      'Use o contexto para lembrar palavras',
      'Repita até conseguir com todas as palavras ocultas'
    ],
    accessibility: ['Progressão controlada', 'Feedback visual', 'Botão de revelar']
  },
  {
    id: 'flashcards',
    name: 'Flash Cards',
    icon: <RefreshCw className="w-6 h-6" />,
    color: 'text-green-600',
    bgGradient: 'from-green-500 to-green-600',
    category: 'traditional',
    difficulty: 'medium',
    timeEstimate: '10-20 min',
    bestFor: ['Revisão espaçada', 'Auto-avaliação', 'Memorização ativa'],
    description: 'Cartões de memória interativos que testam sua capacidade de recordar informações.',
    howItWorks: [
      'Cada cartão mostra uma pergunta ou dica',
      'Você tenta lembrar a resposta',
      'Vire o cartão para verificar',
      'Marque como "Sei" ou "Preciso revisar"'
    ],
    tips: [
      'Tente lembrar antes de virar o cartão',
      'Seja honesto consigo mesmo',
      'Revise os cartões difíceis mais vezes'
    ],
    accessibility: ['Interface simples', 'Feedback imediato', 'Repetição espaçada']
  },
  {
    id: 'typing',
    name: 'Digitação Ativa',
    icon: <Brain className="w-6 h-6" />,
    color: 'text-orange-600',
    bgGradient: 'from-orange-500 to-orange-600',
    category: 'traditional',
    difficulty: 'hard',
    timeEstimate: '15-25 min',
    bestFor: ['Memorização profunda', 'Memória muscular', 'Teste final'],
    description: 'Digite o texto completo de memória, ativando a memória muscular e consolidando o aprendizado.',
    howItWorks: [
      'O texto é oculto completamente',
      'Você digita o que lembra',
      'O sistema verifica sua precisão',
      'Feedback em tempo real ou ao final'
    ],
    tips: [
      'Não se preocupe com erros no início',
      'Foque na progressão, não na perfeição',
      'Use este modo após dominar os anteriores'
    ],
    accessibility: ['Verificação de similaridade', 'Feedback detalhado', 'Múltiplas tentativas']
  },
  // Inclusive Modes
  {
    id: 'microlearning',
    name: 'Microlearning',
    icon: <Zap className="w-6 h-6" />,
    color: 'text-yellow-600',
    bgGradient: 'from-yellow-500 to-amber-600',
    category: 'inclusive',
    difficulty: 'easy',
    timeEstimate: '5-10 min',
    bestFor: ['Textos longos', 'Pouco tempo disponível', 'TDAH', 'Dificuldade de concentração'],
    description: 'O texto é dividido em pequenos pedaços (chunks) de 1-3 frases, facilitando a absorção e evitando sobrecarga cognitiva.',
    howItWorks: [
      'O texto é dividido em pequenos blocos',
      'Você estuda um bloco por vez',
      'Cada bloco tem seu próprio áudio',
      'Avance no seu próprio ritmo'
    ],
    tips: [
      'Ideal para textos longos ou complexos',
      'Perfeito para estudar em intervalos curtos',
      'Combine com pausas regulares'
    ],
    accessibility: [
      'Reduz sobrecarga cognitiva',
      'Ideal para TDAH',
      'Progresso visual claro',
      'Controle total do ritmo'
    ]
  },
  {
    id: 'tapComplete',
    name: 'Toque e Complete',
    icon: <Hand className="w-6 h-6" />,
    color: 'text-pink-600',
    bgGradient: 'from-pink-500 to-rose-600',
    category: 'inclusive',
    difficulty: 'easy',
    timeEstimate: '5-15 min',
    bestFor: ['Dificuldade motora', 'Dislexia', 'Aprendizado cinestésico', 'Mobile/Touch'],
    description: 'Toque nas palavras na ordem correta para reconstruir o texto. Nenhuma digitação necessária!',
    howItWorks: [
      'Palavras são exibidas embaralhadas',
      'Toque nas palavras na ordem correta',
      'Pode desfazer e recomeçar',
      'Feedback visual imediato'
    ],
    tips: [
      'Leia o texto original antes de começar',
      'Use o contexto para identificar a ordem',
      'Não tenha pressa - precisão é mais importante'
    ],
    accessibility: [
      'Sem necessidade de digitação',
      'Ideal para dificuldades motoras',
      'Interface touch-friendly',
      'Feedback visual claro'
    ]
  },
  {
    id: 'karaoke',
    name: 'Karaokê Visual',
    icon: <Music className="w-6 h-6" />,
    color: 'text-indigo-600',
    bgGradient: 'from-indigo-500 to-violet-600',
    category: 'inclusive',
    difficulty: 'easy',
    timeEstimate: '5-10 min',
    bestFor: ['Aprendizado auditivo', 'Ritmo e entonação', 'Memorização musical', 'Dislexia'],
    description: 'As palavras aparecem sincronizadas com o áudio, como um karaokê, criando uma experiência musical de memorização.',
    howItWorks: [
      'Palavras aparecem uma por uma',
      'Sincronizadas com o áudio',
      'Destaque visual na palavra atual',
      'Velocidade ajustável'
    ],
    tips: [
      'Leia/cante junto com o áudio',
      'Ajuste a velocidade conforme necessário',
      'Repita várias vezes para memorizar o ritmo'
    ],
    accessibility: [
      'Multimodal: visual + auditivo',
      'Ideal para dislexia',
      'Controle de velocidade',
      'Experiência imersiva'
    ]
  },
  {
    id: 'visualBuilder',
    name: 'Construção Visual',
    icon: <Puzzle className="w-6 h-6" />,
    color: 'text-teal-600',
    bgGradient: 'from-teal-500 to-cyan-600',
    category: 'inclusive',
    difficulty: 'medium',
    timeEstimate: '10-15 min',
    bestFor: ['Aprendizado visual', 'Pensamento espacial', 'Gamificação', 'Crianças'],
    description: 'Arraste e solte blocos coloridos para montar o texto, como um quebra-cabeça visual.',
    howItWorks: [
      'Blocos de texto são exibidos embaralhados',
      'Cada bloco tem uma cor única',
      'Arraste para a posição correta',
      'Conexões visuais mostram o progresso'
    ],
    tips: [
      'Use as cores como pistas visuais',
      'Monte por partes - começo, meio e fim',
      'Ouça o áudio para confirmar a ordem'
    ],
    accessibility: [
      'Altamente visual e colorido',
      'Gamificado e divertido',
      'Feedback visual de progresso',
      'Múltiplas tentativas'
    ]
  },
  {
    id: 'listenRepeat',
    name: 'Escuta e Repete',
    icon: <Headphones className="w-6 h-6" />,
    color: 'text-red-600',
    bgGradient: 'from-red-500 to-rose-600',
    category: 'inclusive',
    difficulty: 'medium',
    timeEstimate: '15-20 min',
    bestFor: ['Aprendizado auditivo', 'Pronúncia', 'Deficiência visual', 'Língua Yorubá'],
    description: 'Ouça trechos do texto e grave sua própria voz repetindo, comparando depois para melhorar.',
    howItWorks: [
      'Ouça um trecho do áudio',
      'Grave sua própria voz repetindo',
      'Compare sua gravação com o original',
      'Marque como dominado ou repita'
    ],
    tips: [
      'Use fones de ouvido para melhor qualidade',
      'Não se preocupe com perfeição no início',
      'Foque na pronúncia e ritmo'
    ],
    accessibility: [
      'Ideal para deficiência visual',
      'Sem necessidade de leitura',
      'Feedback auditivo',
      'Gravação e comparação'
    ]
  }
];

const DifficultyBadge = ({ difficulty }: { difficulty: 'easy' | 'medium' | 'hard' }) => {
  const config = {
    easy: { label: 'Fácil', className: 'bg-green-100 text-green-700 border-green-200' },
    medium: { label: 'Médio', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    hard: { label: 'Avançado', className: 'bg-red-100 text-red-700 border-red-200' }
  };
  
  return (
    <Badge variant="outline" className={config[difficulty].className}>
      {config[difficulty].label}
    </Badge>
  );
};

const ModeCard = ({ mode, isExpanded, onToggle }: { mode: ModeInfo; isExpanded: boolean; onToggle: () => void }) => {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
      <CardHeader 
        className={`cursor-pointer bg-gradient-to-r ${mode.bgGradient} text-white`}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {mode.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{mode.name}</CardTitle>
                {mode.category === 'inclusive' && (
                  <Badge className="bg-white/20 text-white border-white/30">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Inclusivo
                  </Badge>
                )}
              </div>
              <CardDescription className="text-white/80">
                {mode.description.substring(0, 60)}...
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DifficultyBadge difficulty={mode.difficulty} />
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
          {/* Description */}
          <div>
            <p className="text-muted-foreground">{mode.description}</p>
          </div>
          
          {/* Quick Info */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{mode.timeEstimate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span>Melhor para: {mode.bestFor.slice(0, 2).join(', ')}</span>
            </div>
          </div>
          
          {/* Best For Tags */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Ideal para:
            </h4>
            <div className="flex flex-wrap gap-2">
              {mode.bestFor.map((item, i) => (
                <Badge key={i} variant="secondary">{item}</Badge>
              ))}
            </div>
          </div>
          
          {/* How it Works */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Play className="w-4 h-4" />
              Como funciona:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              {mode.howItWorks.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
          
          {/* Tips */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Dicas:
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {mode.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Accessibility Features */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Recursos de Acessibilidade:
            </h4>
            <div className="flex flex-wrap gap-2">
              {mode.accessibility.map((feature, i) => (
                <Badge key={i} variant="outline" className="bg-white">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

const MemorizationGuide = () => {
  const navigate = useNavigate();
  const [expandedModes, setExpandedModes] = useState<Set<string>>(new Set(['microlearning']));
  const [activeTab, setActiveTab] = useState<'all' | 'traditional' | 'inclusive'>('all');
  
  const toggleMode = (id: string) => {
    setExpandedModes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const filteredModes = MODES.filter(mode => {
    if (activeTab === 'all') return true;
    return mode.category === activeTab;
  });
  
  const traditionalModes = MODES.filter(m => m.category === 'traditional');
  const inclusiveModes = MODES.filter(m => m.category === 'inclusive');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Guia de Modos de Memorização</h1>
            <p className="text-muted-foreground text-lg">
              Descubra qual modo de memorização é ideal para você. Cada pessoa aprende de forma diferente - 
              encontre o método que melhor se adapta ao seu estilo de aprendizado.
            </p>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{MODES.length}</div>
            <div className="text-sm text-muted-foreground">Modos Disponíveis</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{traditionalModes.length}</div>
            <div className="text-sm text-muted-foreground">Modos Tradicionais</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{inclusiveModes.length}</div>
            <div className="text-sm text-muted-foreground">Modos Inclusivos</div>
          </Card>
          <Card className="p-4 text-center bg-gradient-to-br from-cyan-500 to-teal-600 text-white">
            <div className="text-3xl font-bold">100%</div>
            <div className="text-sm opacity-90">Acessíveis</div>
          </Card>
        </div>
        
        {/* Recommendation Section */}
        <Card className="mb-8 p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Como escolher o modo certo?</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Primeiro contato:</strong> Comece com <span className="font-medium text-blue-600">Leitura Guiada</span> ou <span className="font-medium text-indigo-600">Karaokê Visual</span> para se familiarizar.
                </p>
                <p>
                  <strong>Textos longos:</strong> Use <span className="font-medium text-yellow-600">Microlearning</span> para dividir em partes menores.
                </p>
                <p>
                  <strong>Dificuldade de concentração:</strong> Experimente <span className="font-medium text-pink-600">Toque e Complete</span> ou <span className="font-medium text-teal-600">Construção Visual</span> para uma experiência mais interativa.
                </p>
                <p>
                  <strong>Teste final:</strong> Use <span className="font-medium text-orange-600">Digitação Ativa</span> para verificar se realmente memorizou.
                </p>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mb-6">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="all" className="flex-1 md:flex-none">
              Todos ({MODES.length})
            </TabsTrigger>
            <TabsTrigger value="traditional" className="flex-1 md:flex-none">
              Tradicionais ({traditionalModes.length})
            </TabsTrigger>
            <TabsTrigger value="inclusive" className="flex-1 md:flex-none">
              <Sparkles className="w-4 h-4 mr-1" />
              Inclusivos ({inclusiveModes.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Mode Cards */}
        <div className="space-y-4">
          {filteredModes.map(mode => (
            <ModeCard 
              key={mode.id}
              mode={mode}
              isExpanded={expandedModes.has(mode.id)}
              onToggle={() => toggleMode(mode.id)}
            />
          ))}
        </div>
        
        {/* CTA */}
        <div className="mt-12 text-center">
          <Card className="p-8 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
            <h3 className="text-xl font-bold mb-2">Pronto para começar?</h3>
            <p className="text-muted-foreground mb-4">
              Experimente os modos de memorização na prática com textos reais.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button 
                className="gap-2"
                onClick={() => navigate('/test-memorization')}
              >
                <Play className="w-4 h-4" />
                Testar Agora
              </Button>
              <Button 
                variant="outline"
                className="gap-2"
                onClick={() => navigate('/dashboard')}
              >
                <BookOpen className="w-4 h-4" />
                Ir para Aulas
              </Button>
            </div>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MemorizationGuide;

import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  FileJson, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  BookOpen,
  Eye,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OduData {
  nome: string;
  numero?: number;
  categoria?: string;
  verso?: string;
  texto_principal?: string;
  significado?: string;
  [key: string]: any;
}

interface Module {
  id: string;
  title: string;
  type: string;
}

interface ImportResult {
  success: boolean;
  oduName: string;
  lessonId?: string;
  exercisesCreated?: number;
  error?: string;
}

const AdminImportOdu: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [oduList, setOduList] = useState<OduData[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [previewOdu, setPreviewOdu] = useState<OduData | null>(null);
  const [options, setOptions] = useState({
    publishLessons: false,
    publishExercises: false,
  });

  // Fetch modules on mount
  React.useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('id, title, type')
        .order('display_order');
      
      if (error) throw error;
      setModules(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar módulos',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.json')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo JSON.',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    parseJsonFile(selectedFile);
  }, [toast]);

  const parseJsonFile = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Handle both array and object with array property
      let oduArray: OduData[] = [];
      if (Array.isArray(data)) {
        oduArray = data;
      } else if (data.odus && Array.isArray(data.odus)) {
        oduArray = data.odus;
      } else if (data.data && Array.isArray(data.data)) {
        oduArray = data.data;
      } else {
        // Single Odu object
        oduArray = [data];
      }

      // Validate that each item has a 'nome' field
      const validOdus = oduArray.filter(odu => odu.nome || odu.name || odu.titulo);
      
      // Normalize field names
      const normalizedOdus = validOdus.map(odu => ({
        ...odu,
        nome: odu.nome || odu.name || odu.titulo,
        verso: odu.verso || odu.verse || odu.poema || '',
        texto_principal: odu.texto_principal || odu.texto || odu.description || odu.descricao || '',
        significado: odu.significado || odu.meaning || odu.explicacao || '',
      }));

      setOduList(normalizedOdus);
      
      toast({
        title: 'Arquivo carregado!',
        description: `${normalizedOdus.length} Odu(s) encontrado(s) no arquivo.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao ler arquivo',
        description: 'O arquivo JSON está malformado ou inválido.',
        variant: 'destructive',
      });
      setOduList([]);
    } finally {
      setLoading(false);
    }
  };

  const generateExercisesForOdu = (odu: OduData) => {
    const exercises: any[] = [];
    const versoLines = (odu.verso || '').split('\n').filter(line => line.trim());
    
    // Exercise 1: Reading (Verso)
    if (odu.verso) {
      exercises.push({
        type: 'reading',
        title: `Verso: ${odu.nome}`,
        content: {
          text: odu.verso,
          audioUrl: null,
        },
      });
    }

    // Exercise 2: Reading (Contexto/Texto Principal)
    if (odu.texto_principal) {
      exercises.push({
        type: 'reading',
        title: `Contexto: ${odu.nome}`,
        content: {
          text: odu.texto_principal,
          audioUrl: null,
        },
      });
    }

    // Exercise 3: Memorization (Linhas do Verso)
    if (versoLines.length > 0) {
      exercises.push({
        type: 'memorization',
        title: `Memorizar: ${odu.nome}`,
        content: {
          items: versoLines.map((line, idx) => ({
            text: line,
            hint: `Linha ${idx + 1}`,
          })),
        },
      });
    }

    // Exercise 4: Drag-Drop (Ordenar Verso)
    if (versoLines.length >= 2) {
      const shuffledLines = [...versoLines].sort(() => Math.random() - 0.5);
      const targets = versoLines.map((_, idx) => `${idx + 1}ª Linha`);
      const correctMatches: Record<string, string> = {};
      versoLines.forEach((line, idx) => {
        correctMatches[line] = `${idx + 1}ª Linha`;
      });
      
      exercises.push({
        type: 'drag-drop',
        title: `Ordenar Verso: ${odu.nome}`,
        content: {
          items: shuffledLines,
          targets: targets,
          correctMatches: correctMatches,
        },
      });
    }

    // Exercise 5: Fill-Columns (Completar Lacunas)
    if (versoLines.length > 0) {
      const rows: string[][] = [];
      const blankPositions: { row: number; col: number }[] = [];
      
      versoLines.slice(0, 5).forEach((line, idx) => {
        const words = line.split(' ');
        if (words.length >= 3) {
          const blankIdx = Math.floor(words.length / 2);
          const answer = words[blankIdx];
          const lineWithBlank = words.map((w, i) => i === blankIdx ? '___' : w).join(' ');
          rows.push([lineWithBlank, answer]);
          blankPositions.push({ row: idx, col: 1 });
        } else {
          rows.push([line, '']);
        }
      });

      if (rows.length > 0 && blankPositions.length > 0) {
        exercises.push({
          type: 'fill-columns',
          title: `Completar Verso: ${odu.nome}`,
          content: {
            columns: ['Linha', 'Palavra Faltante'],
            rows: rows,
            blankPositions: blankPositions,
          },
        });
      }
    }

    // Exercise 6: Flashcard (Revisão)
    const flashcardCards = [];
    if (odu.nome) {
      flashcardCards.push({
        front: odu.nome,
        back: odu.significado || odu.texto_principal?.slice(0, 200) || 'Significado a ser adicionado',
      });
    }
    if (versoLines.length > 0) {
      flashcardCards.push({
        front: 'Primeira linha do verso',
        back: versoLines[0],
      });
    }
    if (flashcardCards.length > 0) {
      exercises.push({
        type: 'flashcard',
        title: `Revisão: ${odu.nome}`,
        content: {
          cards: flashcardCards,
        },
      });
    }

    // Exercise 7: Quiz (Avaliação) - Basic questions
    const quizQuestions = [];
    if (versoLines.length > 0) {
      const shuffledOptions = [...versoLines].sort(() => Math.random() - 0.5).slice(0, 3);
      if (!shuffledOptions.includes(versoLines[0])) {
        shuffledOptions[0] = versoLines[0];
      }
      shuffledOptions.sort(() => Math.random() - 0.5);
      
      quizQuestions.push({
        question: `Qual é a primeira linha do verso de ${odu.nome}?`,
        options: shuffledOptions,
        correctAnswer: shuffledOptions.indexOf(versoLines[0]),
      });
    }
    
    if (quizQuestions.length > 0) {
      exercises.push({
        type: 'quiz',
        title: `Avaliação: ${odu.nome}`,
        content: {
          questions: quizQuestions,
          passingScore: 70,
          timeLimit: null,
        },
      });
    }

    return exercises;
  };

  const handleImport = async () => {
    if (!selectedModuleId) {
      toast({
        title: 'Selecione um módulo',
        description: 'Escolha o módulo de destino para importar as lições.',
        variant: 'destructive',
      });
      return;
    }

    if (oduList.length === 0) {
      toast({
        title: 'Nenhum Odu para importar',
        description: 'Carregue um arquivo JSON com dados de Odu.',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportResults([]);

    const results: ImportResult[] = [];

    // Get current max display_order for lessons in the module
    const { data: existingLessons } = await supabase
      .from('lessons')
      .select('display_order')
      .eq('module_id', selectedModuleId)
      .order('display_order', { ascending: false })
      .limit(1);

    let lessonOrder = (existingLessons?.[0]?.display_order ?? -1) + 1;

    for (let i = 0; i < oduList.length; i++) {
      const odu = oduList[i];
      
      try {
        // Create lesson
        const { data: lesson, error: lessonError } = await supabase
          .from('lessons')
          .insert({
            module_id: selectedModuleId,
            title: odu.nome,
            description: odu.significado || odu.texto_principal?.slice(0, 200) || null,
            duration_minutes: 45,
            display_order: lessonOrder++,
            is_published: options.publishLessons,
          })
          .select()
          .single();

        if (lessonError) throw lessonError;

        // Generate and create exercises
        const exercises = generateExercisesForOdu(odu);
        let exercisesCreated = 0;

        for (let j = 0; j < exercises.length; j++) {
          const exercise = exercises[j];
          
          const { error: exerciseError } = await supabase
            .from('exercises')
            .insert({
              lesson_id: lesson.id,
              title: exercise.title,
              type: exercise.type,
              content: exercise.content,
              display_order: j,
              is_published: options.publishExercises,
            });

          if (!exerciseError) {
            exercisesCreated++;
          }
        }

        results.push({
          success: true,
          oduName: odu.nome,
          lessonId: lesson.id,
          exercisesCreated,
        });
      } catch (error: any) {
        results.push({
          success: false,
          oduName: odu.nome,
          error: error.message,
        });
      }

      setImportProgress(((i + 1) / oduList.length) * 100);
    }

    setImportResults(results);
    setImporting(false);
    setShowResultsDialog(true);

    const successCount = results.filter(r => r.success).length;
    toast({
      title: 'Importação concluída!',
      description: `${successCount} de ${oduList.length} Odu(s) importado(s) com sucesso.`,
    });
  };

  const clearFile = () => {
    setFile(null);
    setOduList([]);
  };

  return (
    <div className="min-h-screen bg-muted/30" data-allow-context-menu data-allow-copy>
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border z-50">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center shadow-gold">
                <span className="font-serif text-lg font-bold text-secondary">O</span>
              </div>
              <div>
                <h1 className="font-serif font-semibold text-sidebar-foreground">Admin</h1>
                <p className="text-xs text-sidebar-foreground/60">Offe Orunmila</p>
              </div>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link to="/admin" className="hover:text-foreground">Admin</Link>
          <span>/</span>
          <span className="text-foreground">Importar Odu</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/admin/modules')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="font-serif text-3xl font-bold text-foreground">
              Importar Odu via JSON
            </h1>
            <p className="text-muted-foreground mt-1">
              Carregue um arquivo JSON com dados de Odu para criar lições e exercícios automaticamente
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <FileJson className="w-5 h-5" />
                Arquivo JSON
              </CardTitle>
              <CardDescription>
                Selecione o arquivo com os dados de Odu exportados do isesemind
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!file ? (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                  <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Clique para selecionar ou arraste o arquivo
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Apenas arquivos .json
                  </span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <FileJson className="w-8 h-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {oduList.length} Odu(s) encontrado(s)
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearFile}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Processando arquivo...</span>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Formato esperado do JSON</AlertTitle>
                <AlertDescription className="text-xs mt-2">
                  <pre className="bg-muted p-2 rounded overflow-x-auto">
{`[
  {
    "nome": "Èjì Ògbè",
    "verso": "Linha 1\\nLinha 2...",
    "texto_principal": "Explicação...",
    "significado": "O que representa..."
  }
]`}
                  </pre>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Configurações de Importação</CardTitle>
              <CardDescription>
                Defina como os dados serão importados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Módulo de Destino</Label>
                <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map(module => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Publicar Lições</Label>
                    <p className="text-xs text-muted-foreground">
                      Lições serão visíveis imediatamente
                    </p>
                  </div>
                  <Switch
                    checked={options.publishLessons}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, publishLessons: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Publicar Exercícios</Label>
                    <p className="text-xs text-muted-foreground">
                      Exercícios serão visíveis imediatamente
                    </p>
                  </div>
                  <Switch
                    checked={options.publishExercises}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, publishExercises: checked }))}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Exercícios gerados por Odu:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Reading: Verso do Odu</li>
                  <li>Reading: Contexto/Texto Principal</li>
                  <li>Memorização: Linhas do Verso</li>
                  <li>Drag-Drop: Ordenar Verso</li>
                  <li>Fill-Columns: Completar Lacunas</li>
                  <li>Flashcard: Revisão</li>
                  <li>Quiz: Avaliação</li>
                </ol>
              </div>

              <Button 
                className="w-full gradient-gold text-secondary shadow-gold"
                onClick={handleImport}
                disabled={importing || oduList.length === 0 || !selectedModuleId}
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar {oduList.length} Odu(s)
                  </>
                )}
              </Button>

              {importing && (
                <div className="space-y-2">
                  <Progress value={importProgress} />
                  <p className="text-xs text-center text-muted-foreground">
                    {Math.round(importProgress)}% concluído
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Section */}
        {oduList.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Preview dos Odu ({oduList.length})
              </CardTitle>
              <CardDescription>
                Confira os dados que serão importados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {oduList.map((odu, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => setPreviewOdu(odu)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center shadow-gold">
                        <span className="font-serif font-bold text-secondary text-sm">
                          {odu.numero || index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{odu.nome}</h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {odu.categoria || 'Categoria não definida'}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Preview Dialog */}
      <Dialog open={!!previewOdu} onOpenChange={() => setPreviewOdu(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{previewOdu?.nome}</DialogTitle>
            <DialogDescription>
              {previewOdu?.categoria && `Categoria: ${previewOdu.categoria}`}
              {previewOdu?.numero && ` • Número: ${previewOdu.numero}`}
            </DialogDescription>
          </DialogHeader>
          
          {previewOdu && (
            <div className="space-y-4">
              {previewOdu.verso && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Verso:</h4>
                  <pre className="text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">
                    {previewOdu.verso}
                  </pre>
                </div>
              )}
              
              {previewOdu.texto_principal && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Texto Principal:</h4>
                  <p className="text-sm text-muted-foreground">
                    {previewOdu.texto_principal}
                  </p>
                </div>
              )}
              
              {previewOdu.significado && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Significado:</h4>
                  <p className="text-sm text-muted-foreground">
                    {previewOdu.significado}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-sm mb-2">Exercícios que serão gerados:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {generateExercisesForOdu(previewOdu).map((ex, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {ex.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Resultado da Importação</DialogTitle>
            <DialogDescription>
              {importResults.filter(r => r.success).length} de {importResults.length} Odu(s) importado(s)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {importResults.map((result, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg flex items-center gap-3 ${
                  result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{result.oduName}</p>
                  {result.success ? (
                    <p className="text-xs text-green-600">
                      {result.exercisesCreated} exercícios criados
                    </p>
                  ) : (
                    <p className="text-xs text-red-600">{result.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowResultsDialog(false)}
            >
              Fechar
            </Button>
            {selectedModuleId && (
              <Button 
                className="flex-1 gradient-gold text-secondary"
                onClick={() => navigate(`/admin/modules/${selectedModuleId}/lessons`)}
              >
                Ver Lições
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminImportOdu;

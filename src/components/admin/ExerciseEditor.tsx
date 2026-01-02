import React, { useState } from 'react';
import { ArrowLeft, Save, Eye, EyeOff, Mic, Plus, Trash2, GripVertical, Sparkles, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import MediaUploader from './MediaUploader';
import { generateSummary, generateIntermediateText, countWords } from '@/lib/textChunking';

interface Exercise {
  id: string;
  lesson_id: string;
  type: 'reading' | 'drag-drop' | 'fill-columns' | 'flashcard' | 'video' | 'memorization' | 'quiz';
  title: string;
  content: Record<string, any>;
  display_order: number;
  is_published: boolean;
  created_at: string;
}

interface ExerciseEditorProps {
  exercise: Exercise;
  onSave: (exercise: Exercise) => void;
  onCancel: () => void;
}

const ExerciseEditor: React.FC<ExerciseEditorProps> = ({ exercise, onSave, onCancel }) => {
  const { toast } = useToast();
  const [editedExercise, setEditedExercise] = useState<Exercise>(exercise);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const updateContent = (key: string, value: any) => {
    setEditedExercise({
      ...editedExercise,
      content: {
        ...editedExercise.content,
        [key]: value,
      },
    });
  };

  const handleGenerateAudio = async () => {
    if (!editedExercise.content.text) {
      toast({
        title: 'Texto necessário',
        description: 'Adicione o texto antes de gerar o áudio.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingAudio(true);
    toast({
      title: 'Gerando áudio...',
      description: 'Aguarde enquanto o áudio é gerado com IA.',
    });

    // TODO: Integrate with ElevenLabs
    setTimeout(() => {
      setIsGeneratingAudio(false);
      toast({
        title: 'Áudio gerado!',
        description: 'O áudio foi gerado com sucesso.',
      });
      updateContent('audioUrl', 'https://example.com/audio.mp3');
    }, 2000);
  };

  const renderReadingEditor = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="reading-text">Texto para Leitura</Label>
        <Textarea
          id="reading-text"
          placeholder="Digite o texto que será lido pelo aluno..."
          value={editedExercise.content.text || ''}
          onChange={(e) => updateContent('text', e.target.value)}
          className="min-h-[200px] font-serif"
        />
        <p className="text-sm text-muted-foreground">
          {(editedExercise.content.text || '').split(/\s+/).filter(Boolean).length} palavras
        </p>
      </div>

      <div className="space-y-2">
        <Label>Áudio (opcional)</Label>
        <MediaUploader
          exerciseId={exercise.id}
          lessonId={exercise.lesson_id}
          onUploadComplete={(url) => updateContent('audioUrl', url)}
          acceptedTypes="audio/*"
          label="Enviar áudio"
          currentUrl={editedExercise.content.audioUrl}
        />
        <div className="flex gap-3 mt-2">
          <Input
            placeholder="Ou cole a URL do áudio"
            value={editedExercise.content.audioUrl || ''}
            onChange={(e) => updateContent('audioUrl', e.target.value)}
            className="flex-1"
          />
          <Button 
            variant="outline" 
            onClick={handleGenerateAudio}
            disabled={isGeneratingAudio}
          >
            <Mic className="w-4 h-4 mr-2" />
            {isGeneratingAudio ? 'Gerando...' : 'Gerar com IA'}
          </Button>
        </div>
        {editedExercise.content.audioUrl && (
          <audio controls className="w-full mt-2">
            <source src={editedExercise.content.audioUrl} type="audio/mpeg" />
          </audio>
        )}
      </div>

      <div className="space-y-2">
        <Label>Imagem Ilustrativa (opcional)</Label>
        <MediaUploader
          exerciseId={exercise.id}
          lessonId={exercise.lesson_id}
          onUploadComplete={(url) => updateContent('imageUrl', url)}
          acceptedTypes="image/*"
          label="Enviar imagem"
          currentUrl={editedExercise.content.imageUrl}
        />
      </div>

      <div className="space-y-2">
        <Label>Ou cole a URL da imagem</Label>
        <Input
          placeholder="https://exemplo.com/imagem.jpg"
          value={editedExercise.content.imageUrl || ''}
          onChange={(e) => updateContent('imageUrl', e.target.value)}
        />
      </div>
    </div>
  );

  const renderFlashcardEditor = () => {
    const cards = editedExercise.content.cards || [{ front: '', back: '' }];

    const addCard = () => {
      updateContent('cards', [...cards, { front: '', back: '' }]);
    };

    const updateCard = (index: number, field: 'front' | 'back', value: string) => {
      const newCards = [...cards];
      newCards[index] = { ...newCards[index], [field]: value };
      updateContent('cards', newCards);
    };

    const removeCard = (index: number) => {
      if (cards.length > 1) {
        updateContent('cards', cards.filter((_: any, i: number) => i !== index));
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Label>Cartões ({cards.length})</Label>
          <Button variant="outline" size="sm" onClick={addCard}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Cartão
          </Button>
        </div>

        <div className="space-y-4">
          {cards.map((card: { front: string; back: string }, index: number) => (
            <div 
              key={index} 
              className="bg-muted/50 rounded-xl p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Cartão {index + 1}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeCard(index)}
                  disabled={cards.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frente</Label>
                  <Textarea
                    placeholder="Pergunta ou termo"
                    value={card.front}
                    onChange={(e) => updateCard(index, 'front', e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Verso</Label>
                  <Textarea
                    placeholder="Resposta ou definição"
                    value={card.back}
                    onChange={(e) => updateCard(index, 'back', e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDragDropEditor = () => {
    const items = editedExercise.content.items || [];
    const targets = editedExercise.content.targets || [];
    const correctMatches = editedExercise.content.correctMatches || {};

    const addItem = () => {
      updateContent('items', [...items, `Item ${items.length + 1}`]);
    };

    const addTarget = () => {
      updateContent('targets', [...targets, `Alvo ${targets.length + 1}`]);
    };

    const updateItem = (index: number, value: string) => {
      const newItems = [...items];
      newItems[index] = value;
      updateContent('items', newItems);
    };

    const updateTarget = (index: number, value: string) => {
      const newTargets = [...targets];
      newTargets[index] = value;
      updateContent('targets', newTargets);
    };

    const removeItem = (index: number) => {
      updateContent('items', items.filter((_: any, i: number) => i !== index));
    };

    const removeTarget = (index: number) => {
      updateContent('targets', targets.filter((_: any, i: number) => i !== index));
    };

    const updateMatch = (target: string, item: string) => {
      updateContent('correctMatches', { ...correctMatches, [target]: item });
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Itens para Arrastar ({items.length})</Label>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) => updateItem(index, e.target.value)}
                    placeholder={`Item ${index + 1}`}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Targets */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Alvos de Destino ({targets.length})</Label>
              <Button variant="outline" size="sm" onClick={addTarget}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {targets.map((target: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={target}
                    onChange={(e) => updateTarget(index, e.target.value)}
                    placeholder={`Alvo ${index + 1}`}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeTarget(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Correct Matches */}
        {targets.length > 0 && items.length > 0 && (
          <div className="space-y-4">
            <Label>Correspondências Corretas</Label>
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              {targets.map((target: string, index: number) => (
                <div key={index} className="flex items-center gap-4">
                  <span className="font-medium min-w-[150px]">{target}</span>
                  <span className="text-muted-foreground">→</span>
                  <select
                    value={correctMatches[target] || ''}
                    onChange={(e) => updateMatch(target, e.target.value)}
                    className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecione o item correto</option>
                    {items.map((item: string, i: number) => (
                      <option key={i} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderVideoEditor = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Upload de Vídeo</Label>
        <MediaUploader
          exerciseId={exercise.id}
          lessonId={exercise.lesson_id}
          onUploadComplete={(url) => updateContent('videoUrl', url)}
          acceptedTypes="video/*"
          maxSizeMB={100}
          label="Enviar vídeo (até 100MB)"
          currentUrl={editedExercise.content.videoUrl}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="video-url">Ou cole a URL do Vídeo</Label>
        <Input
          id="video-url"
          placeholder="https://www.youtube.com/watch?v=... ou URL do vídeo"
          value={editedExercise.content.videoUrl || ''}
          onChange={(e) => updateContent('videoUrl', e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Suporta YouTube, Vimeo ou URL direta de vídeo
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="video-description">Descrição</Label>
        <Textarea
          id="video-description"
          placeholder="Descreva o conteúdo do vídeo..."
          value={editedExercise.content.description || ''}
          onChange={(e) => updateContent('description', e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      {editedExercise.content.videoUrl && (
        <div className="aspect-video bg-muted rounded-xl flex items-center justify-center overflow-hidden">
          {editedExercise.content.videoUrl.includes('youtube') || editedExercise.content.videoUrl.includes('vimeo') ? (
            <p className="text-muted-foreground">Preview disponível para o aluno</p>
          ) : (
            <video controls className="w-full h-full object-contain">
              <source src={editedExercise.content.videoUrl} type="video/mp4" />
            </video>
          )}
        </div>
      )}
    </div>
  );

  const renderFillColumnsEditor = () => {
    const columns = editedExercise.content.columns || ['Coluna 1', 'Coluna 2'];
    const rawRows = editedExercise.content.rows || [];

    // Normalizar estrutura de dados (suporta formato antigo com cells e novo com arrays)
    const rows: string[][] = rawRows.map((row: any) => {
      // Se já é array de strings, retornar como está
      if (Array.isArray(row) && (row.length === 0 || typeof row[0] === 'string')) {
        return row;
      }
      // Se é objeto com cells, converter para array de strings
      if (row && row.cells && Array.isArray(row.cells)) {
        return row.cells.map((cell: any) => cell.text || cell || '');
      }
      // Fallback: criar array vazio com tamanho das colunas
      return columns.map(() => '');
    });

    const addColumn = () => {
      updateContent('columns', [...columns, `Coluna ${columns.length + 1}`]);
      // Add empty cell to each row
      const newRows = rows.map((row: string[]) => [...row, '']);
      updateContent('rows', newRows);
    };

    const addRow = () => {
      const newRow = columns.map(() => '');
      updateContent('rows', [...rows, newRow]);
    };

    const updateColumn = (index: number, value: string) => {
      const newColumns = [...columns];
      newColumns[index] = value;
      updateContent('columns', newColumns);
    };

    const updateCell = (rowIndex: number, colIndex: number, value: string) => {
      const newRows = [...rows];
      newRows[rowIndex] = [...newRows[rowIndex]];
      newRows[rowIndex][colIndex] = value;
      updateContent('rows', newRows);
    };

    const removeRow = (index: number) => {
      updateContent('rows', rows.filter((_: any, i: number) => i !== index));
    };

    return (
      <div className="space-y-6">
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={addColumn}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Coluna
          </Button>
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Linha
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {columns.map((col: string, index: number) => (
                  <th key={index} className="p-2">
                    <Input
                      value={col}
                      onChange={(e) => updateColumn(index, e.target.value)}
                      className="font-semibold text-center"
                    />
                  </th>
                ))}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: string[], rowIndex: number) => (
                <tr key={rowIndex}>
                  {row.map((cell: string, colIndex: number) => (
                    <td key={colIndex} className="p-2">
                      <Input
                        value={cell}
                        onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                        placeholder={`Célula ${rowIndex + 1}-${colIndex + 1}`}
                      />
                    </td>
                  ))}
                  <td className="p-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeRow(rowIndex)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderMemorizationEditor = () => {
    const items = editedExercise.content.items || [];

    const addItem = () => {
      updateContent('items', [...items, { text: '', hint: '', summary: '', intermediate: '' }]);
    };

    const updateItem = (index: number, field: string, value: string) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: value };
      updateContent('items', newItems);
    };

    const removeItem = (index: number) => {
      updateContent('items', items.filter((_: any, i: number) => i !== index));
    };

    const handleAutoGenerate = (index: number) => {
      const item = items[index];
      if (!item.text) {
        toast({
          title: 'Texto necessário',
          description: 'Adicione o texto completo primeiro.',
          variant: 'destructive',
        });
        return;
      }
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        summary: generateSummary(item.text),
        intermediate: generateIntermediateText(item.text),
      };
      updateContent('items', newItems);
      toast({
        title: 'Gerado com sucesso!',
        description: 'Resumo e versão intermediária foram gerados automaticamente.',
      });
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Label>Itens para Memorização ({items.length})</Label>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Item
          </Button>
        </div>

        <div className="space-y-4">
          {items.map((item: { text: string; hint: string; summary?: string; intermediate?: string }, index: number) => (
            <div 
              key={index} 
              className="bg-muted/50 rounded-xl p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Item {index + 1}</span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAutoGenerate(index)}
                    disabled={!item.text}
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Auto Gerar
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Nível 1 - Resumo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Nível 1 - Resumo (5-10 palavras)</Label>
                  <span className="text-xs text-muted-foreground">{countWords(item.summary || '')} palavras</span>
                </div>
                <Textarea
                  placeholder="Resumo curto do texto..."
                  value={item.summary || ''}
                  onChange={(e) => updateItem(index, 'summary', e.target.value)}
                  className="min-h-[60px] text-sm"
                />
              </div>

              {/* Nível 2 - Intermediário */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Nível 2 - Intermediário (20-40 palavras)</Label>
                  <span className="text-xs text-muted-foreground">{countWords(item.intermediate || '')} palavras</span>
                </div>
                <Textarea
                  placeholder="Versão intermediária do texto..."
                  value={item.intermediate || ''}
                  onChange={(e) => updateItem(index, 'intermediate', e.target.value)}
                  className="min-h-[80px] text-sm"
                />
              </div>

              {/* Nível 3 - Texto Completo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Nível 3 - Texto Completo</Label>
                  <span className="text-xs text-muted-foreground">{countWords(item.text)} palavras</span>
                </div>
                <Textarea
                  placeholder="Digite o texto ou conceito completo..."
                  value={item.text}
                  onChange={(e) => updateItem(index, 'text', e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Dica (opcional)</Label>
                <Input
                  placeholder="Uma dica para ajudar na memorização"
                  value={item.hint}
                  onChange={(e) => updateItem(index, 'hint', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEditor = () => {
    switch (editedExercise.type) {
      case 'reading':
        return renderReadingEditor();
      case 'flashcard':
        return renderFlashcardEditor();
      case 'drag-drop':
        return renderDragDropEditor();
      case 'fill-columns':
        return renderFillColumnsEditor();
      case 'video':
        return renderVideoEditor();
      case 'memorization':
        return renderMemorizationEditor();
      default:
        return <p>Tipo de exercício não suportado</p>;
    }
  };

  const getTypeLabel = () => {
    const labels: Record<string, string> = {
      'reading': 'Leitura Guiada',
      'flashcard': 'Flash Cards',
      'drag-drop': 'Arrastar e Soltar',
      'fill-columns': 'Preencher Colunas',
      'video': 'Vídeo Aula',
      'memorization': 'Memorização',
    };
    return labels[editedExercise.type] || editedExercise.type;
  };

  return (
    <div className="space-y-6" data-allow-context-menu data-allow-copy>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Editar Exercício
          </h1>
          <p className="text-muted-foreground text-sm">
            {getTypeLabel()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={editedExercise.is_published}
              onCheckedChange={(checked) => setEditedExercise({ ...editedExercise, is_published: checked })}
            />
            <span className="text-sm text-muted-foreground">
              {editedExercise.is_published ? (
                <span className="flex items-center gap-1 text-green-600">
                  <Eye className="w-4 h-4" /> Publicado
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <EyeOff className="w-4 h-4" /> Rascunho
                </span>
              )}
            </span>
          </div>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            className="gradient-gold text-secondary shadow-gold"
            onClick={() => {
              // Normalizar dados de fill-columns antes de salvar
              let exerciseToSave = editedExercise;
              if (editedExercise.type === 'fill-columns' && editedExercise.content.rows) {
                const normalizedRows = editedExercise.content.rows.map((row: any) => {
                  // Se já é array de strings, manter
                  if (Array.isArray(row) && (row.length === 0 || typeof row[0] === 'string')) {
                    return row;
                  }
                  // Se é objeto com cells, converter
                  if (row && row.cells && Array.isArray(row.cells)) {
                    return row.cells.map((cell: any) => cell.text || cell || '');
                  }
                  return row;
                });
                exerciseToSave = {
                  ...editedExercise,
                  content: {
                    ...editedExercise.content,
                    rows: normalizedRows,
                  },
                };
              }
              onSave(exerciseToSave);
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="bg-card rounded-xl border border-border p-6">
        <Label htmlFor="exercise-title" className="text-base font-semibold">
          Título do Exercício
        </Label>
        <Input
          id="exercise-title"
          value={editedExercise.title}
          onChange={(e) => setEditedExercise({ ...editedExercise, title: e.target.value })}
          className="mt-2"
          placeholder="Digite o título do exercício..."
        />
      </div>

      {/* Editor Content */}
      <div className="bg-card rounded-xl border border-border shadow-soft p-6">
        {renderEditor()}
      </div>
    </div>
  );
};

export default ExerciseEditor;

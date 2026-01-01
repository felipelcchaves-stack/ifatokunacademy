import React, { useState } from 'react';
import { Check, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DragDropExerciseProps {
  items: string[];
  targets: string[];
  correctMatches: Record<string, string>;
  onComplete?: () => void;
}

const DragDropExercise: React.FC<DragDropExerciseProps> = ({
  items,
  targets,
  correctMatches,
  onComplete,
}) => {
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [availableItems, setAvailableItems] = useState<string[]>(items);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});

  const handleDragStart = (item: string) => {
    setDraggedItem(item);
  };

  const handleDrop = (target: string) => {
    if (draggedItem) {
      // Remove from previous target if exists
      const previousTarget = Object.entries(matches).find(([_, v]) => v === draggedItem)?.[0];
      if (previousTarget) {
        const newMatches = { ...matches };
        delete newMatches[previousTarget];
        setMatches({ ...newMatches, [target]: draggedItem });
      } else {
        setMatches({ ...matches, [target]: draggedItem });
        setAvailableItems(availableItems.filter(i => i !== draggedItem));
      }
      setDraggedItem(null);
      setIsChecked(false);
    }
  };

  const handleRemoveMatch = (target: string) => {
    const item = matches[target];
    if (item) {
      const newMatches = { ...matches };
      delete newMatches[target];
      setMatches(newMatches);
      setAvailableItems([...availableItems, item]);
      setIsChecked(false);
    }
  };

  const handleCheck = () => {
    const newResults: Record<string, boolean> = {};
    let allCorrect = true;

    targets.forEach(target => {
      const matchedItem = matches[target];
      const isCorrect = matchedItem && correctMatches[matchedItem] === target;
      newResults[target] = isCorrect;
      if (!isCorrect) allCorrect = false;
    });

    setResults(newResults);
    setIsChecked(true);

    if (allCorrect) {
      onComplete?.();
    }
  };

  const handleReset = () => {
    setMatches({});
    setAvailableItems(items);
    setIsChecked(false);
    setResults({});
  };

  return (
    <div className="protected-content w-full max-w-2xl mx-auto">
      {/* Available Items */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Arraste os itens:</h3>
        <div className="flex flex-wrap gap-3">
          {availableItems.map((item) => (
            <div
              key={item}
              draggable
              onDragStart={() => handleDragStart(item)}
              className="px-4 py-2 bg-card border border-border rounded-lg cursor-grab active:cursor-grabbing hover:border-primary hover:shadow-soft transition-all"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Drop Targets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {targets.map((target) => (
          <div
            key={target}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(target)}
            className={`
              p-4 rounded-xl border-2 border-dashed min-h-[80px] transition-all
              ${matches[target] ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}
              ${isChecked && results[target] !== undefined ? (results[target] ? 'border-green-500 bg-green-50' : 'border-destructive bg-red-50') : ''}
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-foreground">{target}</span>
              {isChecked && results[target] !== undefined && (
                results[target] ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <X className="w-5 h-5 text-destructive" />
                )
              )}
            </div>
            {matches[target] ? (
              <div 
                className="px-3 py-1.5 bg-primary/10 text-primary rounded-md inline-flex items-center gap-2 cursor-pointer"
                onClick={() => handleRemoveMatch(target)}
              >
                {matches[target]}
                <X className="w-3 h-3" />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Solte aqui</span>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Button
          variant="outline"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Recomeçar
        </Button>
        <Button
          className="gradient-gold text-secondary shadow-gold"
          onClick={handleCheck}
          disabled={Object.keys(matches).length !== targets.length}
        >
          Verificar Respostas
        </Button>
      </div>
    </div>
  );
};

export default DragDropExercise;

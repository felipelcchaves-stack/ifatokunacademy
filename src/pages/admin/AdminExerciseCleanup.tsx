import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Search,
  Eye,
  RotateCcw,
  FolderOpen,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAdminOrganization } from '@/hooks/useAdminOrganization';
import { supabase } from '@/integrations/supabase/client';

interface LessonWithExercises {
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  moduleTitle: string;
  totalExercises: number;
  exercises: {
    id: string;
    title: string;
    type: string;
    display_order: number;
  }[];
  toDelete: string[]; // IDs to delete
  toKeep: string[]; // IDs to keep
}

interface ModuleGroup {
  moduleId: string;
  moduleTitle: string;
  lessons: LessonWithExercises[];
  totalToDelete: number;
}

// Optimal structure per lesson (7 exercises)
const OPTIMAL_STRUCTURE = {
  'reading': 2,      // 1 per phase
  'memorization': 2, // 1 per phase
  'tap-complete': 1, // 1 consolidated
  'drag-drop': 1,    // 1 consolidated
  'fill-blanks': 1,  // 1 (optional)
  'flashcard': 1,    // 1 (optional)
};

const MAX_EXERCISES_PER_LESSON = 15;

const AdminExerciseCleanup: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useAdminOrganization();
  
  const [lessons, setLessons] = useState<LessonWithExercises[]>([]);
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
  const [stats, setStats] = useState({ 
    totalLessons: 0, 
    lessonsWithExcess: 0, 
    totalExercises: 0,
    exercisesToDelete: 0 
  });

  useEffect(() => {
    if (!orgLoading && activeOrg) {
      fetchLessonsWithExcess();
    }
  }, [activeOrg, orgLoading]);

  // Group lessons by module
  const groupedByModule = useMemo((): ModuleGroup[] => {
    const groups: Record<string, ModuleGroup> = {};
    
    lessons.forEach(lesson => {
      const key = lesson.moduleId;
      if (!groups[key]) {
        groups[key] = {
          moduleId: lesson.moduleId,
          moduleTitle: lesson.moduleTitle,
          lessons: [],
          totalToDelete: 0,
        };
      }
      groups[key].lessons.push(lesson);
      groups[key].totalToDelete += lesson.toDelete.length;
    });
    
    return Object.values(groups).sort((a, b) => b.totalToDelete - a.totalToDelete);
  }, [lessons]);

  // Get unique modules for filter dropdown
  const moduleOptions = useMemo(() => {
    return groupedByModule.map(g => ({
      id: g.moduleId,
      title: g.moduleTitle,
      count: g.lessons.length,
    }));
  }, [groupedByModule]);

  const calculateOptimalDeletions = (exercises: LessonWithExercises['exercises']): { toDelete: string[], toKeep: string[] } => {
    const toKeep: string[] = [];
    const toDelete: string[] = [];
    
    // Group by type
    const byType: Record<string, typeof exercises> = {};
    exercises.forEach(ex => {
      if (!byType[ex.type]) byType[ex.type] = [];
      byType[ex.type].push(ex);
    });
    
    // For each type, keep only optimal number
    Object.entries(byType).forEach(([type, exList]) => {
      const sortedByOrder = [...exList].sort((a, b) => a.display_order - b.display_order);
      const keepCount = OPTIMAL_STRUCTURE[type as keyof typeof OPTIMAL_STRUCTURE] || 1;
      
      // Prioritize keeping: first by display_order (earlier = more important)
      sortedByOrder.forEach((ex, idx) => {
        if (idx < keepCount) {
          toKeep.push(ex.id);
        } else {
          toDelete.push(ex.id);
        }
      });
    });
    
    return { toDelete, toKeep };
  };

  const fetchLessonsWithExcess = async () => {
    if (!activeOrg) return;
    
    try {
      setLoading(true);
      
      // MULTI-TENANT STRICT: Filtrar por organização via join com modules
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          modules!inner (
            id,
            title,
            organization_id
          ),
          exercises (
            id,
            title,
            type,
            display_order
          )
        `)
        .eq('modules.organization_id', activeOrg.id)
        .order('created_at', { ascending: false });

      if (lessonsError) throw lessonsError;

      const processed: LessonWithExercises[] = [];
      let totalExercises = 0;
      let exercisesToDelete = 0;

      for (const lesson of lessonsData || []) {
        const exerciseList = lesson.exercises || [];
        totalExercises += exerciseList.length;
        
        if (exerciseList.length > MAX_EXERCISES_PER_LESSON) {
          const { toDelete, toKeep } = calculateOptimalDeletions(exerciseList);
          exercisesToDelete += toDelete.length;
          
          processed.push({
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            moduleId: (lesson.modules as any)?.id || '',
            moduleTitle: (lesson.modules as any)?.title || 'Sem módulo',
            totalExercises: exerciseList.length,
            exercises: exerciseList,
            toDelete,
            toKeep,
          });
        }
      }

      // Sort by total exercises (most first)
      processed.sort((a, b) => b.totalExercises - a.totalExercises);

      setLessons(processed);
      setStats({
        totalLessons: lessonsData?.length || 0,
        lessonsWithExcess: processed.length,
        totalExercises,
        exercisesToDelete,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar lições',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleLesson = (lessonId: string) => {
    setSelectedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedLessons.size === filteredLessons.length) {
      setSelectedLessons(new Set());
    } else {
      setSelectedLessons(new Set(filteredLessons.map(l => l.lessonId)));
    }
  };

  // Select/deselect all lessons in a module
  const toggleModuleSelection = (moduleId: string) => {
    const moduleLessons = lessons.filter(l => l.moduleId === moduleId);
    const allSelected = moduleLessons.every(l => selectedLessons.has(l.lessonId));
    
    setSelectedLessons(prev => {
      const newSet = new Set(prev);
      moduleLessons.forEach(l => {
        if (allSelected) {
          newSet.delete(l.lessonId);
        } else {
          newSet.add(l.lessonId);
        }
      });
      return newSet;
    });
  };

  // Check if all lessons in module are selected
  const isModuleFullySelected = (moduleId: string) => {
    const moduleLessons = lessons.filter(l => l.moduleId === moduleId);
    return moduleLessons.length > 0 && moduleLessons.every(l => selectedLessons.has(l.lessonId));
  };

  // Check if some (but not all) lessons in module are selected
  const isModulePartiallySelected = (moduleId: string) => {
    const moduleLessons = lessons.filter(l => l.moduleId === moduleId);
    const selectedCount = moduleLessons.filter(l => selectedLessons.has(l.lessonId)).length;
    return selectedCount > 0 && selectedCount < moduleLessons.length;
  };

  // Apply both filters: module and search
  const filteredLessons = useMemo(() => {
    let result = lessons;
    
    // Filter by module
    if (selectedModuleFilter !== 'all') {
      result = result.filter(l => l.moduleId === selectedModuleFilter);
    }
    
    // Filter by search
    if (searchQuery) {
      result = result.filter(l => 
        l.lessonTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.moduleTitle.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return result;
  }, [lessons, selectedModuleFilter, searchQuery]);

  // Group filtered lessons by module for display
  const filteredGroupedByModule = useMemo((): ModuleGroup[] => {
    const groups: Record<string, ModuleGroup> = {};
    
    filteredLessons.forEach(lesson => {
      const key = lesson.moduleId;
      if (!groups[key]) {
        groups[key] = {
          moduleId: lesson.moduleId,
          moduleTitle: lesson.moduleTitle,
          lessons: [],
          totalToDelete: 0,
        };
      }
      groups[key].lessons.push(lesson);
      groups[key].totalToDelete += lesson.toDelete.length;
    });
    
    return Object.values(groups).sort((a, b) => b.totalToDelete - a.totalToDelete);
  }, [filteredLessons]);

  const handleCleanup = async () => {
    const selectedList = lessons.filter(l => selectedLessons.has(l.lessonId));
    
    if (selectedList.length === 0) {
      toast({
        title: 'Nenhuma lição selecionada',
        description: 'Selecione pelo menos uma lição para limpar.',
        variant: 'destructive',
      });
      return;
    }

    setCleaning(true);
    setProgress(0);
    setShowConfirmDialog(false);

    let deletedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedList.length; i++) {
      const lesson = selectedList[i];
      
      try {
        if (lesson.toDelete.length > 0) {
          const { error } = await supabase
            .from('exercises')
            .delete()
            .in('id', lesson.toDelete);

          if (error) throw error;
          deletedCount += lesson.toDelete.length;
        }
      } catch (error: any) {
        console.error(`Error cleaning lesson ${lesson.lessonId}:`, error);
        errorCount++;
      }

      setProgress(((i + 1) / selectedList.length) * 100);
    }

    setCleaning(false);

    toast({
      title: 'Limpeza concluída!',
      description: `${deletedCount} exercícios removidos de ${selectedList.length - errorCount} lições.`,
    });

    // Refresh data
    fetchLessonsWithExcess();
    setSelectedLessons(new Set());
  };

  const getTotalToDelete = () => {
    return lessons
      .filter(l => selectedLessons.has(l.lessonId))
      .reduce((sum, l) => sum + l.toDelete.length, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/admin" className="hover:text-foreground">Admin</Link>
        <span>/</span>
        <span className="text-foreground">Limpeza de Exercícios</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Limpeza de Exercícios Excessivos
          </h1>
          <p className="text-muted-foreground">
            Otimize lições com mais de {MAX_EXERCISES_PER_LESSON} exercícios para o padrão de 7-9 exercícios
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.totalLessons}</p>
          <p className="text-sm text-muted-foreground">Total de Lições</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.lessonsWithExcess}</p>
          <p className="text-sm text-muted-foreground">Com excesso ({'>'}15)</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.totalExercises}</p>
          <p className="text-sm text-muted-foreground">Total Exercícios</p>
        </div>
        <div className="bg-card border border-red-500/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.exercisesToDelete}</p>
          <p className="text-sm text-muted-foreground">Para remover</p>
        </div>
      </div>

      {/* Optimal structure info */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Estrutura Otimizada (7-9 exercícios por lição):</p>
            <div className="grid grid-cols-3 gap-2 mt-2 text-sm text-muted-foreground">
              <span>• 2 Reading (1/fase)</span>
              <span>• 2 Memorização (1/fase)</span>
              <span>• 1 TapComplete (consolidado)</span>
              <span>• 1 Drag&Drop (consolidado)</span>
              <span>• 1 Fill-Blanks</span>
              <span>• 1 Flashcard</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      {cleaning && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground font-medium">Limpando exercícios...</span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* No excess lessons */}
      {lessons.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="font-medium text-lg text-foreground mb-2">Tudo otimizado!</h3>
          <p className="text-muted-foreground">
            Nenhuma lição com mais de {MAX_EXERCISES_PER_LESSON} exercícios encontrada.
          </p>
        </div>
      )}

      {/* Lessons list */}
      {lessons.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          {/* Filters and actions bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Checkbox 
                checked={selectedLessons.size === filteredLessons.length && filteredLessons.length > 0}
                onCheckedChange={selectAll}
              />
              <span className="font-medium text-foreground">
                {selectedLessons.size} de {filteredLessons.length} selecionadas
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Module filter dropdown */}
              <Select value={selectedModuleFilter} onValueChange={setSelectedModuleFilter}>
                <SelectTrigger className="w-[220px]">
                  <FolderOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filtrar por módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os módulos ({lessons.length})</SelectItem>
                  {moduleOptions.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title} ({m.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar lição..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-56"
                />
              </div>
              
              {/* Clean button */}
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={cleaning || selectedLessons.size === 0}
                variant="destructive"
              >
                {cleaning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Limpando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar ({getTotalToDelete()})
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Grouped lessons by module */}
          <div className="space-y-4">
            {filteredGroupedByModule.map(moduleGroup => (
              <div key={moduleGroup.moduleId} className="border border-border rounded-lg overflow-hidden">
                {/* Module header with selection */}
                <div 
                  className="flex items-center gap-3 p-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => toggleModuleSelection(moduleGroup.moduleId)}
                >
                  <Checkbox 
                    checked={isModuleFullySelected(moduleGroup.moduleId)}
                    // @ts-ignore - indeterminate is valid
                    data-state={isModulePartiallySelected(moduleGroup.moduleId) ? 'indeterminate' : undefined}
                    className={isModulePartiallySelected(moduleGroup.moduleId) ? 'data-[state=indeterminate]:bg-primary/50' : ''}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => toggleModuleSelection(moduleGroup.moduleId)}
                  />
                  <FolderOpen className="w-4 h-4 text-primary" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="font-medium text-foreground">{moduleGroup.moduleTitle}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {moduleGroup.lessons.length} lições
                      </Badge>
                      <Badge variant="outline" className="text-red-600 border-red-300">
                        -{moduleGroup.totalToDelete} exercícios
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Lessons in this module */}
                <Accordion type="multiple" className="border-t border-border">
                  {moduleGroup.lessons.map(lesson => (
                    <AccordionItem 
                      key={lesson.lessonId} 
                      value={lesson.lessonId}
                      className="border-b border-border last:border-b-0"
                    >
                      <div className="flex items-center gap-3 py-3 px-4">
                        <Checkbox 
                          checked={selectedLessons.has(lesson.lessonId)}
                          onCheckedChange={() => toggleLesson(lesson.lessonId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <AccordionTrigger className="flex-1 hover:no-underline py-0">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="text-left flex-1">
                              <p className="font-medium text-foreground">{lesson.lessonTitle}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive">
                                {lesson.totalExercises} exercícios
                              </Badge>
                              <Badge variant="outline" className="text-red-600 border-red-300">
                                -{lesson.toDelete.length}
                              </Badge>
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                ={lesson.toKeep.length} restantes
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                      </div>
                      <AccordionContent>
                        <div className="pb-4 px-4">
                          <div className="grid grid-cols-2 gap-4">
                            {/* To Keep */}
                            <div>
                              <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Manter ({lesson.toKeep.length})
                              </h4>
                              <div className="space-y-1">
                                {lesson.exercises
                                  .filter(e => lesson.toKeep.includes(e.id))
                                  .map(ex => (
                                    <div key={ex.id} className="text-sm p-2 bg-green-50 dark:bg-green-950/30 rounded flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">{ex.type}</Badge>
                                      <span className="truncate">{ex.title}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                            {/* To Delete */}
                            <div>
                              <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                                <Trash2 className="w-4 h-4" />
                                Remover ({lesson.toDelete.length})
                              </h4>
                              <div className="space-y-1 max-h-60 overflow-y-auto">
                                {lesson.exercises
                                  .filter(e => lesson.toDelete.includes(e.id))
                                  .map(ex => (
                                    <div key={ex.id} className="text-sm p-2 bg-red-50 dark:bg-red-950/30 rounded flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">{ex.type}</Badge>
                                      <span className="truncate">{ex.title}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Limpeza
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a remover <strong className="text-red-600">{getTotalToDelete()} exercícios</strong> de{' '}
              <strong>{selectedLessons.size} lições</strong>.
              <br /><br />
              Esta ação <strong>não pode ser desfeita</strong>. Os exercícios serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCleanup}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar Limpeza
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminExerciseCleanup;

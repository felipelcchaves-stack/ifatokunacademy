import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ModuleCompletion {
  moduleId: string;
  quizScore: number;
}

interface PhaseProgress {
  moduleId: string;
  phase1CompletedAt: string | null;
  phase2CompletedAt: string | null;
}

interface Module {
  id: string;
  type: string;
  level: string | null;
  display_order: number;
  title?: string;
}

interface ThematicLockInfo {
  reason: 'awo_incomplete' | 'another_in_progress' | null;
  activeThematicTitle?: string;
  awoProgress?: { completed: number; total: number };
}

/**
 * Hook para gerenciar a progressão sequencial dos módulos.
 * 
 * NOVO MODELO DE PROGRESSÃO FLUIDA:
 * - Completar Fase 1 de um módulo desbloqueia o próximo módulo
 * - Fase 2 (proficiência) pode ser feita depois, quando o aluno quiser
 * - Quiz 90%+ ainda é necessário para certificação, mas não para progresso
 * 
 * Regras de Temáticos:
 * - Só ficam disponíveis após completar TODOS os módulos Awo com Fase 1
 * - Apenas um módulo temático pode estar em progresso por vez
 */
export const useSequentialProgress = () => {
  const { user } = useAuth();

  /**
   * Verifica se todos os módulos de um determinado nível tiveram Fase 1 completada
   */
  const hasCompletedPhase1OfLevel = (
    level: string,
    allModules: Module[],
    phaseProgress: PhaseProgress[]
  ): boolean => {
    const levelModules = allModules.filter(
      m => m.type === 'proficiency' && m.level?.toLowerCase() === level.toLowerCase()
    );
    
    if (levelModules.length === 0) return true;
    
    return levelModules.every(m =>
      phaseProgress.some(p => p.moduleId === m.id && p.phase1CompletedAt !== null)
    );
  };

  /**
   * Verifica se todos os módulos de um determinado nível foram completados com 90%+
   * (mantido para certificação/proficiência)
   */
  const hasCompletedAllModulesOfLevel = (
    level: string,
    allModules: Module[],
    completions: ModuleCompletion[]
  ): boolean => {
    const levelModules = allModules.filter(
      m => m.type === 'proficiency' && m.level?.toLowerCase() === level.toLowerCase()
    );
    
    if (levelModules.length === 0) return true;
    
    return levelModules.every(m =>
      completions.some(c => c.moduleId === m.id && c.quizScore >= 90)
    );
  };

  /**
   * Conta quantos módulos Awo tiveram Fase 1 completada
   */
  const getAwoPhase1Progress = (
    allModules: Module[],
    phaseProgress: PhaseProgress[]
  ): { completed: number; total: number } => {
    const awoModules = allModules.filter(
      m => m.type === 'proficiency' && m.level?.toLowerCase() === 'awo'
    );
    
    const completed = awoModules.filter(m =>
      phaseProgress.some(p => p.moduleId === m.id && p.phase1CompletedAt !== null)
    ).length;
    
    return { completed, total: awoModules.length };
  };

  /**
   * Conta quantos módulos Awo foram completados com proficiência (90%+)
   */
  const getAwoProgress = (
    allModules: Module[],
    completions: ModuleCompletion[]
  ): { completed: number; total: number } => {
    const awoModules = allModules.filter(
      m => m.type === 'proficiency' && m.level?.toLowerCase() === 'awo'
    );
    
    const completed = awoModules.filter(m =>
      completions.some(c => c.moduleId === m.id && c.quizScore >= 90)
    ).length;
    
    return { completed, total: awoModules.length };
  };

  /**
   * Obtém o módulo temático atualmente em progresso (iniciado mas não concluído)
   */
  const getActiveThematicModule = (
    thematicModules: Module[],
    completions: ModuleCompletion[],
    userProgress: Record<string, number>
  ): Module | null => {
    // Módulo "em progresso" = tem progresso > 0 mas não foi concluído com 90%+
    return thematicModules.find(m => {
      const progress = userProgress[m.id] || 0;
      const isCompleted = completions.some(c => c.moduleId === m.id && c.quizScore >= 90);
      return progress > 0 && !isCompleted;
    }) || null;
  };

  /**
   * Verifica se um módulo temático está bloqueado e retorna o motivo
   */
  const getThematicLockInfo = (
    module: Module,
    allModules: Module[],
    completions: ModuleCompletion[],
    userProgress: Record<string, number>,
    phaseProgress: PhaseProgress[] = []
  ): ThematicLockInfo => {
    // Regra 1: Verificar se todos os módulos Awo tiveram Fase 1 completada
    if (!hasCompletedPhase1OfLevel('awo', allModules, phaseProgress)) {
      return {
        reason: 'awo_incomplete',
        awoProgress: getAwoPhase1Progress(allModules, phaseProgress),
      };
    }
    
    // Regra 2: Verificar se já existe um temático em progresso
    const thematicModules = allModules.filter(m => m.type === 'thematic');
    const activeThematic = getActiveThematicModule(thematicModules, completions, userProgress);
    
    // Se não há temático ativo ou o ativo é este mesmo módulo, está desbloqueado
    if (!activeThematic || activeThematic.id === module.id) {
      return { reason: null };
    }
    
    // Bloqueado por outro temático em progresso
    return {
      reason: 'another_in_progress',
      activeThematicTitle: activeThematic.title,
    };
  };

  /**
   * Verifica se um módulo está desbloqueado baseado na progressão sequencial.
   * Agora respeita unlock_rule do módulo antes de aplicar lógica sequencial.
   */
  const isModuleUnlocked = (
    module: Module & { unlock_rule?: string; unlock_date?: string | null },
    allModules: Module[],
    completions: ModuleCompletion[],
    userProgress: Record<string, number> = {},
    phaseProgress: PhaseProgress[] = [],
    cohortModuleMap?: Map<string, { unlock_rule: string; unlock_date: string | null }>
  ): boolean => {
    // Se o usuário tem turma e o módulo está no mapa da turma, usar regra da turma
    const cohortRule = cohortModuleMap?.get(module.id);
    const unlockRule = cohortRule?.unlock_rule || (module as any).unlock_rule || 'sequential';
    const unlockDate = cohortRule?.unlock_date || (module as any).unlock_date;
    
    if (unlockRule === 'always_unlocked') return true;
    if (unlockRule === 'manual') return false;
    if (unlockRule === 'date_based') {
      if (unlockDate) {
        return new Date() >= new Date(unlockDate);
      }
      return false;
    }

    // unlock_rule === 'sequential' — lógica existente

    // Módulos temáticos: regras especiais
    if (module.type === 'thematic') {
      const lockInfo = getThematicLockInfo(module, allModules, completions, userProgress, phaseProgress);
      return lockInfo.reason === null;
    }

    // Módulos de proficiência
    const proficiencyModules = allModules.filter(m => m.type === 'proficiency');
    const sortedModules = [...proficiencyModules].sort((a, b) => a.display_order - b.display_order);
    const currentIndex = sortedModules.findIndex(m => m.id === module.id);
    
    if (currentIndex === 0) return true;

    const previousModule = sortedModules[currentIndex - 1];
    if (!previousModule) return true;

    const previousPhaseProgress = phaseProgress.find(p => p.moduleId === previousModule.id);
    if (previousPhaseProgress?.phase1CompletedAt) return true;

    const previousCompletion = completions.find(c => c.moduleId === previousModule.id);
    if (previousCompletion !== undefined && previousCompletion.quizScore >= 90) return true;

    // Fallback: módulo anterior considerado concluído quando todos os exercícios
    // publicados foram completados (progresso 100%). Cobre módulos onde o tracking
    // de fases não rodou ou que não têm exercícios formalmente marcados como Fase 1.
    if ((userProgress[previousModule.id] || 0) >= 100) return true;

    return false;
  };

  /**
   * Busca o progresso de fases do usuário atual
   */
  const fetchPhaseProgress = async (): Promise<PhaseProgress[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('module_phase_progress')
        .select('module_id, phase1_completed_at, phase2_completed_at')
        .eq('user_id', user.id);

      if (error) throw error;

      return (data || []).map(p => ({
        moduleId: p.module_id,
        phase1CompletedAt: p.phase1_completed_at,
        phase2CompletedAt: p.phase2_completed_at,
      }));
    } catch (error) {
      console.error('Error fetching phase progress:', error);
      return [];
    }
  };

  /**
   * Retorna a mensagem de requisito para desbloquear um módulo.
   */
  const getUnlockRequirement = (
    module: Module & { unlock_rule?: string; unlock_date?: string | null },
    allModules: Module[],
    completions: ModuleCompletion[],
    userProgress: Record<string, number> = {},
    phaseProgress: PhaseProgress[] = [],
    cohortModuleMap?: Map<string, { unlock_rule: string; unlock_date: string | null }>
  ): string | null => {
    // Se o usuário tem turma e o módulo está no mapa da turma, usar regra da turma
    const cohortRule = cohortModuleMap?.get(module.id);
    const unlockRule = cohortRule?.unlock_rule || (module as any).unlock_rule || 'sequential';
    const unlockDate = cohortRule?.unlock_date || (module as any).unlock_date;
    
    if (unlockRule === 'always_unlocked') return null;
    if (unlockRule === 'manual') return 'Este módulo ainda não foi liberado para sua turma';
    if (unlockRule === 'date_based') {
      if (unlockDate && new Date() < new Date(unlockDate)) {
        const dateStr = new Date(unlockDate).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
        return `Disponível a partir de ${dateStr}`;
      }
      return null;
    }

    // unlock_rule === 'sequential'

    // Módulos temáticos: mensagens específicas
    if (module.type === 'thematic') {
      const lockInfo = getThematicLockInfo(module, allModules, completions, userProgress, phaseProgress);
      
      if (lockInfo.reason === 'awo_incomplete') {
        const { completed, total } = lockInfo.awoProgress!;
        return `Complete a Fase 1 de todos os módulos Awo para desbloquear (${completed}/${total})`;
      }
      
      if (lockInfo.reason === 'another_in_progress') {
        return `Conclua "${lockInfo.activeThematicTitle}" antes de iniciar outro módulo temático`;
      }
      
      return null;
    }

    // Módulos de proficiência
    const proficiencyModules = allModules.filter(m => m.type === 'proficiency');
    const sortedModules = [...proficiencyModules].sort((a, b) => a.display_order - b.display_order);

    const currentIndex = sortedModules.findIndex(m => m.id === module.id);
    
    if (currentIndex === 0) return null;

    const previousModule = sortedModules[currentIndex - 1];
    if (!previousModule) return null;

    const previousPhaseProgress = phaseProgress.find(p => p.moduleId === previousModule.id);
    if (previousPhaseProgress?.phase1CompletedAt) return null;

    const previousCompletion = completions.find(c => c.moduleId === previousModule.id);
    if (previousCompletion !== undefined && previousCompletion.quizScore >= 90) return null;

    if ((userProgress[previousModule.id] || 0) >= 100) return null;

    return `Complete a Fase 1 do módulo anterior para desbloquear`;
  };

  /**
   * Busca as completions do usuário atual.
   */
  const fetchUserCompletions = async (): Promise<ModuleCompletion[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('module_completions')
        .select('module_id, quiz_score')
        .eq('user_id', user.id);

      if (error) throw error;

      return (data || []).map(c => ({
        moduleId: c.module_id,
        quizScore: c.quiz_score,
      }));
    } catch (error) {
      console.error('Error fetching completions:', error);
      return [];
    }
  };

  /**
   * Calcula os módulos bloqueados e requisitos.
   */
  const calculateLockedModules = (
    modules: Module[],
    completions: ModuleCompletion[],
    userProgress: Record<string, number> = {},
    phaseProgress: PhaseProgress[] = [],
    cohortModuleMap?: Map<string, { unlock_rule: string; unlock_date: string | null }>
  ): { lockedModules: Set<string>; unlockRequirements: Record<string, string> } => {
    const lockedModules = new Set<string>();
    const unlockRequirements: Record<string, string> = {};

    modules.forEach(module => {
      if (!isModuleUnlocked(module, modules, completions, userProgress, phaseProgress, cohortModuleMap)) {
        lockedModules.add(module.id);
        const requirement = getUnlockRequirement(module, modules, completions, userProgress, phaseProgress, cohortModuleMap);
        if (requirement) {
          unlockRequirements[module.id] = requirement;
        }
      }
    });

    return { lockedModules, unlockRequirements };
  };

  /**
   * Verifica se os módulos temáticos estão liberados (todos Awo com Fase 1)
   */
  const areThematicsUnlocked = (
    allModules: Module[],
    completions: ModuleCompletion[],
    phaseProgress: PhaseProgress[] = []
  ): boolean => {
    // Primeiro verifica pelo novo sistema de fases
    if (hasCompletedPhase1OfLevel('awo', allModules, phaseProgress)) {
      return true;
    }
    // Fallback para o sistema antigo
    return hasCompletedAllModulesOfLevel('awo', allModules, completions);
  };

  /**
   * Obtém informações sobre o progresso para desbloquear temáticos
   */
  const getThematicUnlockProgress = (
    allModules: Module[],
    completions: ModuleCompletion[],
    phaseProgress: PhaseProgress[] = []
  ): { completed: number; total: number; percentage: number } => {
    // Usar progresso de Fase 1 primeiro
    const phase1Progress = getAwoPhase1Progress(allModules, phaseProgress);
    if (phase1Progress.completed > 0) {
      return {
        ...phase1Progress,
        percentage: phase1Progress.total > 0 ? Math.round((phase1Progress.completed / phase1Progress.total) * 100) : 0,
      };
    }
    // Fallback para quiz completions
    const progress = getAwoProgress(allModules, completions);
    return {
      ...progress,
      percentage: progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0,
    };
  };

  return {
    isModuleUnlocked,
    getUnlockRequirement,
    fetchUserCompletions,
    fetchPhaseProgress,
    calculateLockedModules,
    areThematicsUnlocked,
    getThematicUnlockProgress,
    getActiveThematicModule,
    getThematicLockInfo,
  };
};

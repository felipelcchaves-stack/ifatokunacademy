import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ModuleCompletion {
  moduleId: string;
  quizScore: number;
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
 * Regras de Proficiência:
 * - Akapo: sempre desbloqueados sequencialmente
 * - Awo: desbloqueados após completar todos os Akapo com 90%+
 * - Oluwo: desbloqueados após completar todos os Awo com 90%+
 * 
 * Regras de Temáticos:
 * - Só ficam disponíveis após completar TODOS os módulos Awo com 90%+
 * - Apenas um módulo temático pode estar em progresso por vez
 * - Deve concluir o atual antes de iniciar outro
 */
export const useSequentialProgress = () => {
  const { user } = useAuth();

  /**
   * Verifica se todos os módulos de um determinado nível foram completados com 90%+
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
   * Conta quantos módulos Awo foram completados
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
    userProgress: Record<string, number>
  ): ThematicLockInfo => {
    // Regra 1: Verificar se todos os módulos Awo foram completados
    if (!hasCompletedAllModulesOfLevel('awo', allModules, completions)) {
      return {
        reason: 'awo_incomplete',
        awoProgress: getAwoProgress(allModules, completions),
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
   */
  const isModuleUnlocked = (
    module: Module,
    allModules: Module[],
    completions: ModuleCompletion[],
    userProgress: Record<string, number> = {}
  ): boolean => {
    // Módulos temáticos: regras especiais
    if (module.type === 'thematic') {
      const lockInfo = getThematicLockInfo(module, allModules, completions, userProgress);
      return lockInfo.reason === null;
    }

    // Módulos de proficiência
    const proficiencyModules = allModules.filter(m => m.type === 'proficiency');
    
    // Ordena por display_order dentro do mesmo nível
    const sortedModules = [...proficiencyModules].sort((a, b) => a.display_order - b.display_order);

    // Encontra índice do módulo atual
    const currentIndex = sortedModules.findIndex(m => m.id === module.id);
    
    // Primeiro módulo sempre desbloqueado
    if (currentIndex === 0) {
      return true;
    }

    // Para os demais, verifica se o módulo anterior foi completado com 90%+
    const previousModule = sortedModules[currentIndex - 1];
    if (!previousModule) {
      return true;
    }

    const previousCompletion = completions.find(c => c.moduleId === previousModule.id);
    return previousCompletion !== undefined && previousCompletion.quizScore >= 90;
  };

  /**
   * Retorna a mensagem de requisito para desbloquear um módulo.
   */
  const getUnlockRequirement = (
    module: Module,
    allModules: Module[],
    completions: ModuleCompletion[],
    userProgress: Record<string, number> = {}
  ): string | null => {
    // Módulos temáticos: mensagens específicas
    if (module.type === 'thematic') {
      const lockInfo = getThematicLockInfo(module, allModules, completions, userProgress);
      
      if (lockInfo.reason === 'awo_incomplete') {
        const { completed, total } = lockInfo.awoProgress!;
        return `Complete todos os módulos Awo para desbloquear (${completed}/${total} concluídos)`;
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
    
    if (currentIndex === 0) {
      return null;
    }

    const previousModule = sortedModules[currentIndex - 1];
    if (!previousModule) {
      return null;
    }

    const previousCompletion = completions.find(c => c.moduleId === previousModule.id);
    
    if (!previousCompletion) {
      return `Complete o módulo anterior com 90% no quiz`;
    }
    
    if (previousCompletion.quizScore < 90) {
      return `Obtenha 90%+ no quiz do módulo anterior (atual: ${previousCompletion.quizScore}%)`;
    }

    return null;
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
    userProgress: Record<string, number> = {}
  ): { lockedModules: Set<string>; unlockRequirements: Record<string, string> } => {
    const lockedModules = new Set<string>();
    const unlockRequirements: Record<string, string> = {};

    modules.forEach(module => {
      if (!isModuleUnlocked(module, modules, completions, userProgress)) {
        lockedModules.add(module.id);
        const requirement = getUnlockRequirement(module, modules, completions, userProgress);
        if (requirement) {
          unlockRequirements[module.id] = requirement;
        }
      }
    });

    return { lockedModules, unlockRequirements };
  };

  /**
   * Verifica se os módulos temáticos estão liberados (todos Awo completados)
   */
  const areThematicsUnlocked = (
    allModules: Module[],
    completions: ModuleCompletion[]
  ): boolean => {
    return hasCompletedAllModulesOfLevel('awo', allModules, completions);
  };

  /**
   * Obtém informações sobre o progresso para desbloquear temáticos
   */
  const getThematicUnlockProgress = (
    allModules: Module[],
    completions: ModuleCompletion[]
  ): { completed: number; total: number; percentage: number } => {
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
    calculateLockedModules,
    areThematicsUnlocked,
    getThematicUnlockProgress,
    getActiveThematicModule,
    getThematicLockInfo,
  };
};

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
}

/**
 * Hook para gerenciar a progressão sequencial dos módulos.
 * Os módulos de proficiência precisam ser completados sequencialmente.
 * Módulos temáticos estão sempre desbloqueados.
 */
export const useSequentialProgress = () => {
  const { user } = useAuth();

  /**
   * Verifica se um módulo está desbloqueado baseado na progressão sequencial.
   * 
   * Regras:
   * - Módulos temáticos: sempre desbloqueados
   * - Primeiro módulo de proficiência (display_order mais baixo): sempre desbloqueado
   * - Demais módulos de proficiência: só desbloqueados após o anterior ter 90%+ no quiz
   */
  const isModuleUnlocked = (
    module: Module,
    allProficiencyModules: Module[],
    completions: ModuleCompletion[]
  ): boolean => {
    // Módulos temáticos sempre desbloqueados
    if (module.type === 'thematic') {
      return true;
    }

    // Ordena módulos de proficiência por display_order
    const sortedModules = [...allProficiencyModules]
      .filter(m => m.type === 'proficiency')
      .sort((a, b) => a.display_order - b.display_order);

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
    allProficiencyModules: Module[],
    completions: ModuleCompletion[]
  ): string | null => {
    if (module.type === 'thematic') {
      return null;
    }

    const sortedModules = [...allProficiencyModules]
      .filter(m => m.type === 'proficiency')
      .sort((a, b) => a.display_order - b.display_order);

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
    completions: ModuleCompletion[]
  ): { lockedModules: Set<string>; unlockRequirements: Record<string, string> } => {
    const proficiencyModules = modules.filter(m => m.type === 'proficiency');
    const lockedModules = new Set<string>();
    const unlockRequirements: Record<string, string> = {};

    modules.forEach(module => {
      if (!isModuleUnlocked(module, proficiencyModules, completions)) {
        lockedModules.add(module.id);
        const requirement = getUnlockRequirement(module, proficiencyModules, completions);
        if (requirement) {
          unlockRequirements[module.id] = requirement;
        }
      }
    });

    return { lockedModules, unlockRequirements };
  };

  return {
    isModuleUnlocked,
    getUnlockRequirement,
    fetchUserCompletions,
    calculateLockedModules,
  };
};

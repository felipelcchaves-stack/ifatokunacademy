import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface CohortModuleRule {
  unlock_rule: string;
  unlock_date: string | null;
}

interface CohortFilter {
  hasCohorts: boolean;
  loading: boolean;
  allowedModuleIds: Set<string>;
  cohortModuleMap: Map<string, CohortModuleRule>;
}

export const useCohortFilter = (user: User | null, organizationId?: string | null): CohortFilter => {
  const [hasCohorts, setHasCohorts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allowedModuleIds, setAllowedModuleIds] = useState<Set<string>>(new Set());
  const [cohortModuleMap, setCohortModuleMap] = useState<Map<string, CohortModuleRule>>(new Map());

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchCohortData = async () => {
      try {
        // 1. Get user's cohort memberships
        const { data: memberships } = await supabase
          .from('cohort_members')
          .select('cohort_id')
          .eq('user_id', user.id);

        if (!memberships || memberships.length === 0) {
          setHasCohorts(false);
          setAllowedModuleIds(new Set());
          setCohortModuleMap(new Map());
          setLoading(false);
          return;
        }

        const cohortIds = memberships.map(m => m.cohort_id);

        // 2. Filter to active cohorts (optionally by org)
        let cohortsQuery = supabase
          .from('cohorts')
          .select('id')
          .in('id', cohortIds)
          .eq('is_active', true);

        if (organizationId) {
          cohortsQuery = cohortsQuery.eq('organization_id', organizationId);
        }

        const { data: activeCohorts } = await cohortsQuery;

        if (!activeCohorts || activeCohorts.length === 0) {
          setHasCohorts(false);
          setAllowedModuleIds(new Set());
          setCohortModuleMap(new Map());
          setLoading(false);
          return;
        }

        const activeCohortIds = activeCohorts.map(c => c.id);

        // 3. Get cohort_modules with unlock rules
        const { data: cohortModules } = await supabase
          .from('cohort_modules')
          .select('module_id, unlock_rule, unlock_date')
          .in('cohort_id', activeCohortIds);

        if (!cohortModules || cohortModules.length === 0) {
          // Cohort exists but no modules assigned → fallback: show all
          setHasCohorts(false);
          setAllowedModuleIds(new Set());
          setCohortModuleMap(new Map());
          setLoading(false);
          return;
        }

        // Build the map (if multiple cohorts have same module, use the most permissive rule)
        const moduleMap = new Map<string, CohortModuleRule>();
        const moduleIds = new Set<string>();

        cohortModules.forEach((cm: any) => {
          moduleIds.add(cm.module_id);
          const existing = moduleMap.get(cm.module_id);
          if (!existing) {
            moduleMap.set(cm.module_id, {
              unlock_rule: cm.unlock_rule || 'manual',
              unlock_date: cm.unlock_date,
            });
          } else {
            // If any cohort has always_unlocked, use that
            const rulePriority: Record<string, number> = {
              always_unlocked: 4,
              sequential: 3,
              date_based: 2,
              manual: 1,
            };
            const existingPriority = rulePriority[existing.unlock_rule] || 0;
            const newPriority = rulePriority[cm.unlock_rule] || 0;
            if (newPriority > existingPriority) {
              moduleMap.set(cm.module_id, {
                unlock_rule: cm.unlock_rule || 'manual',
                unlock_date: cm.unlock_date,
              });
            }
          }
        });

        setHasCohorts(true);
        setAllowedModuleIds(moduleIds);
        setCohortModuleMap(moduleMap);
      } catch (err) {
        console.error('[useCohortFilter] Error:', err);
        setHasCohorts(false);
        setAllowedModuleIds(new Set());
        setCohortModuleMap(new Map());
      } finally {
        setLoading(false);
      }
    };

    fetchCohortData();
  }, [user, organizationId]);

  return { hasCohorts, loading, allowedModuleIds, cohortModuleMap };
};

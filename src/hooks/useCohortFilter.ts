import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface CohortFilter {
  hasCohorts: boolean;
  allowedModuleIds: Set<string>;
  cohortModuleOrder: Map<string, number>;
  loading: boolean;
}

export const useCohortFilter = (user: User | null, organizationId?: string | null): CohortFilter => {
  const [hasCohorts, setHasCohorts] = useState(false);
  const [allowedModuleIds, setAllowedModuleIds] = useState<Set<string>>(new Set());
  const [cohortModuleOrder, setCohortModuleOrder] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

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
          setLoading(false);
          return;
        }

        const cohortIds = memberships.map(m => m.cohort_id);

        // 2. Filter to active cohorts (optionally filter by org)
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
          setLoading(false);
          return;
        }

        const activeCohortIds = activeCohorts.map(c => c.id);

        // 3. Get modules assigned to those cohorts
        const { data: cohortModules } = await supabase
          .from('cohort_modules')
          .select('module_id, display_order, cohort_id')
          .in('cohort_id', activeCohortIds)
          .order('display_order', { ascending: true });

        const moduleIds = new Set<string>();
        const orderMap = new Map<string, number>();

        (cohortModules || []).forEach(cm => {
          moduleIds.add(cm.module_id);
          // Use lowest display_order if module appears in multiple cohorts
          if (!orderMap.has(cm.module_id) || cm.display_order < (orderMap.get(cm.module_id) ?? Infinity)) {
            orderMap.set(cm.module_id, cm.display_order);
          }
        });

        setHasCohorts(true);
        setAllowedModuleIds(moduleIds);
        setCohortModuleOrder(orderMap);
      } catch (err) {
        console.error('[useCohortFilter] Error:', err);
        setHasCohorts(false);
      } finally {
        setLoading(false);
      }
    };

    fetchCohortData();
  }, [user, organizationId]);

  return { hasCohorts, allowedModuleIds, cohortModuleOrder, loading };
};

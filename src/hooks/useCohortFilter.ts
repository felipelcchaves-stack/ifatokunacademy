import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface CohortFilter {
  hasCohorts: boolean;
  loading: boolean;
}

export const useCohortFilter = (user: User | null, organizationId?: string | null): CohortFilter => {
  const [hasCohorts, setHasCohorts] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchCohortData = async () => {
      try {
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

        let cohortsQuery = supabase
          .from('cohorts')
          .select('id')
          .in('id', cohortIds)
          .eq('is_active', true);

        if (organizationId) {
          cohortsQuery = cohortsQuery.eq('organization_id', organizationId);
        }

        const { data: activeCohorts } = await cohortsQuery;

        setHasCohorts((activeCohorts || []).length > 0);
      } catch (err) {
        console.error('[useCohortFilter] Error:', err);
        setHasCohorts(false);
      } finally {
        setLoading(false);
      }
    };

    fetchCohortData();
  }, [user, organizationId]);

  return { hasCohorts, loading };
};

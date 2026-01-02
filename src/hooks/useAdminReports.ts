import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, format, parseISO } from "date-fns";

export type DateRange = "7d" | "30d" | "90d" | "all";

interface ContentStats {
  totalModules: number;
  publishedModules: number;
  draftModules: number;
  totalLessons: number;
  totalExercises: number;
  avgExercisesPerLesson: number;
}

interface UserStats {
  totalUsers: number;
  newUsersThisPeriod: number;
  userGrowthData: { date: string; count: number }[];
}

interface ExerciseTypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

interface ModuleDetails {
  id: string;
  title: string;
  type: string;
  isPublished: boolean;
  lessonsCount: number;
  exercisesCount: number;
  completionsCount: number;
}

interface ProgressActivity {
  date: string;
  count: number;
}

export interface AdminReportsData {
  contentStats: ContentStats;
  userStats: UserStats;
  exerciseTypes: ExerciseTypeDistribution[];
  moduleDetails: ModuleDetails[];
  progressActivity: ProgressActivity[];
  isLoading: boolean;
  error: Error | null;
}

function getDateRangeStart(range: DateRange): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return startOfDay(subDays(new Date(), days));
}

export function useAdminReports(dateRange: DateRange = "30d"): AdminReportsData {
  const rangeStart = getDateRangeStart(dateRange);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-reports", dateRange],
    queryFn: async () => {
      // Fetch all data in parallel
      const [
        modulesRes,
        lessonsRes,
        exercisesRes,
        profilesRes,
        progressRes,
        completionsRes
      ] = await Promise.all([
        supabase.from("modules").select("id, title, type, is_published"),
        supabase.from("lessons").select("id, module_id"),
        supabase.from("exercises").select("id, lesson_id, type"),
        supabase.from("profiles").select("id, created_at"),
        rangeStart
          ? supabase
              .from("user_progress")
              .select("id, completed_at")
              .gte("completed_at", rangeStart.toISOString())
          : supabase.from("user_progress").select("id, completed_at"),
        supabase.from("module_completions").select("id, module_id")
      ]);

      const modules = modulesRes.data || [];
      const lessons = lessonsRes.data || [];
      const exercises = exercisesRes.data || [];
      const profiles = profilesRes.data || [];
      const progress = progressRes.data || [];
      const completions = completionsRes.data || [];

      // Content Stats
      const publishedModules = modules.filter((m) => m.is_published).length;
      const contentStats: ContentStats = {
        totalModules: modules.length,
        publishedModules,
        draftModules: modules.length - publishedModules,
        totalLessons: lessons.length,
        totalExercises: exercises.length,
        avgExercisesPerLesson:
          lessons.length > 0
            ? Math.round((exercises.length / lessons.length) * 10) / 10
            : 0
      };

      // User Stats with growth data
      const filteredProfiles = rangeStart
        ? profiles.filter((p) => new Date(p.created_at) >= rangeStart)
        : profiles;

      // Group users by date for growth chart
      const usersByDate = new Map<string, number>();
      const daysToShow = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
      
      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        usersByDate.set(date, 0);
      }

      profiles.forEach((p) => {
        const date = format(parseISO(p.created_at), "yyyy-MM-dd");
        if (usersByDate.has(date)) {
          usersByDate.set(date, (usersByDate.get(date) || 0) + 1);
        }
      });

      const userGrowthData = Array.from(usersByDate.entries()).map(
        ([date, count]) => ({ date, count })
      );

      const userStats: UserStats = {
        totalUsers: profiles.length,
        newUsersThisPeriod: filteredProfiles.length,
        userGrowthData
      };

      // Exercise Type Distribution
      const typeCounts = new Map<string, number>();
      exercises.forEach((e) => {
        typeCounts.set(e.type, (typeCounts.get(e.type) || 0) + 1);
      });

      const exerciseTypes: ExerciseTypeDistribution[] = Array.from(
        typeCounts.entries()
      ).map(([type, count]) => ({
        type,
        count,
        percentage:
          exercises.length > 0
            ? Math.round((count / exercises.length) * 100)
            : 0
      }));

      // Module Details
      const moduleDetails: ModuleDetails[] = modules.map((m) => {
        const moduleLessons = lessons.filter((l) => l.module_id === m.id);
        const lessonIds = moduleLessons.map((l) => l.id);
        const moduleExercises = exercises.filter((e) =>
          lessonIds.includes(e.lesson_id)
        );
        const moduleCompletions = completions.filter(
          (c) => c.module_id === m.id
        );

        return {
          id: m.id,
          title: m.title,
          type: m.type,
          isPublished: m.is_published,
          lessonsCount: moduleLessons.length,
          exercisesCount: moduleExercises.length,
          completionsCount: moduleCompletions.length
        };
      });

      // Progress Activity (grouped by date)
      const progressByDate = new Map<string, number>();
      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "yyyy-MM-dd");
        progressByDate.set(date, 0);
      }

      progress.forEach((p) => {
        const date = format(parseISO(p.completed_at), "yyyy-MM-dd");
        if (progressByDate.has(date)) {
          progressByDate.set(date, (progressByDate.get(date) || 0) + 1);
        }
      });

      const progressActivity: ProgressActivity[] = Array.from(
        progressByDate.entries()
      ).map(([date, count]) => ({ date, count }));

      return {
        contentStats,
        userStats,
        exerciseTypes,
        moduleDetails,
        progressActivity
      };
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  return {
    contentStats: data?.contentStats || {
      totalModules: 0,
      publishedModules: 0,
      draftModules: 0,
      totalLessons: 0,
      totalExercises: 0,
      avgExercisesPerLesson: 0
    },
    userStats: data?.userStats || {
      totalUsers: 0,
      newUsersThisPeriod: 0,
      userGrowthData: []
    },
    exerciseTypes: data?.exerciseTypes || [],
    moduleDetails: data?.moduleDetails || [],
    progressActivity: data?.progressActivity || [],
    isLoading,
    error: error as Error | null
  };
}

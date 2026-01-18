import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  UserPlus,
  Settings,
  BarChart3,
  Calendar,
  Award,
  Loader2,
  ArrowRight,
  Flame,
  Target,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrgStats {
  totalUsers: number;
  activeUsers: number;
  totalModules: number;
  totalLessons: number;
  totalExercises: number;
  completedLessons: number;
  averageProgress: number;
  newUsersThisWeek: number;
}

interface RecentUser {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface TopModule {
  id: string;
  title: string;
  completions: number;
  totalUsers: number;
  progress: number;
}

interface RecentActivity {
  id: string;
  user_name: string;
  action: string;
  target: string;
  created_at: string;
}

const AdminOrgDashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { organization, isOrgAdmin, loading: orgLoading } = useOrganization();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrgStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalModules: 0,
    totalLessons: 0,
    totalExercises: 0,
    completedLessons: 0,
    averageProgress: 0,
    newUsersThisWeek: 0,
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [topModules, setTopModules] = useState<TopModule[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    if (orgLoading) return;
    
    // Verificar permissões
    if (!isAdmin && !isOrgAdmin) {
      navigate('/dashboard');
      return;
    }
    
    if (organization) {
      fetchDashboardData();
    }
  }, [organization, isAdmin, isOrgAdmin, orgLoading, navigate]);

  const fetchDashboardData = async () => {
    if (!organization) return;
    
    try {
      setLoading(true);
      
      // Buscar usuários da organização
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, created_at')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const userIds = (users || []).map(u => u.id);
      const weekAgo = subDays(new Date(), 7);
      const newUsersThisWeek = (users || []).filter(u => 
        new Date(u.created_at) >= weekAgo
      ).length;

      setRecentUsers((users || []).slice(0, 5));

      // Buscar módulos da organização
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id, title')
        .eq('organization_id', organization.id)
        .eq('is_published', true);

      if (modulesError) throw modulesError;

      const moduleIds = (modules || []).map(m => m.id);

      // Buscar lições dos módulos
      let totalLessons = 0;
      let totalExercises = 0;
      
      if (moduleIds.length > 0) {
        const { data: lessons, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, module_id')
          .in('module_id', moduleIds)
          .eq('is_published', true);

        if (lessonsError) throw lessonsError;
        totalLessons = (lessons || []).length;

        const lessonIds = (lessons || []).map(l => l.id);
        
        if (lessonIds.length > 0) {
          const { count: exerciseCount, error: exercisesError } = await supabase
            .from('exercises')
            .select('id', { count: 'exact', head: true })
            .in('lesson_id', lessonIds)
            .eq('is_published', true);

          if (exercisesError) throw exercisesError;
          totalExercises = exerciseCount || 0;
        }
      }

      // Buscar progresso dos usuários nos módulos da organização
      let completedLessons = 0;
      let activeUserIds = new Set<string>();
      
      if (userIds.length > 0 && moduleIds.length > 0) {
        const { data: progress, error: progressError } = await supabase
          .from('user_progress')
          .select('user_id, lesson_id, module_id')
          .in('user_id', userIds)
          .in('module_id', moduleIds);

        if (progressError) throw progressError;
        
        // Contar lições únicas completadas
        const completedLessonSet = new Set<string>();
        (progress || []).forEach(p => {
          if (p.lesson_id) {
            completedLessonSet.add(`${p.user_id}-${p.lesson_id}`);
          }
          activeUserIds.add(p.user_id);
        });
        completedLessons = completedLessonSet.size;

        // Calcular top modules por completions
        const moduleCompletions = new Map<string, number>();
        (progress || []).forEach(p => {
          if (p.module_id) {
            moduleCompletions.set(
              p.module_id, 
              (moduleCompletions.get(p.module_id) || 0) + 1
            );
          }
        });

        const topModulesData: TopModule[] = (modules || [])
          .map(m => ({
            id: m.id,
            title: m.title,
            completions: moduleCompletions.get(m.id) || 0,
            totalUsers: userIds.length,
            progress: userIds.length > 0 
              ? Math.round((moduleCompletions.get(m.id) || 0) / userIds.length * 100) 
              : 0,
          }))
          .sort((a, b) => b.completions - a.completions)
          .slice(0, 5);

        setTopModules(topModulesData);
      }

      // Buscar atividade recente (últimos 7 dias)
      if (userIds.length > 0) {
        const { data: recentProgress, error: recentError } = await supabase
          .from('user_progress')
          .select(`
            id,
            user_id,
            lesson_id,
            completed_at,
            lessons:lesson_id (title),
            profiles:user_id (full_name)
          `)
          .in('user_id', userIds)
          .gte('completed_at', weekAgo.toISOString())
          .order('completed_at', { ascending: false })
          .limit(10);

        if (!recentError && recentProgress) {
          const activities: RecentActivity[] = recentProgress.map(p => ({
            id: p.id,
            user_name: (p.profiles as any)?.full_name || 'Usuário',
            action: 'completou',
            target: (p.lessons as any)?.title || 'uma lição',
            created_at: p.completed_at,
          }));
          setRecentActivity(activities);
        }
      }

      // Calcular progresso médio
      const avgProgress = userIds.length > 0 && totalLessons > 0
        ? Math.round((completedLessons / (userIds.length * totalLessons)) * 100)
        : 0;

      setStats({
        totalUsers: (users || []).length,
        activeUsers: activeUserIds.size,
        totalModules: (modules || []).length,
        totalLessons,
        totalExercises,
        completedLessons,
        averageProgress: avgProgress,
        newUsersThisWeek,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  if (loading || orgLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Organização não encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Dashboard - {organization.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão geral da sua organização
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/invites')}>
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/reports')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Relatórios
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newUsersThisWeek} esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalUsers > 0 
                ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% do total`
                : '0% do total'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Módulos</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalModules}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalLessons} lições • {stats.totalExercises} exercícios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageProgress}%</div>
            <Progress value={stats.averageProgress} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Modules */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5" />
              Módulos Mais Populares
            </CardTitle>
            <CardDescription>
              Módulos com maior engajamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topModules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum módulo com atividade ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topModules.map((module, index) => (
                  <div key={module.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{module.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{module.completions} atividades</span>
                        <span>•</span>
                        <span>{module.progress}% engajamento</span>
                      </div>
                    </div>
                    <Progress value={module.progress} className="w-24" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Novos Usuários
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
                Ver todos
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum usuário cadastrado</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => navigate('/admin/invites')}
                >
                  Convidar Usuários
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">
                        {user.full_name || user.email || 'Sem nome'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(user.created_at), "d 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Atividade Recente
          </CardTitle>
          <CardDescription>
            Últimas atividades dos usuários nos últimos 7 dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma atividade recente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user_name}</span>
                      {' '}{activity.action}{' '}
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.created_at), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => navigate('/admin/invites')}
            >
              <UserPlus className="w-6 h-6" />
              <span>Convidar Usuários</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => navigate('/admin/modules')}
            >
              <BookOpen className="w-6 h-6" />
              <span>Gerenciar Módulos</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => navigate('/admin/users')}
            >
              <Users className="w-6 h-6" />
              <span>Ver Usuários</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => navigate('/admin/reports')}
            >
              <BarChart3 className="w-6 h-6" />
              <span>Ver Relatórios</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrgDashboard;

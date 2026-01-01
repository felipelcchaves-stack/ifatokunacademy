import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Award, TrendingUp, Play, Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ModuleCard from '@/components/modules/ModuleCard';
import ModuleSlider from '@/components/modules/ModuleSlider';
import ContentProtection from '@/components/ContentProtection';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Module {
  id: string;
  title: string;
  description: string | null;
  type: 'proficiency' | 'thematic';
  level: string | null;
  theme: string | null;
  image_url: string | null;
  color: string | null;
  display_order: number;
  is_published: boolean;
  totalLessons?: number;
  progress?: number;
}

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  const displayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Estudante';

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('modules')
        .select(`
          *,
          lessons:lessons(count)
        `)
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const modulesWithCount = (data || []).map((m: any) => ({
        ...m,
        type: m.type as 'proficiency' | 'thematic',
        totalLessons: m.lessons?.[0]?.count || 0,
        progress: 0, // TODO: Calculate actual progress from user data
      }));

      setModules(modulesWithCount);
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const proficiencyModules = modules.filter(m => m.type === 'proficiency');
  const thematicModules = modules.filter(m => m.type === 'thematic');
  const lastActiveModule = modules[0];

  const stats = [
    { icon: BookOpen, label: 'Módulos Disponíveis', value: modules.length },
    { icon: Clock, label: 'Horas de Estudo', value: '0h' },
    { icon: Award, label: 'Exercícios Concluídos', value: 0 },
    { icon: TrendingUp, label: 'Progresso Geral', value: '0%' },
  ];

  if (loading) {
    return (
      <ContentProtection>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="pt-24 pb-16 flex items-center justify-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Carregando...</span>
            </div>
          </main>
        </div>
      </ContentProtection>
    );
  }

  return (
    <ContentProtection>
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
                Olá, {displayName}! 👋
              </h1>
              <p className="text-muted-foreground">
                Continue sua jornada de aprendizado. Você está indo muito bem!
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {stats.map((stat, index) => (
                <div 
                  key={index}
                  className="bg-card rounded-xl p-4 md:p-6 shadow-soft border border-border"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Continue Learning */}
            {lastActiveModule && (
              <div className="mb-12">
                <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
                  Continuar Aprendendo
                </h2>
                <div className="bg-card rounded-2xl p-6 md:p-8 shadow-soft border border-border">
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${lastActiveModule.color || 'from-amber-500 to-orange-600'} flex items-center justify-center flex-shrink-0`}>
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium text-primary uppercase tracking-wider">
                        {lastActiveModule.type === 'proficiency' 
                          ? `Nível ${lastActiveModule.level?.charAt(0).toUpperCase()}${lastActiveModule.level?.slice(1)}` 
                          : lastActiveModule.theme}
                      </span>
                      <h3 className="font-serif text-xl font-semibold text-foreground mt-1">
                        {lastActiveModule.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mt-1 mb-4">
                        {lastActiveModule.description}
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 max-w-xs">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium text-primary">{lastActiveModule.progress || 0}%</span>
                          </div>
                          <Progress value={lastActiveModule.progress || 0} className="h-2" />
                        </div>
                        <Button 
                          className="gradient-gold text-secondary font-semibold shadow-gold"
                          onClick={() => navigate(`/module/${lastActiveModule.id}`)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Continuar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Proficiency Modules */}
            {proficiencyModules.length > 0 && (
              <div className="mb-12">
                <ModuleSlider 
                  modules={proficiencyModules.map(m => ({
                    id: m.id,
                    title: m.title,
                    description: m.description || '',
                    type: m.type,
                    level: (m.level?.charAt(0).toUpperCase() + m.level?.slice(1)) as 'Akapo' | 'Awo' | 'Oluwo',
                    theme: m.theme || '',
                    image: m.image_url || '',
                    color: m.color || 'from-amber-500 to-orange-600',
                    totalLessons: m.totalLessons || 0,
                    progress: m.progress || 0,
                    lessons: [],
                  }))}
                  title="Trilhas de Proficiência"
                  subtitle="Evolua do nível Akapo até Oluwo"
                />
              </div>
            )}

            {/* Thematic Modules */}
            {thematicModules.length > 0 && (
              <div>
                <ModuleSlider 
                  modules={thematicModules.map(m => ({
                    id: m.id,
                    title: m.title,
                    description: m.description || '',
                    type: m.type,
                    level: 'Akapo' as const,
                    theme: m.theme || '',
                    image: m.image_url || '',
                    color: m.color || 'from-emerald-500 to-teal-600',
                    totalLessons: m.totalLessons || 0,
                    progress: m.progress || 0,
                    lessons: [],
                  }))}
                  title="Módulos Temáticos"
                  subtitle="Aprofunde-se em áreas específicas"
                />
              </div>
            )}

            {/* Empty State */}
            {modules.length === 0 && (
              <div className="bg-card rounded-xl p-12 text-center border border-border">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                  Nenhum módulo disponível
                </h3>
                <p className="text-muted-foreground">
                  Os módulos estão sendo preparados. Volte em breve!
                </p>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </ContentProtection>
  );
};

export default Dashboard;

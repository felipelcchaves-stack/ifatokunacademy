import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Award, TrendingUp, Play } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ModuleCard from '@/components/modules/ModuleCard';
import ModuleSlider from '@/components/modules/ModuleSlider';
import ContentProtection from '@/components/ContentProtection';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { proficiencyModules, thematicModules, getModuleById } from '@/data/mockData';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get enrolled modules
  const enrolledModules = user?.enrolledModules.map(id => getModuleById(id)).filter(Boolean) || [];
  
  // Calculate overall progress
  const overallProgress = enrolledModules.length > 0
    ? Math.round(enrolledModules.reduce((acc, m) => acc + (m?.progress || 0), 0) / enrolledModules.length)
    : 0;

  // Get last active module
  const lastActiveModule = enrolledModules[0];

  const stats = [
    { icon: BookOpen, label: 'Módulos Ativos', value: enrolledModules.length },
    { icon: Clock, label: 'Horas de Estudo', value: '12h' },
    { icon: Award, label: 'Exercícios Concluídos', value: 24 },
    { icon: TrendingUp, label: 'Progresso Geral', value: `${overallProgress}%` },
  ];

  return (
    <ContentProtection>
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
                Olá, {user?.name?.split(' ')[0]}! 👋
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
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${lastActiveModule.color} flex items-center justify-center flex-shrink-0`}>
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-medium text-primary uppercase tracking-wider">
                        {lastActiveModule.type === 'proficiency' ? `Nível ${lastActiveModule.level}` : lastActiveModule.theme}
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
                            <span className="font-medium text-primary">{lastActiveModule.progress}%</span>
                          </div>
                          <Progress value={lastActiveModule.progress} className="h-2" />
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

            {/* My Modules */}
            {enrolledModules.length > 0 && (
              <div className="mb-12">
                <h2 className="font-serif text-2xl font-bold text-foreground mb-6">
                  Meus Módulos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {enrolledModules.map((module) => module && (
                    <ModuleCard key={module.id} module={module} variant="compact" />
                  ))}
                </div>
              </div>
            )}

            {/* Explore More */}
            <div className="mb-12">
              <ModuleSlider 
                modules={proficiencyModules.filter(m => !user?.enrolledModules.includes(m.id))}
                title="Explorar Trilhas de Proficiência"
                subtitle="Descubra novos módulos para expandir seu conhecimento"
              />
            </div>

            <div>
              <ModuleSlider 
                modules={thematicModules.filter(m => !user?.enrolledModules.includes(m.id))}
                title="Módulos Temáticos"
                subtitle="Aprofunde-se em áreas específicas"
              />
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ContentProtection>
  );
};

export default Dashboard;

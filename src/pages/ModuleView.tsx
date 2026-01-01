import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, CheckCircle, Lock, Play } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ContentProtection from '@/components/ContentProtection';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getModuleById, Lesson } from '@/data/mockData';

const ModuleView: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const module = getModuleById(moduleId || '');

  if (!module) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-foreground mb-4">
            Módulo não encontrado
          </h1>
          <Button onClick={() => navigate('/dashboard')}>
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ContentProtection>
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-24 pb-16">
          {/* Hero */}
          <div className={`bg-gradient-to-br ${module.color} pattern-adinkra relative`}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="container mx-auto px-4 py-16 relative z-10">
              <Button
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/10 mb-6"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>

              <div className="max-w-3xl">
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium text-white mb-4">
                  {module.type === 'proficiency' ? `Nível ${module.level}` : module.theme}
                </span>
                <h1 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4">
                  {module.title}
                </h1>
                <p className="text-lg text-white/80 mb-6">
                  {module.description}
                </p>

                <div className="flex flex-wrap items-center gap-6 text-white/80">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    <span>{module.totalLessons} lições</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span>~{module.totalLessons * 30} minutos</span>
                  </div>
                </div>

                {module.progress > 0 && (
                  <div className="mt-6 max-w-sm">
                    <div className="flex justify-between text-sm text-white/80 mb-2">
                      <span>Seu progresso</span>
                      <span>{module.progress}%</span>
                    </div>
                    <Progress value={module.progress} className="h-2 bg-white/20" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lessons List */}
          <div className="container mx-auto px-4 py-12">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-8">
              Conteúdo do Módulo
            </h2>

            <div className="space-y-4">
              {module.lessons.length > 0 ? (
                module.lessons.map((lesson, index) => (
                  <LessonCard 
                    key={lesson.id} 
                    lesson={lesson} 
                    index={index}
                    moduleId={module.id}
                    isLocked={index > 0 && !module.lessons[index - 1].completed}
                  />
                ))
              ) : (
                <div className="bg-card rounded-xl p-8 text-center border border-border">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                    Conteúdo em Desenvolvimento
                  </h3>
                  <p className="text-muted-foreground">
                    As lições deste módulo estão sendo preparadas. Em breve estarão disponíveis!
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ContentProtection>
  );
};

interface LessonCardProps {
  lesson: Lesson;
  index: number;
  moduleId: string;
  isLocked: boolean;
}

const LessonCard: React.FC<LessonCardProps> = ({ lesson, index, moduleId, isLocked }) => {
  const navigate = useNavigate();

  return (
    <div 
      className={`
        bg-card rounded-xl p-6 border border-border transition-all duration-300
        ${isLocked ? 'opacity-60' : 'hover:shadow-soft hover:border-primary/30 cursor-pointer'}
      `}
      onClick={() => !isLocked && navigate(`/module/${moduleId}/lesson/${lesson.id}`)}
    >
      <div className="flex items-center gap-4">
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
          ${lesson.completed ? 'bg-green-100 text-green-600' : isLocked ? 'bg-muted text-muted-foreground' : 'gradient-gold text-secondary shadow-gold'}
        `}>
          {lesson.completed ? (
            <CheckCircle className="w-6 h-6" />
          ) : isLocked ? (
            <Lock className="w-5 h-5" />
          ) : (
            <span className="font-semibold">{index + 1}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-1">{lesson.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-1">{lesson.description}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{lesson.duration}</span>
          </div>
          
          {!isLocked && !lesson.completed && (
            <Button size="sm" className="gradient-gold text-secondary shadow-gold">
              <Play className="w-4 h-4 mr-1" />
              Iniciar
            </Button>
          )}
          
          {lesson.completed && (
            <Button size="sm" variant="outline">
              Revisar
            </Button>
          )}
        </div>
      </div>

      {lesson.exercises.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {lesson.exercises.length} exercício{lesson.exercises.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default ModuleView;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import { AchievementsDisplay } from '@/components/achievements/AchievementsDisplay';

const Achievements: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground">
                Conquistas
              </h1>
              <p className="text-muted-foreground">
                Acompanhe seu progresso e desbloqueie conquistas
              </p>
            </div>
          </div>

          {/* Achievements Display */}
          <AchievementsDisplay />
        </div>
      </main>
    </div>
  );
};

export default Achievements;

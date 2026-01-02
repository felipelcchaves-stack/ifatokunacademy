import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Calendar, Settings, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AvailabilitySelector } from '@/components/study-plan/AvailabilitySelector';
import { StudyPlanPreview } from '@/components/study-plan/StudyPlanPreview';
import { WeeklyScheduleView } from '@/components/study-plan/WeeklyScheduleView';
import { useStudyPlan } from '@/hooks/useStudyPlan';
import { useSearchParams } from 'react-router-dom';

const UserSettings = () => {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'profile';
  
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);

  const { 
    studyPlan, 
    calculation, 
    loading: studyPlanLoading, 
    calculating, 
    saveStudyPlan, 
    calculatePlan 
  } = useStudyPlan();

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          bio: bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStudyPlan = async (
    availability: any[],
    sessionDuration: number,
    preferredTime: string
  ) => {
    const success = await saveStudyPlan(availability, sessionDuration, preferredTime);
    if (success) {
      toast.success('Disponibilidade salva com sucesso!');
      // Recalcular plano automaticamente
      await calculatePlan();
    } else {
      toast.error('Erro ao salvar disponibilidade');
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Configurações</h1>
          <p className="text-muted-foreground mb-8">
            Gerencie seu perfil e preferências de estudo
          </p>

          <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="study-plan" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Plano de Estudos
              </TabsTrigger>
            </TabsList>

            {/* Tab Perfil */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Perfil</CardTitle>
                  <CardDescription>
                    Atualize suas informações pessoais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-lg">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{profile?.full_name || 'Usuário'}</p>
                      <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    </div>
                  </div>

                  {/* Formulário */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome completo</label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Bio</label>
                      <Textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Conte um pouco sobre você..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <Button onClick={handleSaveProfile} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Plano de Estudos */}
            <TabsContent value="study-plan" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coluna Esquerda - Seletor de Disponibilidade */}
                <div>
                  <AvailabilitySelector
                    initialAvailability={studyPlan?.availability || []}
                    initialSessionDuration={studyPlan?.session_duration_minutes || 45}
                    initialPreferredTime={studyPlan?.preferred_time || 'evening'}
                    onSave={handleSaveStudyPlan}
                    saving={studyPlanLoading}
                  />
                </div>

                {/* Coluna Direita - Preview e Cronograma */}
                <div className="space-y-6">
                  <StudyPlanPreview
                    studyPlan={studyPlan}
                    calculation={calculation}
                    calculating={calculating}
                    onCalculate={calculatePlan}
                  />
                  
                  {studyPlan && studyPlan.availability.length > 0 && (
                    <WeeklyScheduleView availability={studyPlan.availability} />
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UserSettings;

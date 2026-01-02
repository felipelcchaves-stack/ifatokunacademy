import React, { useState, useRef } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User, Calendar, Lock, Save, Camera, Loader2, AlertTriangle, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AvailabilitySelector } from '@/components/study-plan/AvailabilitySelector';
import { StudyPlanPreview } from '@/components/study-plan/StudyPlanPreview';
import { WeeklyScheduleView } from '@/components/study-plan/WeeklyScheduleView';
import { useStudyPlan } from '@/hooks/useStudyPlan';
import { useSearchParams } from 'react-router-dom';
import MFASetup from '@/components/auth/MFASetup';

const UserSettings = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'profile';
  
  // Profile state
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  
  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Reset progress state
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);

  const { 
    studyPlan, 
    calculation, 
    loading: studyPlanLoading, 
    calculating, 
    saveStudyPlan, 
    calculatePlan 
  } = useStudyPlan();

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
      await refreshProfile();
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL (add cache buster)
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setUploadingAvatar(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Erro ao alterar senha');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleResetProgress = async () => {
    if (!user || !confirmReset) return;

    setResetting(true);
    try {
      // Delete all user progress data
      const tables = [
        'user_progress',
        'spaced_repetition_items',
        'user_streaks',
        'user_experience',
        'daily_goals',
        'user_achievements',
        'module_completions',
        'challenge_records'
      ];

      for (const table of tables) {
        const { error } = await supabase
          .from(table as any)
          .delete()
          .eq('user_id', user.id);

        if (error) {
          console.error(`Error deleting from ${table}:`, error);
        }
      }

      toast.success('Progresso zerado com sucesso!');
      setConfirmReset(false);
      
      // Reload page to refresh all data
      window.location.reload();
    } catch (error) {
      console.error('Error resetting progress:', error);
      toast.error('Erro ao zerar progresso');
    } finally {
      setResetting(false);
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
      await calculatePlan();
    } else {
      toast.error('Erro ao salvar disponibilidade');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Configurações</h1>
          <p className="text-muted-foreground mb-8">
            Gerencie seu perfil, segurança e preferências de estudo
          </p>

          <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Perfil</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">Segurança</span>
              </TabsTrigger>
              <TabsTrigger value="study-plan" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Plano de Estudos</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Perfil */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Perfil</CardTitle>
                  <CardDescription>
                    Atualize suas informações pessoais e foto de perfil
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <Avatar className="h-20 w-20 cursor-pointer" onClick={handleAvatarClick}>
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-lg">
                          {getInitials(profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div 
                        className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={handleAvatarClick}
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        ) : (
                          <Camera className="h-6 w-6 text-white" />
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                      />
                    </div>
                    <div>
                      <p className="font-medium">{profile?.full_name || 'Usuário'}</p>
                      <p className="text-sm text-muted-foreground">{profile?.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Clique na foto para alterar
                      </p>
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

              {/* Zerar Progresso */}
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Zona de Perigo
                  </CardTitle>
                  <CardDescription>
                    Ações irreversíveis que afetam sua conta
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Zerar Todo o Progresso</AlertTitle>
                    <AlertDescription>
                      Esta ação irá deletar permanentemente todo o seu progresso de estudos,
                      incluindo exercícios completados, sequência de dias, XP, conquistas e certificações.
                      Esta ação não pode ser desfeita.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="confirm-reset"
                      checked={confirmReset}
                      onCheckedChange={(checked) => setConfirmReset(checked as boolean)}
                    />
                    <label
                      htmlFor="confirm-reset"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Entendo que esta ação é irreversível
                    </label>
                  </div>

                  <Button
                    variant="destructive"
                    onClick={handleResetProgress}
                    disabled={!confirmReset || resetting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {resetting ? 'Zerando...' : 'Zerar Todo Meu Progresso'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Segurança */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Alterar Senha</CardTitle>
                  <CardDescription>
                    Atualize sua senha de acesso à plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Senha atual</label>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Digite sua senha atual"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nova senha</label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Digite a nova senha (mínimo 6 caracteres)"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {newPassword && newPassword.length < 6 && (
                      <p className="text-xs text-destructive">
                        A senha deve ter pelo menos 6 caracteres
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirmar nova senha</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme a nova senha"
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-destructive">
                        As senhas não coincidem
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    {changingPassword ? 'Alterando...' : 'Alterar Senha'}
                  </Button>
                </CardContent>
              </Card>

              {/* 2FA Setup */}
              <MFASetup 
                onSetupComplete={() => setMfaEnabled(!mfaEnabled)} 
                mfaEnabled={mfaEnabled}
              />
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

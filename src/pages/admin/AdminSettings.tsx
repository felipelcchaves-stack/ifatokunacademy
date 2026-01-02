import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Settings, 
  Bell, 
  Gamepad2, 
  FileText, 
  Loader2,
  Save
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface PlatformSettings {
  general: {
    name: string;
    description: string;
  };
  gamification: {
    daily_goal: number;
    streak_multiplier: boolean;
    public_ranking: boolean;
  };
  notifications: {
    study_reminders: boolean;
    reminder_time: string;
    welcome_email: boolean;
  };
  content: {
    preview_unpublished: boolean;
    exercise_order: string;
    default_video_duration: number;
  };
}

const defaultSettings: PlatformSettings = {
  general: {
    name: "Offe Orunmila Learning",
    description: "Plataforma de estudos sobre Ifá e tradição Yoruba"
  },
  gamification: {
    daily_goal: 30,
    streak_multiplier: true,
    public_ranking: false
  },
  notifications: {
    study_reminders: true,
    reminder_time: "19:00",
    welcome_email: true
  },
  content: {
    preview_unpublished: false,
    exercise_order: "sequential",
    default_video_duration: 30
  }
};

export default function AdminSettings() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchSettings();
  }, [isAdmin, navigate]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value');

      if (error) throw error;

      if (data) {
        const newSettings = { ...defaultSettings };
        data.forEach((row) => {
          const key = row.key as keyof PlatformSettings;
          if (key in newSettings) {
            newSettings[key] = row.value as any;
          }
        });
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (key: keyof PlatformSettings, value: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({ value })
        .eq('key', key);

      if (error) throw error;
      toast.success('Configuração salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof PlatformSettings>(
    category: K,
    field: keyof PlatformSettings[K],
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleSaveCategory = (category: keyof PlatformSettings) => {
    saveSettings(category, settings[category]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as configurações da plataforma
        </p>
      </div>

      <Accordion type="multiple" defaultValue={["general", "gamification"]} className="space-y-4">
        {/* Configurações Gerais */}
        <AccordionItem value="general" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-primary" />
              <span className="font-semibold">Configurações Gerais</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform-name">Nome da Plataforma</Label>
                <Input
                  id="platform-name"
                  value={settings.general.name}
                  onChange={(e) => updateSetting('general', 'name', e.target.value)}
                  placeholder="Nome da plataforma"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform-description">Descrição</Label>
                <Textarea
                  id="platform-description"
                  value={settings.general.description}
                  onChange={(e) => updateSetting('general', 'description', e.target.value)}
                  placeholder="Descrição da plataforma para meta tags"
                  rows={3}
                />
              </div>
              <Button 
                onClick={() => handleSaveCategory('general')}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Configurações de Gamificação */}
        <AccordionItem value="gamification" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <Gamepad2 className="h-5 w-5 text-primary" />
              <span className="font-semibold">Gamificação</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="daily-goal">Meta Diária Padrão (XP)</Label>
                <Select
                  value={settings.gamification.daily_goal.toString()}
                  onValueChange={(value) => updateSetting('gamification', 'daily_goal', parseInt(value))}
                >
                  <SelectTrigger id="daily-goal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 XP - Casual</SelectItem>
                    <SelectItem value="20">20 XP - Regular</SelectItem>
                    <SelectItem value="30">30 XP - Sério</SelectItem>
                    <SelectItem value="50">50 XP - Intenso</SelectItem>
                    <SelectItem value="100">100 XP - Insano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Multiplicador de Streaks</Label>
                  <p className="text-sm text-muted-foreground">
                    Bonifica usuários com sequências de estudo
                  </p>
                </div>
                <Switch
                  checked={settings.gamification.streak_multiplier}
                  onCheckedChange={(checked) => updateSetting('gamification', 'streak_multiplier', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ranking Público</Label>
                  <p className="text-sm text-muted-foreground">
                    Exibir ranking de XP entre usuários
                  </p>
                </div>
                <Switch
                  checked={settings.gamification.public_ranking}
                  onCheckedChange={(checked) => updateSetting('gamification', 'public_ranking', checked)}
                />
              </div>
              <Button 
                onClick={() => handleSaveCategory('gamification')}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Configurações de Notificações */}
        <AccordionItem value="notifications" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <span className="font-semibold">Notificações</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Lembretes de Estudo</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar lembretes diários para estudantes
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.study_reminders}
                  onCheckedChange={(checked) => updateSetting('notifications', 'study_reminders', checked)}
                />
              </div>
              {settings.notifications.study_reminders && (
                <div className="space-y-2">
                  <Label htmlFor="reminder-time">Horário dos Lembretes</Label>
                  <Input
                    id="reminder-time"
                    type="time"
                    value={settings.notifications.reminder_time}
                    onChange={(e) => updateSetting('notifications', 'reminder_time', e.target.value)}
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email de Boas-Vindas</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar email ao criar conta
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.welcome_email}
                  onCheckedChange={(checked) => updateSetting('notifications', 'welcome_email', checked)}
                />
              </div>
              <Button 
                onClick={() => handleSaveCategory('notifications')}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Configurações de Conteúdo */}
        <AccordionItem value="content" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-semibold">Conteúdo</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Preview de Módulos Não Publicados</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir admins visualizarem conteúdo draft
                  </p>
                </div>
                <Switch
                  checked={settings.content.preview_unpublished}
                  onCheckedChange={(checked) => updateSetting('content', 'preview_unpublished', checked)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exercise-order">Ordem dos Exercícios</Label>
                <Select
                  value={settings.content.exercise_order}
                  onValueChange={(value) => updateSetting('content', 'exercise_order', value)}
                >
                  <SelectTrigger id="exercise-order">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Sequencial</SelectItem>
                    <SelectItem value="random">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="video-duration">Duração Padrão de Vídeos (minutos)</Label>
                <Input
                  id="video-duration"
                  type="number"
                  min={5}
                  max={120}
                  value={settings.content.default_video_duration}
                  onChange={(e) => updateSetting('content', 'default_video_duration', parseInt(e.target.value) || 30)}
                />
              </div>
              <Button 
                onClick={() => handleSaveCategory('content')}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

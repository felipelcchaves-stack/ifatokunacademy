-- Tabela de configurações da plataforma
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Configurações iniciais
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('general', '{"name": "Offe Orunmila Learning", "description": "Plataforma de estudos sobre Ifá e tradição Yoruba"}', 'Configurações gerais da plataforma'),
  ('gamification', '{"daily_goal": 30, "streak_multiplier": true, "public_ranking": false}', 'Configurações de gamificação'),
  ('notifications', '{"study_reminders": true, "reminder_time": "19:00", "welcome_email": true}', 'Configurações de notificações'),
  ('content', '{"preview_unpublished": false, "exercise_order": "sequential", "default_video_duration": 30}', 'Configurações de conteúdo');

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ler configurações
CREATE POLICY "Admins can read settings" ON public.platform_settings
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Apenas admins podem atualizar configurações
CREATE POLICY "Admins can update settings" ON public.platform_settings
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
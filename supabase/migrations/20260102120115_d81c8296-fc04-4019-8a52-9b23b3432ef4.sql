-- Tabela para cache de áudios gerados pelo ElevenLabs
CREATE TABLE public.generated_audio_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text_hash text NOT NULL UNIQUE,
  text_preview text NOT NULL,
  audio_url text NOT NULL,
  voice_id text NOT NULL DEFAULT 'CwhRBWXzGAHq8TQ4Fs17',
  file_size_bytes integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índice para busca rápida por hash
CREATE INDEX idx_generated_audio_cache_hash ON public.generated_audio_cache(text_hash);

-- Habilitar RLS
ALTER TABLE public.generated_audio_cache ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode visualizar o cache
CREATE POLICY "Anyone can view audio cache"
ON public.generated_audio_cache
FOR SELECT
USING (true);

-- Apenas o sistema (via service role) pode inserir
CREATE POLICY "Service role can insert audio cache"
ON public.generated_audio_cache
FOR INSERT
WITH CHECK (true);

-- Admins podem deletar entradas do cache
CREATE POLICY "Admins can delete audio cache"
ON public.generated_audio_cache
FOR DELETE
USING (is_admin(auth.uid()));
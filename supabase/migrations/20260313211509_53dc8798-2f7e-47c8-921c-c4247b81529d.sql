ALTER TABLE public.modules ADD COLUMN unlock_rule text NOT NULL DEFAULT 'sequential';
ALTER TABLE public.modules ADD COLUMN unlock_date timestamptz NULL;
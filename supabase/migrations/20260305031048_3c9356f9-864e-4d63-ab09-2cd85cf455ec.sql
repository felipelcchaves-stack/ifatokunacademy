
CREATE TABLE member_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id, reference_month)
);

ALTER TABLE member_dues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins manage dues"
ON member_dues FOR ALL TO authenticated
USING (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()))
WITH CHECK (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));

CREATE POLICY "Users view own dues"
ON member_dues FOR SELECT TO authenticated
USING (auth.uid() = user_id);

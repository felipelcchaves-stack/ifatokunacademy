
CREATE TABLE member_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  temple_role_id UUID REFERENCES temple_roles(id) ON DELETE SET NULL,
  religious_name TEXT,
  orixa_head TEXT,
  initiation_date DATE,
  oye_ile TEXT,
  is_board_member BOOLEAN NOT NULL DEFAULT false,
  is_fee_exempt BOOLEAN NOT NULL DEFAULT false,
  exemption_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

ALTER TABLE member_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage member profiles"
ON member_profiles FOR ALL TO authenticated
USING (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()))
WITH CHECK (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));

CREATE POLICY "Users can view own member profile"
ON member_profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

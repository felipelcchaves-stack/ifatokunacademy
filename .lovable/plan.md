

## Plano: Cadastro Estendido de Membros para Organizações Afroculturais

### Resumo

Criar uma tabela `member_profiles` com campos religiosos/administrativos (Orunkó, Orixá, data de iniciação, Oye Ile, cargo no templo, diretoria, isenção) e estender a página de membros (`AdminOrganizationMembers.tsx`) com um dialog de perfil completo para orgs afroculturais. Isso permite popular a hierarquia com membros reais.

---

### Fase 1: Tabela `member_profiles`

**Migração SQL:**

```sql
CREATE TABLE member_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  temple_role_id UUID REFERENCES temple_roles(id) ON DELETE SET NULL,
  religious_name TEXT,          -- Orunkó
  orixa_head TEXT,              -- Orixá de cabeça
  initiation_date DATE,
  oye_ile TEXT,                 -- Título/cargo Oye Ilê
  is_board_member BOOLEAN NOT NULL DEFAULT false,
  is_fee_exempt BOOLEAN NOT NULL DEFAULT false,
  exemption_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

ALTER TABLE member_profiles ENABLE ROW LEVEL SECURITY;

-- Org admins gerenciam
CREATE POLICY "Org admins can manage member profiles"
ON member_profiles FOR ALL TO authenticated
USING (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()))
WITH CHECK (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));

-- Membro vê o próprio
CREATE POLICY "Users can view own member profile"
ON member_profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);
```

---

### Fase 2: Estender `AdminOrganizationMembers.tsx`

**Mudanças na tabela de membros:**
- Verificar `organization_type` da org atual. Se `afrocultural` ou `association`, exibir colunas extras: Orunkó, Cargo (temple_role), Oye Ile, Diretoria.
- Adicionar botao "Perfil Religioso" no dropdown de acoes de cada membro.

**Dialog de Perfil Estendido:**
- Campos: Orunkó, Orixá de cabeça, Data de iniciação, Oye Ilê (texto livre), Cargo no templo (select populado de `temple_roles`), checkbox Diretoria, checkbox Isenção de mensalidade, Motivo da isenção, Notas.
- Ao selecionar um cargo com `grants_fee_exemption = true`, marcar automaticamente `is_fee_exempt`.
- Ao marcar `is_board_member`, preencher `exemption_reason = 'Membro da diretoria'`.

---

### Fase 3: Visualização no perfil do membro

- Em `UserSettings.tsx`: se a org do usuario for afrocultural, exibir seção somente leitura com os dados religiosos do `member_profiles`.

---

### Arquivos

| Arquivo | Acao |
|---|---|
| Migracao SQL | Criar tabela `member_profiles` + RLS |
| `AdminOrganizationMembers.tsx` | Estender com colunas extras + dialog de perfil religioso |
| `UserSettings.tsx` | Seção somente leitura de dados religiosos |


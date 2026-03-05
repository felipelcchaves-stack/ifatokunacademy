

## Plano: Páginas Institucionais para Organizações Afroculturais

### Resumo

Criar páginas admin exclusivas para organizações do tipo "afrocultural": Hierarquia do Templo (espiritual), Diretoria/Estatuto, Benefícios, e página pública do estatuto para membros. Adicionar `organization_type` à tabela `organizations` e condicionar exibição no menu.

---

### Regra de Acesso Fundamental

**Toda informação institucional — hierarquia religiosa (Oye Ile), hierarquia estatutária (diretoria/cargos administrativos), estatuto e benefícios — só pode ser criada, editada e removida pelo administrador do tenant (org admin ou global admin).** Membros comuns têm acesso somente leitura às informações publicadas. Isso será garantido por:

- RLS policies que restringem INSERT/UPDATE/DELETE a `is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid())`
- Membros da org têm apenas SELECT nas tabelas institucionais
- As páginas admin de gerenciamento ficam sob `/admin/organizations/:orgId/...`, protegidas por `ProtectedRoute` com `requireAdmin + allowOrgAdmin`

---

### Fase 1: Tipo de Organização

**Migração SQL:**
- Adicionar `organization_type TEXT DEFAULT 'educational'` à tabela `organizations`

**Código:**
- `AdminOrganizations.tsx`: select de tipo (Educacional / Afrocultural / Associação)

---

### Fase 2: Tabelas Institucionais

**Migração SQL:**

```sql
-- Cargos (espiritual + diretoria)
CREATE TABLE temple_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'spiritual', -- 'spiritual' ou 'board'
  is_board_member BOOLEAN NOT NULL DEFAULT false,
  grants_fee_exemption BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Estatuto
CREATE TABLE organization_bylaws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Benefícios
CREATE TABLE organization_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS (aplicada igualmente às 3 tabelas):**

```sql
-- Somente org admin ou global admin podem gerenciar
CREATE POLICY "Org admins can manage"
ON temple_roles FOR ALL TO authenticated
USING (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()))
WITH CHECK (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));

-- Membros da org podem apenas visualizar
CREATE POLICY "Org members can view"
ON temple_roles FOR SELECT TO authenticated
USING (is_organization_member(organization_id, auth.uid()));
```

---

### Fase 3: Páginas Admin (somente org admin)

| Arquivo | Descrição |
|---|---|
| `AdminTempleHierarchy.tsx` | CRUD de cargos espirituais e de diretoria, separados por abas (spiritual/board). Só acessível por org admin. |
| `AdminBylaws.tsx` | CRUD de artigos do estatuto. Toggle publicar. Só org admin. |
| `AdminBenefits.tsx` | CRUD de benefícios. Só org admin. |

---

### Fase 4: Página pública (leitura para membros)

- `BylawsView.tsx` — membros logados veem artigos publicados (`is_published = true`) da sua org
- Rota: `/org/:orgSlug/bylaws`

---

### Modificações em arquivos existentes

| Arquivo | Mudança |
|---|---|
| `AdminLayout.tsx` | Seção "Institucional" no menu, visível só para orgs `afrocultural` |
| `App.tsx` | Novas rotas admin + rota pública do estatuto |
| `AdminOrganizations.tsx` | Select de tipo de org |

---

### Resumo de permissões

| Ação | Global Admin | Org Admin | Membro |
|---|---|---|---|
| Criar/editar/excluir cargos | ✅ | ✅ | ❌ |
| Criar/editar/excluir estatuto | ✅ | ✅ | ❌ |
| Criar/editar/excluir benefícios | ✅ | ✅ | ❌ |
| Visualizar cargos | ✅ | ✅ | ✅ (leitura) |
| Visualizar estatuto publicado | ✅ | ✅ | ✅ (leitura) |
| Visualizar benefícios ativos | ✅ | ✅ | ✅ (leitura) |


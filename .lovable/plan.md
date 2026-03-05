

## Plano: Sistema de Mensalidades e Lembretes para Membros

### Problema

Não existe nenhuma tabela de mensalidades/cobranças, nem forma de lembrar membros sobre pagamentos pendentes. Nada aparece no dashboard do membro.

---

### Fase 1: Tabela `member_dues` (mensalidades)

Migração SQL para criar a tabela que registra mensalidades por membro/org:

```sql
CREATE TABLE member_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL,          -- ex: 2026-03-01 = março/2026
  amount_cents INTEGER NOT NULL,          -- valor em centavos
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, overdue, exempt
  due_date DATE NOT NULL,                 -- vencimento
  paid_at TIMESTAMPTZ,
  payment_method TEXT,                    -- boleto, pix, cartao
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id, reference_month)
);

ALTER TABLE member_dues ENABLE ROW LEVEL SECURITY;

-- Org admins gerenciam todas as mensalidades
CREATE POLICY "Org admins manage dues"
ON member_dues FOR ALL TO authenticated
USING (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()))
WITH CHECK (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));

-- Membro vê as próprias mensalidades
CREATE POLICY "Users view own dues"
ON member_dues FOR SELECT TO authenticated
USING (auth.uid() = user_id);
```

---

### Fase 2: Admin — Gestão de Mensalidades

**Novo arquivo: `src/pages/admin/AdminDues.tsx`**

Página no admin (rota `/admin/organizations/:organizationId/dues`) com:
- Tabela de mensalidades: membro, mês referência, valor, vencimento, status (badge colorido)
- Botão "Gerar Mensalidades do Mês" — cria registros `pending` para todos os membros ativos (exceto `is_fee_exempt`)
- Botão para marcar como "Pago" individualmente
- Filtros por mês e status

**Arquivo: `AdminLayout.tsx`** — Adicionar link "Mensalidades" (ícone `Receipt`) no grupo institucional para orgs `religious_association`.

**Arquivo: `App.tsx`** — Adicionar rota `/admin/organizations/:organizationId/dues`.

---

### Fase 3: Dashboard do Membro — Alerta de Mensalidade

**Novo componente: `src/components/dashboard/DuesAlert.tsx`**

- Busca `member_dues` do usuário com status `pending` ou `overdue`
- Exibe um card/banner no dashboard: "Você tem mensalidade(s) pendente(s)" com valor, vencimento e status
- Destaque visual para mensalidades vencidas (overdue)

**Arquivo: `Dashboard.tsx`** — Renderizar `<DuesAlert />` no topo do dashboard quando a org for `religious_association`.

---

### Fase 4: Links Institucionais no Header (membros)

**Arquivo: `Header.tsx`** — Quando `organization.organization_type === 'religious_association'`, adicionar links extras na navegação:
- Hierarquia → `/org/:slug/hierarchy`
- Estatuto → `/org/:slug/bylaws`
- Benefícios → `/org/:slug/benefits`
- Mensalidades → `/org/:slug/dues`

---

### Fase 5: Página do Membro — Minhas Mensalidades

**Novo arquivo: `src/pages/MemberDuesView.tsx`**

Página somente leitura listando as mensalidades do membro logado, com histórico e status.

**Arquivo: `App.tsx`** — Rota `/org/:orgSlug/dues`.

---

### Resumo de Arquivos

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar tabela `member_dues` + RLS |
| `src/pages/admin/AdminDues.tsx` | **Criar** — gestão de mensalidades por org |
| `src/components/dashboard/DuesAlert.tsx` | **Criar** — alerta de pendência no dashboard |
| `src/pages/MemberDuesView.tsx` | **Criar** — histórico de mensalidades do membro |
| `src/pages/HierarchyView.tsx` | **Criar** — visualização de hierarquia (membro) |
| `src/pages/BenefitsView.tsx` | **Criar** — visualização de benefícios (membro) |
| `src/components/layout/Header.tsx` | Adicionar links institucionais para membros |
| `src/components/layout/AdminLayout.tsx` | Adicionar link "Mensalidades" no menu admin |
| `src/App.tsx` | Adicionar rotas novas |
| `src/pages/Dashboard.tsx` | Renderizar `DuesAlert` |


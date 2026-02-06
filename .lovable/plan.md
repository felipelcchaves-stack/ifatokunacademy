

## Correcao: Isolamento de Organizacao no Admin

### Problema identificado

Analisando os dados do banco:

| Organizacao | Slug | Modulos |
|-------------|------|---------|
| Ifatokun Academy | ifatokun | 52 |
| Ijo Ifatokun | ijoifatokun | 0 |
| Ijo Ifadola | ijoifadola | 0 |

**Memberships do admin:**
- O usuario admin (`ifatokun@ileaseifatokun.com.br`) so e membro de **Ifatokun Academy**
- Nao e membro de Ijo Ifatokun nem Ijo Ifadola

Isso causa dois problemas:
1. No admin, o seletor de organizacao so mostra "Ifatokun Academy" (a unica org do usuario)
2. As outras organizacoes nao aparecem no switcher, entao o admin sempre ve os 52 modulos de Ifatokun Academy
3. As outras orgs tem 0 modulos, entao mesmo que funcionasse o filtro, nao haveria conteudo

### Correcao em 3 partes

#### Parte 1 — Admins globais devem ver TODAS as organizacoes no switcher

O `useAdminOrganization` atualmente busca organizacoes apenas pela tabela `organization_members`. Para admins globais (que estao na tabela `admin_emails`), devemos buscar **todas** as organizacoes ativas, nao apenas aquelas onde sao membros.

**Arquivo:** `src/hooks/useAdminOrganization.ts`

Mudanca: Se o usuario for admin global (`isAdmin` do AuthContext), buscar diretamente da tabela `organizations` em vez de filtrar por `organization_members`.

```text
Se isAdmin:
  -> buscar TODAS de organizations WHERE is_active = true
Senao:
  -> buscar via organization_members (comportamento atual)
```

#### Parte 2 — Adicionar admin como membro das outras organizacoes

Criar uma migracao SQL para inserir o usuario admin como membro (role: admin) das organizacoes Ijo Ifatokun e Ijo Ifadola, e tambem na tabela `organization_admins`.

Isso garante que as politicas de RLS permitam o admin gerenciar modulos dessas orgs.

**Tipo:** Migracao SQL

#### Parte 3 — Garantir que o admin global possa criar/editar modulos em qualquer org

Verificar que as politicas RLS de `modules` e `lessons` permitem que admins globais operem em qualquer organizacao. Pela analise atual, ja existem politicas "Global admins can manage all modules" usando `is_admin(auth.uid())`, entao isso ja deve funcionar.

O problema real e que o `useAdminOrganization` nao lista todas as orgs para o admin global selecionar.

---

### Secao tecnica

**Arquivo: `src/hooks/useAdminOrganization.ts`**

Modificar `fetchOrganizations` para verificar `isAdmin` (do `useAuth()`):
- Se admin global: `supabase.from('organizations').select('*').eq('is_active', true)`
- Se org admin: manter query atual via `organization_members`

Adicionar `isAdmin` como dependencia do `useCallback`.

**Migracao SQL:**

```sql
-- Adicionar admin como membro e admin das outras orgs
INSERT INTO organization_members (user_id, organization_id, role, is_primary)
SELECT 
  'c50ed8ee-60ab-46f0-9689-4f002fa7175b',
  o.id,
  'admin',
  false
FROM organizations o
WHERE o.slug IN ('ijoifatokun', 'ijoifadola')
AND NOT EXISTS (
  SELECT 1 FROM organization_members om 
  WHERE om.user_id = 'c50ed8ee-60ab-46f0-9689-4f002fa7175b' 
  AND om.organization_id = o.id
);

INSERT INTO organization_admins (user_id, organization_id, role)
SELECT 
  'c50ed8ee-60ab-46f0-9689-4f002fa7175b',
  o.id,
  'admin'
FROM organizations o
WHERE o.slug IN ('ijoifatokun', 'ijoifadola')
AND NOT EXISTS (
  SELECT 1 FROM organization_admins oa 
  WHERE oa.user_id = 'c50ed8ee-60ab-46f0-9689-4f002fa7175b' 
  AND oa.organization_id = o.id
);
```

### Resultado esperado

1. Admin global vera **todas** as organizacoes no switcher do painel admin
2. Ao selecionar "Ijo Ifatokun", vera 0 modulos (porque essa org ainda nao tem modulos)
3. Podera criar modulos novos para essa org
4. O conteudo de "Ifatokun Academy" nunca aparecera quando outra org estiver selecionada


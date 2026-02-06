
## Correcao: Admin nao carrega o slug correto + validacao de acesso

### Problema raiz

Existem **dois problemas separados** que se combinam para quebrar o isolamento no admin:

**Problema 1: OrganizationContext ignora o switcher do admin**

O `OrganizationContext` detecta a organizacao via pathname (`/org/:slug`) ou hostname. Quando o admin esta em `/admin`, nao ha slug no path, entao ele sempre resolve para o tenant do hostname (que e sempre `ifatokun` no dominio principal). Mesmo que o admin troque de org no switcher (`useAdminOrganization`), o `OrganizationContext` continua mostrando "Ifatokun Academy".

Isso significa que:
- O branding no sidebar (nome da org, cores) nao muda
- O `isOrgAdmin` nao reflete a org selecionada
- Qualquer componente que use `useOrganization()` pega dados da org errada

**Problema 2: Nao existe rota /org/:slug/admin**

O `App.tsx` so define rotas admin em `/admin/*`. Acessar `/org/ijoifadola/admin` cai no catch-all `*` e mostra 404. Nao ha validacao de acesso por org na area admin alem do que `ProtectedRoute` faz (que so verifica `isAdmin || isOrgAdmin` globalmente).

### Solucao

A arquitetura atual do admin usa um **switcher centralizado** (`useAdminOrganization`) em vez de rotas por org. Isso e valido e ja funciona para filtrar dados. O problema e que o `OrganizationContext` nao sincroniza com o switcher.

#### Correcao 1: Sincronizar OrganizationContext com o switcher do admin

**Arquivo: `src/contexts/OrganizationContext.tsx`**

Adicionar uma funcao `setOrganizationById(orgId)` exposta no contexto que permite ao admin switcher forcar a mudanca de org no contexto global. Isso garante que branding, nome e `isOrgAdmin` reflitam a org ativa.

Mudancas:
- Expor `setOrganizationById` no contexto
- Criar funcao que busca e seta a org pelo ID

#### Correcao 2: AdminLayout sincroniza org ao trocar

**Arquivo: `src/components/layout/AdminLayout.tsx`**

Quando o `activeOrg` do `useAdminOrganization` muda, chamar `setOrganizationById(activeOrg.id)` para manter o `OrganizationContext` em sincronia.

#### Correcao 3: Redirecionar /org/:slug/admin para /admin (com sincronizacao)

**Arquivo: `src/App.tsx`**

Em vez de registrar todas as rotas admin duplicadas sob `/org/:slug/admin/*`, adicionar uma unica rota catch-all que redireciona `/org/:slug/admin` para `/admin` e sincroniza o slug. Isso evita 404 e garante que o contexto correto seja carregado.

Alternativa mais simples: adicionar uma rota `/org/:orgSlug/admin` que renderiza um componente de redirect que sincroniza a org e redireciona para `/admin`.

### Secao tecnica

**Arquivo: `src/contexts/OrganizationContext.tsx`**

```
// Adicionar ao contexto:
setOrganizationById: (orgId: string) => Promise<void>;

// Implementacao:
const setOrganizationById = async (orgId: string) => {
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();
  if (data) {
    // aplicar branding e setar state (mesma logica do fetchOrganization)
    setOrganization({ ...data, branding: merged, settings: merged });
  }
};
```

**Arquivo: `src/components/layout/AdminLayout.tsx`**

```
// Importar refreshOrganization ou novo setOrganizationById
const { setOrganizationById } = useOrganization();

// Sincronizar quando activeOrg muda
useEffect(() => {
  if (activeOrg?.id) {
    setOrganizationById(activeOrg.id);
  }
}, [activeOrg?.id]);
```

**Arquivo: `src/App.tsx`**

```
// Adicionar componente de redirect + sync
const AdminOrgRedirect = () => {
  const { orgSlug } = useParams();
  // Busca org por slug, sincroniza useAdminOrganization, e redireciona para /admin
  return <Navigate to="/admin" replace />;
};

// Rota:
<Route path="/org/:orgSlug/admin/*" element={
  <ProtectedRoute requireAdmin allowOrgAdmin>
    <AdminOrgRedirect />
  </ProtectedRoute>
} />
```

**Arquivo: `src/hooks/useAdminOrganization.ts`**

Adicionar funcao `switchOrganizationBySlug(slug)` que busca o ID pelo slug e chama `switchOrganization(id)` sem reload (o reload atual e agressivo demais e pode ser substituido por invalidacao de cache do React Query).

### Validacao de acesso

O `OrgDashboard` ja valida se o usuario tem acesso a organizacao (via membership, profile, ou org_admin). Para o admin, o `ProtectedRoute` verifica `isAdmin || isOrgAdmin`. Um org admin que nao pertence a uma org nao consegue ver dados dela porque as queries filtram por `activeOrg.id` (que so lista orgs onde ele e membro).

### Resultado esperado

1. Ao trocar de org no switcher do admin, o nome e branding mudam no sidebar e em toda a pagina
2. Acessar `/org/ijoifadola/admin` redireciona para `/admin` com a org "Ijo Ifa Dola" selecionada automaticamente
3. Todas as queries admin continuam filtradas por `activeOrg.id`
4. Org admins so veem organizacoes das quais sao membros

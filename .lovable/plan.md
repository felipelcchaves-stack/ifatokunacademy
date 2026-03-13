

## Plano: Corrigir Switcher de Organizações — Mostrar Todas as Orgs

### Diagnóstico

O hook `useUserOrganizations` busca organizações **apenas** da tabela `organization_members`. Se você é admin global (via `admin_emails`), provavelmente não tem registros em `organization_members` para todas as organizações — apenas para aquelas onde foi adicionado como membro explicitamente. Por isso o combobox mostra apenas um subconjunto.

O hook `useAdminOrganization` (usado no painel admin) já resolve isso corretamente: quando `isAdmin === true`, busca **todas** as organizações ativas diretamente da tabela `organizations`.

### Solução

**Arquivo: `src/hooks/useUserOrganizations.ts`**

Adicionar a mesma lógica do `useAdminOrganization`:

1. Importar `isAdmin` do `useAuth()`
2. Quando `isAdmin === true`, buscar todas as orgs ativas da tabela `organizations` (não depender de `organization_members`)
3. Mapear essas orgs para o formato `UserOrganization` com role `'admin'`
4. Quando não for admin global, manter a lógica atual (buscar via `organization_members`)

### Resultado

Admin global verá **todas** as organizações ativas no switcher. Usuários normais continuam vendo apenas as organizações onde são membros.


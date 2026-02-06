

## Correcao: Isolamento de Organizacao Incompleto no Admin

### Problema raiz

Analisei todas as paginas admin e identifiquei que o isolamento de organizacao nao e aplicado de forma consistente. Enquanto algumas paginas (AdminModules, AdminLessons, AdminInvites, AdminUsers) filtram corretamente por `activeOrg.id`, outras paginas ignoram completamente a organizacao ativa.

### Paginas com problema (sem filtro de organizacao)

| Pagina | Arquivo | Problema |
|--------|---------|----------|
| Relatorios | `src/hooks/useAdminReports.ts` | Busca TODOS os modulos, licoes, exercicios e perfis sem nenhum filtro de org |
| Configuracoes | `src/pages/admin/AdminSettings.tsx` | Busca `platform_settings` sem filtrar por `organization_id` |
| AdminDashboard | `src/pages/admin/AdminDashboard.tsx` | Tem redirect `if (!isAdmin)` na linha 78 que pode redirecionar o admin antes de `isAdmin` ser resolvido (race condition) |

### Paginas que ja funcionam corretamente

- AdminModules - filtra por `activeOrg.id`
- AdminLessons - filtra por modulo (que pertence a org)
- AdminLessonsOverview - filtra por `activeOrg.id`
- AdminUsers - filtra por `activeOrg.id`
- AdminInvites - filtra por `activeOrg.id`
- AdminExerciseCleanup - filtra por `activeOrg.id`
- AdminImportOdu - filtra por `activeOrg.id`
- AdminGenerateTapComplete - filtra por `activeOrg.id`
- AdminGenerateDragDrop - filtra por `activeOrg.id`

### Correcoes propostas

#### 1. Corrigir `useAdminReports.ts` — Filtrar por organizacao

Adicionar `activeOrg` como parametro e filtrar todas as queries por organizacao:

- `modules` → `.eq('organization_id', orgId)`
- `lessons` → via join com modules filtrados por org
- `exercises` → via join com lessons de modules filtrados por org
- `profiles` → via `organization_members` filtrados por org
- `user_progress` → via modules filtrados por org
- `module_completions` → via modules filtrados por org

#### 2. Corrigir `AdminSettings.tsx` — Filtrar por organizacao

- Importar `useAdminOrganization`
- Filtrar `platform_settings` por `organization_id = activeOrg.id`
- Ao salvar, incluir `organization_id` no filtro

#### 3. Corrigir `AdminDashboard.tsx` — Remover redirect redundante

Remover o `useEffect` na linha 78-82 que faz `if (!isAdmin) navigate('/dashboard')`. Esse redirect e redundante porque o `ProtectedRoute` ja cuida disso, e causa problemas porque `isAdmin` inicia como `false` antes de ser resolvido assincronamente.

#### 4. Corrigir `AdminReports.tsx` — Passar org para o hook

Atualizar a pagina de relatorios para passar `activeOrg.id` ao hook `useAdminReports`.

### Secao tecnica

**Arquivo: `src/hooks/useAdminReports.ts`**
- Adicionar parametro `organizationId?: string`
- Todas as queries de modules filtradas por `.eq('organization_id', orgId)`
- Lessons filtradas via `moduleIds` (modulos da org)
- Exercises filtrados via `lessonIds` (licoes dos modulos da org)
- Profiles filtrados via `organization_members`
- Adicionar `organizationId` na `queryKey` para cache correto

**Arquivo: `src/pages/admin/AdminReports.tsx`**
- Importar `useAdminOrganization`
- Passar `activeOrg?.id` para `useAdminReports`

**Arquivo: `src/pages/admin/AdminSettings.tsx`**
- Importar `useAdminOrganization`
- Filtrar queries de `platform_settings` por `organization_id`
- Passar `organization_id` ao salvar/atualizar

**Arquivo: `src/pages/admin/AdminDashboard.tsx`**
- Remover linhas 78-82 (redirect redundante que causa race condition)

### Resultado esperado

Apos essas correcoes, TODAS as paginas do admin respeitarao a organizacao selecionada no switcher. Ao trocar de organizacao, relatorios, configuracoes e dashboard mostrarao dados exclusivos daquela org.


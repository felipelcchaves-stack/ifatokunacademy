## Diagnóstico

Verifiquei a organização **"Ensimanento para Awos"** (`awo-isefa`):

- 3 usuários cadastrados e vinculados via `profiles.organization_id` ✅
- 2 módulos publicados (`Introdução e Ojubo Ifa`, `Isefa`) ✅
- 0 turmas (cohorts) ✅ — então o filtro de turma não interfere
- **Cada usuário só tem 1 entrada em `user_module_permissions`** (apenas para `Introdução e Ojubo Ifa`). Nenhum tem permissão para `Isefa`.

### Causa raiz

O hook `useModulePermissions.hasAccess()` exige uma linha em `user_module_permissions` para cada par (usuário × módulo). Em `Dashboard.tsx` esse filtro é aplicado antes de qualquer outra coisa:

```ts
let accessibleModules = modules.filter(m => hasAccess(m.id));
```

Como não há fluxo automático que crie essas linhas quando:
- o usuário aceita um convite,
- entra em uma organização,
- ou um módulo é publicado,

os membros ficam invisíveis a quase todos os módulos publicados da própria organização. Hoje só veem os módulos para os quais alguém deu permissão manual em `AdminUsers`.

A intenção do modelo multi-tenant é: **um membro vê todos os módulos publicados da sua organização**. `user_module_permissions` deve servir apenas para liberar **módulos não publicados** (preview) a usuários específicos.

## Plano

### 1. Tornar acesso a módulos publicados implícito por organização

Atualizar `src/hooks/useModulePermissions.ts`:

- `hasAccess(moduleId, isPublished?, moduleOrgId?)` retorna `true` quando:
  - usuário é admin global, **ou**
  - usuário é admin da organização do módulo, **ou**
  - o módulo está **publicado** e pertence à organização do usuário (ou é global, `organization_id = null`), **ou**
  - existe entrada explícita em `user_module_permissions` (para previews de módulos despublicados).
- Buscar `profile.organization_id` e flag de org-admin uma vez no hook.

### 2. Ajustar consumidores do hook

- `src/pages/Dashboard.tsx`: passar `m.is_published` e `m.organization_id` para `hasAccess`.
- `src/pages/ModuleView.tsx` (se usar `hasAccess`): mesma adaptação. Caso contrário, a RLS já cobre.
- Garantir que `useDashboardData` continue retornando `is_published` e `organization_id` no `Module` (já retorna).

### 3. Backfill seguro (uma vez)

Sem alterações de schema. Apenas remover o gargalo no cliente — não há necessidade de criar linhas em massa em `user_module_permissions`. A RLS de `modules` (`SELECT`) já permite que membros vejam módulos publicados da sua organização.

### 4. Verificação

Após o deploy:
- Logar como `mmuller.web@gmail.com` no `/org/awo-isefa/dashboard` e confirmar que os **dois módulos** aparecem.
- Abrir cada módulo e confirmar que as lições publicadas carregam.
- Logar como admin global → continua vendo tudo.
- Confirmar que um módulo **não publicado** continua oculto para membros não-admin (a menos que tenham `user_module_permissions`).

## Detalhes técnicos

| Arquivo | Mudança |
|---|---|
| `src/hooks/useModulePermissions.ts` | Buscar `profile.organization_id` + lista de orgs onde o usuário é admin. `hasAccess` aceita `(moduleId, isPublished, moduleOrgId)` e retorna `true` quando publicado e da mesma org, ou via permissão explícita / admin. |
| `src/pages/Dashboard.tsx` | Passar `m.is_published` e `m.organization_id` ao chamar `hasAccess`. |
| `src/pages/ModuleView.tsx` | Se aplicável, idem (verificar uso de `hasAccess`). |

Nenhuma migração de banco é necessária — RLS atual já está correta.
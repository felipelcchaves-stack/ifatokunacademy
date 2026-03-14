

## Plano: Regras de desbloqueio por turma — ✅ IMPLEMENTADO

### O que foi feito

1. **Migração SQL** — Adicionadas colunas `unlock_rule` (text, default 'manual') e `unlock_date` (timestamptz) na tabela `cohort_modules`

2. **`src/hooks/useCohortFilter.ts`** — Reescrito para retornar:
   - `hasCohorts` — se o usuário pertence a turmas ativas
   - `allowedModuleIds` — Set com IDs dos módulos atribuídos
   - `cohortModuleMap` — Map com regra de desbloqueio por módulo
   - Fallback: turma sem módulos → mostra todos

3. **`src/hooks/useSequentialProgress.ts`** — `isModuleUnlocked`, `getUnlockRequirement` e `calculateLockedModules` agora aceitam `cohortModuleMap` opcional que sobrescreve a regra global do módulo

4. **`src/pages/Dashboard.tsx`** — Filtro por turma aplicado: se `hasCohorts && allowedModuleIds.size > 0`, mostra apenas módulos da turma. Regras de desbloqueio da turma passadas ao `calculateLockedModules`

5. **`src/pages/ModuleView.tsx`** — Bloqueio de acesso direto: se módulo não está nos `allowedModuleIds`, mostra "Módulo não liberado para sua turma"

6. **`src/pages/admin/AdminCohorts.tsx`** — Aba "Módulos" adicionada com:
   - Checkboxes para atribuir módulos à turma
   - Seletor de regra (sempre liberado, sequencial, por data, manual)
   - Campo de data para regra date_based

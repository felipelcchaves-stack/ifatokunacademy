

## Plano: Regras de desbloqueio por turma

### Problema
Hoje, `unlock_rule` e `unlock_date` estão na tabela `modules` — são **globais**. Se você coloca o módulo 2 como `date_based` para 20/03, isso vale para todas as turmas. Você precisa que:
- Turma 1: módulo 2 já desbloqueado (começou há semanas)
- Turma 2: módulo 2 bloqueado até semana que vem
- Turma 3: módulo 2 nem visível ainda

### Solução
Adicionar `unlock_rule` e `unlock_date` na tabela `cohort_modules`. Quando o aluno pertence a uma turma, o sistema usa a regra da turma em vez da regra global do módulo.

### Mudanças

**1. Migração SQL — Adicionar colunas em `cohort_modules`**
```sql
ALTER TABLE cohort_modules 
  ADD COLUMN unlock_rule text NOT NULL DEFAULT 'manual',
  ADD COLUMN unlock_date timestamptz NULL;
```
Assim cada par turma+módulo tem sua própria regra de desbloqueio.

**2. `src/hooks/useCohortFilter.ts`** — Expandir para retornar um mapa de módulos com suas regras por turma:
- Buscar `cohort_modules` (module_id, unlock_rule, unlock_date) das turmas ativas do usuário
- Retornar `cohortModuleMap: Map<string, { unlock_rule, unlock_date }>` além de `allowedModuleIds` e `hasCohorts`
- Fallback: turma sem módulos atribuídos → mostrar tudo com regra global

**3. `src/hooks/useSequentialProgress.ts`** — Modificar `isModuleUnlocked` para aceitar override de turma:
- Se o usuário tem turma e o módulo está no `cohortModuleMap`, usar `unlock_rule` e `unlock_date` da turma
- Se não tem turma, usar a regra global do módulo (comportamento atual)

**4. `src/pages/Dashboard.tsx`** — Integrar o filtro de turma:
- Importar `useCohortFilter`
- Filtrar módulos: se `hasCohorts && allowedModuleIds.size > 0`, mostrar apenas os da turma
- Passar as regras de desbloqueio da turma para o `useSequentialProgress`

**5. `src/pages/ModuleView.tsx`** — Verificar acesso por turma:
- Se o módulo não está nos `allowedModuleIds`, mostrar "Este módulo ainda não foi liberado para sua turma"

**6. `src/pages/admin/AdminCohorts.tsx`** — Re-adicionar aba "Módulos" com controle de regra:
- Listar módulos publicados da organização com checkboxes
- Para cada módulo atribuído, permitir selecionar `unlock_rule` (sequential, date_based, manual, always_unlocked) e `unlock_date`
- Toggle insere/remove em `cohort_modules` com a regra escolhida

### Fluxo esperado

```text
Admin cria Turma 1 → atribui Módulos 1,2,3 com unlock_rule=always_unlocked
Admin cria Turma 2 → atribui Módulo 1 com always_unlocked, Módulo 2 com date_based (27/03)
Admin cria Turma 3 → atribui apenas Módulo 1 com manual (libera quando quiser)

Aluno Turma 1 → vê Módulos 1,2,3 todos desbloqueados
Aluno Turma 2 → vê Módulo 1 desbloqueado, Módulo 2 com countdown "libera em X dias"
Aluno Turma 3 → vê Módulo 1 com "aguardando liberação"
```

### Arquivos afetados
| Arquivo | Mudança |
|---|---|
| Migração SQL | Adicionar `unlock_rule` e `unlock_date` em `cohort_modules` |
| `src/hooks/useCohortFilter.ts` | Retornar `cohortModuleMap` com regras por turma |
| `src/hooks/useSequentialProgress.ts` | Usar regra da turma quando disponível |
| `src/pages/Dashboard.tsx` | Filtrar módulos e aplicar regras por turma |
| `src/pages/ModuleView.tsx` | Bloquear acesso a módulos fora da turma |
| `src/pages/admin/AdminCohorts.tsx` | Aba "Módulos" com seletor de regra de desbloqueio |


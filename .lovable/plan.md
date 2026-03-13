

## Plano: Sistema de Turmas com Isolamento Total

### Modelo de Dados

**3 novas tabelas:**

| Tabela | Colunas principais |
|---|---|
| `cohorts` | id, organization_id (NOT NULL), name, description, starts_at, ends_at, is_active, created_at |
| `cohort_members` | id, cohort_id (NOT NULL), user_id (NOT NULL), enrolled_at. UNIQUE(cohort_id, user_id) |
| `cohort_modules` | id, cohort_id (NOT NULL), module_id (NOT NULL), display_order. UNIQUE(cohort_id, module_id) |

### Isolamento via RLS

O isolamento é garantido em **duas camadas**: RLS no banco e filtragem no código.

**Tabela `cohorts`:**
- SELECT: org admins veem todas da org; membros veem apenas turmas onde estão matriculados (`EXISTS cohort_members`)
- INSERT/UPDATE/DELETE: apenas org admins e global admins

**Tabela `cohort_members`:**
- SELECT: org admins veem todos; usuários veem apenas suas próprias matrículas (`user_id = auth.uid()`)
- INSERT/DELETE: apenas org admins e global admins
- **Um aluno NÃO consegue ver quem está em outra turma**

**Tabela `cohort_modules`:**
- SELECT: org admins veem todos; usuários veem apenas módulos de turmas onde estão matriculados:
  ```sql
  EXISTS (
    SELECT 1 FROM cohort_members cm
    WHERE cm.cohort_id = cohort_modules.cohort_id
    AND cm.user_id = auth.uid()
  )
  ```
- INSERT/UPDATE/DELETE: apenas org admins e global admins

**Isolamento de progresso** — As tabelas `user_progress`, `module_completions`, `spaced_repetition_items` já têm RLS `user_id = auth.uid()`, então o progresso de um aluno nunca vaza para outro. Cada aluno só vê seus próprios dados.

### Filtragem no Dashboard (camada 2)

**`useDashboardData.ts`:**
1. Buscar `cohort_members` WHERE `user_id = current_user` (com join para pegar `cohort_id`)
2. Se encontrar turmas ativas → buscar `cohort_modules` dessas turmas → extrair `module_id`s
3. Filtrar módulos para mostrar **APENAS** os que pertencem às turmas do aluno
4. Se não pertencer a nenhuma turma → manter comportamento atual (backward-compatible)
5. A `display_order` de `cohort_modules` sobrescreve a `display_order` global do módulo dentro daquela turma

### Admin UI

**Nova página `AdminCohorts.tsx`:**
- CRUD de turmas (nome, descrição, datas, status ativo/inativo)
- Aba "Alunos": adicionar/remover membros da organização à turma
- Aba "Módulos": atribuir módulos existentes da org à turma, com drag-and-drop para ordenar
- Turma inativa = alunos não veem os módulos dela

**`AdminLayout.tsx`:** Adicionar item "Turmas" no menu lateral

**`App.tsx`:** Rota `/admin/cohorts`

### Garantias de Isolamento

| Cenário | Proteção |
|---|---|
| Aluno da Turma 1 tenta ver módulo da Turma 2 | RLS em `cohort_modules` bloqueia; `useDashboardData` não retorna o módulo |
| Aluno da Turma 1 tenta acessar URL direta de módulo da Turma 2 | RLS em `modules` permite ver (pois é da mesma org), mas o módulo não aparece no dashboard e a lógica de desbloqueio pode ser aplicada |
| Aluno sem turma | Vê todos os módulos publicados da org (backward-compatible) |
| Admin vê relatórios | Pode filtrar por turma para ver progresso isolado |

### Proteção extra na rota do módulo

**`ModuleView.tsx` / `useSequentialProgress.ts`:** Adicionar verificação: se a org usa turmas e o aluno está matriculado em alguma, checar se o módulo pertence a uma das turmas do aluno. Se não pertencer, redirecionar para dashboard com mensagem "Módulo não disponível".

### Resumo de Arquivos

| Arquivo | Mudança |
|---|---|
| **Migração SQL** | Criar `cohorts`, `cohort_members`, `cohort_modules` com RLS restritivo |
| `AdminCohorts.tsx` (novo) | CRUD turmas + gestão alunos + gestão módulos |
| `AdminLayout.tsx` | Link "Turmas" no menu |
| `App.tsx` | Rota `/admin/cohorts` |
| `useDashboardData.ts` | Filtrar módulos pela(s) turma(s) do aluno |
| `ModuleView.tsx` | Bloquear acesso direto a módulos fora da turma |


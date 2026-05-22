# Desbloqueio do próximo módulo após concluir o módulo anterior

## Diagnóstico

No tenant `awo-isefa` existem 2 módulos publicados em sequência:

1. `Introdução e Ojubo Ifa` (display_order 0)
2. `Isefa` (display_order 1)

Ambos com `unlock_rule = sequential`.

A regra atual em `useSequentialProgress.isModuleUnlocked` desbloqueia o módulo seguinte **apenas** quando o anterior tem:

- `module_phase_progress.phase1_completed_at` preenchido, **ou**
- `module_completions.quiz_score >= 90`.

Verificação no banco:

- `ifatokun@ileaseifatokun.com.br` já tem `user_progress` para o único exercício publicado do módulo 1 ("Aula ao VIVO").
- Mas **não existe nenhuma linha** em `module_phase_progress` nem em `module_completions` para esse módulo.

Ou seja: o usuário concluiu todos os exercícios disponíveis, mas a Fase 1 nunca foi marcada como concluída — então o módulo 2 (`Isefa`) permanece travado.

### Por que a Fase 1 não foi marcada

`LessonView.handleExerciseComplete` chama `checkAndMarkPhaseComplete(moduleId)` depois de salvar o `user_progress`. Esse helper só marca Fase 1 quando `phase1Complete` é `true`, e ele depende de:

- Todos os exercícios `is_published` do módulo cuja `getExercisePhase(title)` retorna 1 estarem em `user_progress` do usuário.

Para o exercício "Aula ao VIVO" `getExercisePhase` retorna 1 (não bate em nenhum marcador de Fase 2), então deveria funcionar. Suspeitos de não ter rodado para o registro existente:

- O `user_progress` atual foi criado antes do hook de fases existir, ou via outro caminho (admin/import) que não passa por `LessonView`.
- Hoje, qualquer módulo cujo conteúdo foi todo concluído **antes** da introdução do tracking de fases fica permanentemente travado, porque o usuário não tem mais exercícios para "refazer" e disparar o marcador.

Além disso, a lógica atual é frágil: se o admin criar um módulo só com vídeo/quiz (sem exercícios marcados como Fase 1) ou marcar tudo como Fase 2, o aluno nunca consegue destravar o próximo módulo.

## Plano

### 1. Backfill de `module_phase_progress` (migration única)

Inserir `phase1_completed_at = now()` para todo par `(user_id, module_id)` que satisfaça:

- O módulo tem ao menos 1 exercício publicado considerado Fase 1 (título não contendo "fase 2"/"proficiência").
- O usuário tem `user_progress` para **todos** esses exercícios.
- Ainda não existe linha em `module_phase_progress` ou `phase1_completed_at` é `NULL`.

Isso desbloqueia imediatamente os alunos que já terminaram o conteúdo (caso do Ifatokun).

### 2. Tornar a lógica de desbloqueio sequencial mais robusta (sem migration)

Em `src/hooks/useSequentialProgress.ts`, no ramo `unlock_rule === 'sequential'` para módulos `proficiency`, adicionar um terceiro caminho de desbloqueio: o módulo anterior está concluído quando **todos os seus exercícios publicados estão em `user_progress` do usuário** — mesmo que `module_phase_progress` ainda não tenha sido escrito.

Para isso:

- `useDashboardData` (e telas que usam `calculateLockedModules`) já carregam `userProgress` por módulo. Vamos passar também a contagem de exercícios publicados por módulo (`publishedExerciseCount`) e o conjunto de exercícios concluídos por módulo do usuário.
- `isModuleUnlocked` recebe um `moduleCompletionMap: Map<moduleId, { publishedExercises: number; completedExercises: number }>` opcional e usa como fallback adicional.

Isso cobre módulos cujo tracking de fases nunca rodou e módulos sem exercício "Fase 1" formalmente marcado.

### 3. Autocorreção em tempo real

Em `useModulePhaseProgress.checkAndMarkPhaseComplete`, executar o cálculo também quando o `LessonView` é montado (não só ao terminar exercício). Assim, qualquer usuário que abrir uma lição de um módulo já 100% concluído terá a Fase 1 marcada automaticamente.

Implementação: chamar `checkAndMarkPhaseComplete(moduleId)` num `useEffect` em `LessonView` quando `moduleId` muda.

### 4. Verificação

- Abrir o dashboard como `ifatokun@ileaseifatokun.com.br` no tenant `awo-isefa` → `Isefa` deve aparecer desbloqueado.
- Concluir o único exercício de um módulo novo (qualquer tenant) → próximo módulo desbloqueia imediatamente e `module_phase_progress` recebe `phase1_completed_at`.
- Admin global e admins da organização continuam vendo tudo como antes.

## Arquivos afetados

- `supabase/migrations/<novo>.sql` — backfill `module_phase_progress`.
- `src/hooks/useSequentialProgress.ts` — fallback "todos exercícios feitos".
- `src/hooks/useDashboardData.ts` — incluir `moduleCompletionMap` derivado de `exercises` + `user_progress`.
- `src/pages/Dashboard.tsx` e `src/pages/ModuleView.tsx` — passar o novo mapa para `calculateLockedModules` / `hasAccess`.
- `src/pages/LessonView.tsx` — chamar `checkAndMarkPhaseComplete` no mount.

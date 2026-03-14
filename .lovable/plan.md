
Objetivo: corrigir com prioridade máxima os 2 problemas de produção reportados: (1) vazamento de tenant na navegação e (2) módulo sequencial não desbloqueando após concluir vídeo.

1) Diagnóstico confirmado (raiz do problema)
- Vazamento de tenant: há navegação hardcoded para rota global em componente crítico do dashboard:
  - `src/components/dashboard/HeroModuleSlider.tsx` usa `navigate(\`/module/${moduleId}\`)` (sem `/org/:slug`).
  - Isso tira o usuário do contexto da organização e, ao voltar para dashboard, pode cair no tenant principal.
- Módulo não desbloqueia: no tenant Akapo, o 1º módulo tem 1 exercício de vídeo com `content.videoUrl` vazio no banco.
  - Sem URL, o aluno não consegue concluir corretamente esse exercício.
  - Sem conclusão, não grava `user_progress` nem `module_phase_progress` da Fase 1, então o módulo seguinte permanece bloqueado.

2) Implementação (hotfix + hardening)
A) Corrigir isolamento de tenant em toda navegação de aluno
- `src/components/dashboard/HeroModuleSlider.tsx`
  - Adicionar `useOrgNavigate`.
  - Trocar `navigate('/module/...')` por `navigate(getOrgPath('/module/...'))`.
- `src/components/dashboard/ModuleRetentionAlert.tsx`
  - Também trocar `navigate('/module/.../retention')` por `getOrgPath(...)` (evita novo vazamento em revisões).
- Fazer varredura rápida dos fluxos de aluno com `/dashboard`, `/module`, `/review`, `/challenge` e padronizar `getOrgPath` onde faltar.

B) Garantir conclusão em módulo “somente vídeo”
- `src/components/exercises/VideoExercise.tsx`
  - Exibir ação de conclusão manual em cenários onde tracking automático não é possível (YouTube/Vimeo e também URL ausente).
  - Se `videoUrl` estiver vazio, mostrar aviso claro (“Vídeo não configurado”) + botão de conclusão (para não travar progressão do aluno).
  - Manter auto-complete em vídeo direto (>=90%) como já existe.

C) Evitar reincidência na criação/edição de exercício
- `src/components/admin/ExerciseEditor.tsx`
  - Validar exercício do tipo `video`:
    - permitir salvar rascunho vazio;
    - bloquear publicação quando `videoUrl` estiver vazio (mensagem objetiva ao admin).
- `src/pages/admin/AdminExercises.tsx`
  - Reforçar regra ao alternar publicação de vídeo sem URL (não publicar e avisar).

D) Ajuste imediato de conteúdo já em produção
- Corrigir o exercício de vídeo já criado no módulo “Começa por aqui!” (tenant Akapo), preenchendo `videoUrl` no conteúdo.
- Enquanto isso, o hotfix B já evita bloqueio de progressão mesmo sem URL.

3) Critérios de aceite (E2E obrigatório)
- Dentro de `/org/akapo-ifa/dashboard`, abrir módulo pelo card/CTA e confirmar que URL continua com `/org/akapo-ifa/...`.
- Concluir a lição do módulo 1 e validar no banco:
  - existe linha em `user_progress` para o exercício;
  - existe/atualiza linha em `module_phase_progress` com `phase1_completed_at` do módulo 1.
- Voltar ao dashboard e confirmar:
  - módulo “Fundamentos Éticos...” desbloqueado;
  - nenhum redirecionamento para tenant principal.
- Repetir “voltar” (botão da tela e navegação do fluxo) e verificar que permanece no mesmo tenant.

4) Arquivos previstos
- `src/components/dashboard/HeroModuleSlider.tsx`
- `src/components/dashboard/ModuleRetentionAlert.tsx`
- `src/components/exercises/VideoExercise.tsx`
- `src/components/admin/ExerciseEditor.tsx`
- `src/pages/admin/AdminExercises.tsx` (validação de publish)

Se aprovado, executo em ordem: (1) navegação tenant-safe, (2) conclusão de vídeo robusta, (3) validação no admin, (4) teste E2E completo no fluxo Akapo.

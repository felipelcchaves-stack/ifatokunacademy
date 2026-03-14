

## Plano: Quiz Final opcional por módulo

### Problema
Hoje o Quiz Final aparece para todos os módulos quando o progresso atinge 100%. Para módulos como "Comece por aqui" (apenas vídeo), isso não faz sentido.

### Solução
Adicionar coluna `requires_quiz` (boolean, default `true`) na tabela `modules`. Expor toggle no formulário de criação/edição de módulo no admin. Condicionar exibição do Quiz Final no `ModuleView` a esse campo.

### Mudanças

**1. Migração de banco de dados**
```sql
ALTER TABLE public.modules ADD COLUMN requires_quiz boolean NOT NULL DEFAULT true;
```

**2. `src/pages/admin/AdminModules.tsx`**
- Adicionar campo `requires_quiz` nos estados do formulário de criação e edição (switch/toggle)
- Incluir no INSERT e UPDATE do módulo
- Label: "Requer Quiz Final"

**3. `src/pages/ModuleView.tsx`**
- Incluir `requires_quiz` na interface `Module`
- Condicionar os dois blocos do Quiz Final (desbloqueado e bloqueado) a `module.requires_quiz !== false`
- Quando `requires_quiz === false` e `progress === 100`, exibir mensagem de "Módulo concluído" em vez do quiz

**4. `src/pages/ModuleQuiz.tsx`**
- Verificar `requires_quiz` do módulo; se `false`, redirecionar de volta ao módulo com toast informativo

### Escopo
| Arquivo | Mudança |
|---|---|
| Migração SQL | Adicionar coluna `requires_quiz` |
| `src/pages/admin/AdminModules.tsx` | Toggle no form de criar/editar |
| `src/pages/ModuleView.tsx` | Condicionar exibição do quiz |
| `src/pages/ModuleQuiz.tsx` | Redirect se quiz não requerido |


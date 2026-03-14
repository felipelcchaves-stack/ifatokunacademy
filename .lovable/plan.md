

## Bug: Navegação quebra isolamento de tenant

### Problema
Quando o usuário está em `/org/ifatokun/module/X/lesson/Y` e clica "Voltar", a navegação vai para `/module/X` ou `/dashboard` (rotas globais) em vez de `/org/ifatokun/module/X` ou `/org/ifatokun/dashboard`. Isso "vaza" o contexto da organização.

O hook `useOrgNavigate` já existe e é usado corretamente em `LessonCard` e `ModuleCard`, mas **não é usado** nas 3 páginas principais:

### Arquivos afetados

| Arquivo | Navegações quebradas |
|---|---|
| `src/pages/LessonView.tsx` | 7 ocorrências: `/module/${moduleId}`, `/module/${moduleId}/lesson/${nextLesson.id}` |
| `src/pages/ModuleView.tsx` | 3 ocorrências: `/dashboard`, `/module/${module.id}/quiz` |
| `src/pages/ModuleQuiz.tsx` | 3 ocorrências: `/module/${moduleId}`, `/dashboard` |

### Correção

Em cada arquivo:
1. Importar `useOrgNavigate` de `@/hooks/useOrgNavigate`
2. Chamar `const { getOrgPath } = useOrgNavigate();` no componente
3. Envolver **todas** as strings de navegação com `getOrgPath(...)`:
   - `navigate('/dashboard')` → `navigate(getOrgPath('/dashboard'))`
   - `navigate(\`/module/${moduleId}\`)` → `navigate(getOrgPath(\`/module/${moduleId}\`))`
   - `navigate(\`/module/${moduleId}/lesson/${id}\`)` → `navigate(getOrgPath(\`/module/${moduleId}/lesson/${id}\`))`
   - `navigate(\`/module/${id}/quiz\`)` → `navigate(getOrgPath(\`/module/${id}/quiz\`))`

### Escopo
- 3 arquivos modificados
- ~13 navegações corrigidas
- Nenhuma mudança no banco de dados
- O hook `useOrgNavigate` já detecta automaticamente se estamos em rota `/org/:slug` e prefixa corretamente


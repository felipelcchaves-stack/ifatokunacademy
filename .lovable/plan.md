

## Plano: Adicionar seletor de turma no dialog de criação de usuário (`AdminUsers.tsx`)

### Problema

O seletor de turma foi adicionado apenas em `AdminInvites.tsx`, mas o formulário principal de criação de usuário fica em `AdminUsers.tsx` (`/admin/users`) — que é onde você está criando os alunos. Esse formulário não tem o campo de turma.

### Correção

**`src/pages/admin/AdminUsers.tsx`:**

1. Adicionar estado para turmas (`cohorts`) e `selectedCohortId`
2. No `fetchData`, buscar turmas ativas da organização (apenas se org for educacional)
3. Adicionar campo `cohortId` ao `inviteForm`
4. Renderizar um `<Select>` de turma no dialog, entre "Senha" e "Módulos Permitidos" (visível apenas para orgs educacionais)
5. Passar `cohortId` no body da chamada ao edge function `create-user` (que já suporta esse campo)

### Mudança visual no dialog

```
Email *
Nome Completo
Senha Inicial *
Turma (opcional)          ← NOVO campo, só para orgs educacionais
Módulos Permitidos
```

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| `AdminUsers.tsx` | Buscar cohorts, adicionar select de turma no dialog, enviar cohortId ao criar |

Nenhuma mudança no backend — o edge function `create-user` já aceita `cohortId` e faz a matrícula automática.


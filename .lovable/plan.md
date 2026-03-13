

## Plano: Turmas apenas para organizações educacionais + seleção de turma no convite

### Problema atual
1. O menu "Turmas" aparece para **todas** as organizações, mas deveria aparecer apenas para orgs do tipo `educational`
2. Ao convidar um aluno, não há como escolher a turma de destino — o admin precisa ir manualmente em "Turmas" depois

### Mudanças

#### 1. Filtrar menu "Turmas" por tipo de organização
**`src/components/layout/AdminLayout.tsx`** (linha 92-94):
Alterar a condição de `cohortItems` para incluir apenas quando `orgType === 'educational'`:
```ts
const cohortItems = activeOrg && orgType === 'educational' ? [
  { icon: GraduationCap, label: 'Turmas', path: '/admin/cohorts' },
] : [];
```

#### 2. Adicionar coluna `cohort_id` na tabela `user_invites`
**Migração SQL**: Adicionar coluna opcional `cohort_id` referenciando `cohorts(id)` com `ON DELETE SET NULL`.

#### 3. Seletor de turma no formulário de convite
**`src/pages/admin/AdminInvites.tsx`**:
- Buscar turmas ativas da org (apenas se `organization_type === 'educational'`)
- Adicionar um `<Select>` opcional "Turma" no dialog de criação de convite
- Salvar `cohort_id` no registro do convite

#### 4. Matrícula automática ao ativar convite
**`supabase/functions/create-user/index.ts`**:
- Receber `cohortId` no body
- Após criar o usuário e `organization_member`, inserir em `cohort_members` se `cohortId` estiver presente

#### 5. AdminCohorts — bloquear para orgs não-educacionais
**`src/pages/admin/AdminCohorts.tsx`**: Adicionar verificação de `organization_type` e mostrar mensagem informativa se não for educacional.

### Resumo de arquivos

| Arquivo | Mudança |
|---|---|
| `AdminLayout.tsx` | Condicionar "Turmas" a `orgType === 'educational'` |
| Migração SQL | Adicionar `cohort_id` em `user_invites` |
| `AdminInvites.tsx` | Seletor de turma no dialog de convite (só para orgs educacionais) |
| `create-user/index.ts` | Inserir em `cohort_members` ao ativar convite com turma |
| `AdminCohorts.tsx` | Guard para org não-educacional |


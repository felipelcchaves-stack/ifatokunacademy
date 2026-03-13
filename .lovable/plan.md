

## Plano: Corrigir usuários e convites não aparecendo no admin

### Problema raiz

1. **Usuários criados não aparecem na lista**: O edge function `create-user` atualiza `profiles.organization_id` mas **não insere na tabela `organization_members`**. A página `AdminUsers` busca usuários via `organization_members` — logo, o usuário criado fica invisível.

2. **Convites não aparecem na página de convites**: Quando o admin cria um usuário diretamente em `AdminUsers`, nenhum registro é inserido na tabela `user_invites`. A página `AdminInvites` lista apenas registros de `user_invites`.

### Correções

**1. Edge Function `create-user/index.ts`**
- Após criar o usuário e atualizar o perfil, **inserir registro em `organization_members`** com `user_id`, `organization_id`, `role: 'member'`, `is_primary: true`
- **Inserir registro em `user_invites`** com status `accepted`, `accepted_at: now()`, para que o convite apareça como "aceito" na página de convites

**2. Nenhuma mudança no front-end** — as queries já estão corretas, o problema é que os dados não existem nas tabelas.

### Detalhe técnico da mudança no edge function

```text
Após createUser e update profile:
  1. INSERT organization_members (user_id, organization_id, role='member', is_primary=true)
  2. INSERT user_invites (email, full_name, organization_id, cohort_id, 
     invited_by_id, invited_by_name, status='accepted', accepted_at=now())
```

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/create-user/index.ts` | Adicionar insert em `organization_members` e `user_invites` |


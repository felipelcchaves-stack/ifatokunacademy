

## Plano: Corrigir erro de RLS na criação de turmas

### Diagnóstico

O usuário está logado como `ifatokun@ileaseifatokun.com.br`, que é admin global (`is_admin` retorna `true`). A política RLS `FOR ALL` existe com `WITH CHECK (is_organization_admin(...) OR is_admin(...))`.

O problema provável: a política `FOR ALL` pode ter comportamento inconsistente no Supabase para operações de INSERT. A solução padrão é criar políticas **explícitas por operação** (SELECT, INSERT, UPDATE, DELETE) em vez de usar `FOR ALL`.

### Correção

**Migração SQL:**
1. Remover a política `FOR ALL` ("Org admins can manage cohorts")
2. Criar 4 políticas explícitas:
   - **SELECT**: org admins e global admins
   - **INSERT**: org admins e global admins (WITH CHECK)
   - **UPDATE**: org admins e global admins
   - **DELETE**: org admins e global admins

```sql
DROP POLICY "Org admins can manage cohorts" ON public.cohorts;

CREATE POLICY "Admins can select cohorts" ON public.cohorts
  FOR SELECT TO authenticated
  USING (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));

CREATE POLICY "Admins can insert cohorts" ON public.cohorts
  FOR INSERT TO authenticated
  WITH CHECK (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));

CREATE POLICY "Admins can update cohorts" ON public.cohorts
  FOR UPDATE TO authenticated
  USING (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));

CREATE POLICY "Admins can delete cohorts" ON public.cohorts
  FOR DELETE TO authenticated
  USING (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));
```

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| Nova migração SQL | Substituir política `FOR ALL` por 4 políticas explícitas |

Nenhuma mudança no código front-end é necessária.




## Correcao: Menu admin nao carrega a org correta (Ijo Ifa Dola)

### Problema raiz

Dois bugs combinados:

1. **Link "Painel Admin" no Header ignora a org atual**: Nas linhas 206 e 299 do `Header.tsx`, o link sempre navega para `/admin` fixo. Quando o usuario esta em `/org/ijoifadola/dashboard`, deveria navegar para `/org/ijoifadola/admin` para acionar a sincronizacao.

2. **AdminOrgRedirect tem race condition**: O componente faz uma query async ao banco para buscar o ID da org pelo slug, mas retorna `<Navigate to="/admin">` imediatamente, antes da query terminar. O `/admin` carrega com o ID antigo no localStorage.

### Correcao

#### 1. Header.tsx - Link "Painel Admin" deve usar o slug da org atual

Nas linhas 206 e 299, trocar `navigate('/admin')` por `navigate(getOrgPath('/admin'))`. O hook `useOrgNavigate` ja detecta se o usuario esta em `/org/:slug` e prefixa automaticamente.

Isso fara com que:
- Em `/org/ijoifadola/dashboard` -> navega para `/org/ijoifadola/admin`
- Em `/dashboard` (sem org) -> navega para `/admin`

#### 2. AdminOrgRedirect - Esperar a sincronizacao antes de redirecionar

Trocar o redirect imediato por um redirect condicional que so acontece apos a query ao banco terminar e o localStorage ser atualizado. Usar um state `ready` que comeca como `false` e vira `true` apos a query.

### Secao tecnica

**Arquivo: `src/components/layout/Header.tsx`**

Linha 206:
```
// Antes:
navigate('/admin')
// Depois:
navigate(getOrgPath('/admin'))
```

Linha 299:
```
// Antes:
navigate('/admin')
// Depois:
navigate(getOrgPath('/admin'))
```

**Arquivo: `src/App.tsx`** (AdminOrgRedirect, linhas 64-84)

```typescript
const AdminOrgRedirect = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (orgSlug) {
      supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single()
        .then(({ data }) => {
          if (data?.id) {
            localStorage.setItem('admin_active_org', data.id);
          }
          setReady(true);
        })
        .catch(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [orgSlug]);

  if (!ready) return null; // ou um spinner
  return <Navigate to="/admin" replace />;
};
```

Adicionar import de `useState` na linha 1 do App.tsx (ja tem `useEffect`, so adicionar `useState`).

### Resultado esperado

1. Usuario em `/org/ijoifadola/dashboard` clica em "Painel Admin" -> navega para `/org/ijoifadola/admin`
2. `AdminOrgRedirect` busca o ID de "ijoifadola", salva no localStorage, e so entao redireciona para `/admin`
3. `/admin` carrega com `useAdminOrganization` lendo o ID correto do localStorage
4. `AdminLayout` sincroniza o `OrganizationContext` via `setOrganizationById`
5. Sidebar mostra "Ijo Ifa Dola" com branding correto

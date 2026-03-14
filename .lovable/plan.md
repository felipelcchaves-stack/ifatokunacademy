

## Plano: Evitar Refresh ao Trocar de Janela/Workspace no Safari

### Diagnóstico

Identifiquei duas causas prováveis:

1. **React Query com `refetchOnWindowFocus: true` (padrão)** — O `QueryClient` está criado sem configuração, então toda vez que você volta à aba, TODAS as queries disparam refetch simultaneamente. No Safari (macOS), trocar de workspace conta como perda/ganho de foco, gerando dezenas de requisições simultâneas que podem causar re-render pesado ou até "flash" visual que parece reload.

2. **Service Worker agressivo** — O `sw.js` usa `skipWaiting()` + `clients.claim()` na ativação. Quando o SW se atualiza enquanto você está em outro workspace, ele toma controle imediato e pode forçar o Safari a recarregar a página. Além disso, a estratégia "Network First" para navegação HTML pode conflitar com o cache do Safari.

### Solução

**Arquivo 1: `src/App.tsx`** — Configurar o `QueryClient` para desabilitar refetch automático no foco:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});
```

**Arquivo 2: `public/sw.js`** — Tornar o Service Worker menos agressivo:

- Remover `self.skipWaiting()` do evento `install` (evita que novo SW force reload)
- Remover `self.clients.claim()` do evento `activate`
- Para navegação HTML, usar estratégia **Cache First com fallback para network** em vez de Network First (evita que o SW tente buscar uma nova versão da página toda vez)
- Alternativa mais simples: **não interceptar requisições de navegação HTML** — deixar o browser lidar normalmente

### Resumo

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | `refetchOnWindowFocus: false` + `staleTime: 5min` no QueryClient |
| `public/sw.js` | Remover `skipWaiting`/`clients.claim`, não interceptar navegação HTML |

Essas duas mudanças eliminam os dois gatilhos que causam o reload no Safari ao trocar de workspace.


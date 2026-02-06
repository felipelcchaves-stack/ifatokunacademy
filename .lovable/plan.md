

## Plano: Cache Offline PWA para Revisoes Espacadas

### Resumo

Transformar a plataforma em um **Progressive Web App (PWA)** com cache offline focado nas revisoes espacadas. Isso traz dois beneficios imediatos:

1. **Velocidade**: Assets estaticos (JS, CSS, fontes, imagens) sao servidos do cache local, eliminando downloads repetidos. A plataforma carrega quase instantaneamente apos a primeira visita.
2. **Offline**: O aluno pode fazer revisoes espacadas sem internet. Ao reconectar, os resultados sincronizam automaticamente.

### Compatibilidade

| Navegador | Service Worker | IndexedDB | PWA Install |
|-----------|---------------|-----------|-------------|
| Chrome (desktop/mobile) | Sim | Sim | Sim |
| Firefox (desktop/mobile) | Sim | Sim | Sim |
| Edge (desktop) | Sim | Sim | Sim |
| Safari 11.1+ (Mac/iPhone/iPad) | Sim | Sim | Sim (Add to Home) |
| Samsung Internet | Sim | Sim | Sim |

Funciona em **notebook, tablet e celular** sem distincao -- a plataforma ja e responsiva com Tailwind.

### Arquivos a criar

| Arquivo | Descricao |
|---------|-----------|
| `public/manifest.json` | Metadata PWA (nome, icones, cores, tema) |
| `public/sw.js` | Service Worker com estrategias de cache |
| `src/lib/offlineDb.ts` | Camada IndexedDB para armazenar itens e fila de reviews offline |
| `src/hooks/useOfflineSync.ts` | Hook para detectar online/offline, sincronizar pendencias |
| `src/components/OfflineIndicator.tsx` | Banner visual de status offline/sincronizando |

### Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `index.html` | Adicionar link para manifest e meta theme-color |
| `src/main.tsx` | Registrar Service Worker |
| `src/hooks/useSpacedRepetition.ts` | Integrar cache offline (fallback IndexedDB quando offline, salvar cache quando online) |
| `src/pages/SpacedReview.tsx` | Exibir `OfflineIndicator` |

---

### Detalhes tecnicos

#### 1. PWA Manifest (`public/manifest.json`)

Definir nome da plataforma, cores (verde/dourado da identidade visual), orientacao, e icones. Isso permite que o aluno "instale" a plataforma no celular como um app nativo.

Icones: usar o favicon existente como placeholder inicial (192x192 e 512x512 podem ser adicionados depois).

#### 2. Service Worker (`public/sw.js`)

Estrategias de cache:
- **Cache First** para assets estaticos (JS bundles, CSS, fontes Google, imagens)
- **Network First** para chamadas de API (com fallback para cache quando offline)
- **Stale While Revalidate** para fontes externas

No evento `install`, pre-cachear a pagina principal e assets criticos.
No evento `fetch`, interceptar requests e aplicar a estrategia adequada.

#### 3. IndexedDB (`src/lib/offlineDb.ts`)

Database: `offe-orunmila-offline`, versao 1

Object Stores:
- `spaced_items`: armazena copia dos itens de revisao do usuario (key: `id`)
- `pending_reviews`: fila de reviews feitos offline (key: autoIncrement, campos: `itemId`, `wasCorrect`, `timestamp`, `calculatedUpdate`)

Funcoes exportadas:
- `openDb()` - abrir/criar database
- `cacheSpacedItems(items)` - salvar itens no store
- `getCachedSpacedItems()` - ler todos os itens cacheados
- `addPendingReview(review)` - enfileirar review offline
- `getPendingReviews()` - ler fila de pendencias
- `clearPendingReviews()` - limpar apos sincronizacao
- `updateCachedItem(id, updates)` - atualizar item local apos review offline

#### 4. Hook `useOfflineSync`

Responsabilidades:
- Monitorar `navigator.onLine` e eventos `online`/`offline`
- Expor estado `isOnline` e `isSyncing`
- Ao detectar volta de conexao (`online` event), executar `syncPendingReviews()`:
  1. Ler fila de `pending_reviews` do IndexedDB
  2. Para cada review, chamar `supabase.from('spaced_repetition_items').update(...)` com os dados calculados
  3. Em caso de sucesso, limpar a fila
  4. Disparar toast "X revisoes sincronizadas"
- Expor `pendingCount` para mostrar quantas revisoes estao aguardando sync

#### 5. Modificacao do `useSpacedRepetition`

No `fetchItems`:
- Se online: buscar do Supabase normalmente + chamar `cacheSpacedItems(items)` para salvar copia local
- Se offline: chamar `getCachedSpacedItems()` e usar os dados locais

No `recordReview`:
- Se online: enviar para Supabase normalmente + atualizar cache local
- Se offline: calcular novo intervalo com `calculateNextReview()` (ja existe no front), atualizar item no IndexedDB, e adicionar na fila `pending_reviews`

#### 6. `OfflineIndicator` component

Banner fixo no topo da pagina de revisao:
- Quando offline: fundo amarelo, "Voce esta offline. Revisoes serao salvas localmente."
- Quando sincronizando: fundo azul, "Sincronizando X revisoes..."
- Quando sincronizado: toast verde, "Revisoes sincronizadas com sucesso!"

#### 7. Registro do Service Worker (`src/main.tsx`)

Adicionar apos o `render()`:
```text
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
```

Compativel com todos os navegadores -- em navegadores sem suporte, simplesmente nao registra (graceful degradation).

---

### Fluxo completo

```text
Aluno abre revisao (online)
  -> Busca itens do backend
  -> Salva copia no IndexedDB (cache)
  -> Faz revisoes normalmente

Aluno perde conexao
  -> Banner "Offline" aparece
  -> Itens ja carregados continuam disponiveis
  -> Reviews sao calculados localmente (SM-2)
  -> Reviews salvos no IndexedDB (fila pendente)

Conexao volta
  -> Event "online" dispara sync
  -> Fila de reviews enviada ao backend
  -> Cache atualizado
  -> Toast "Sincronizado!"
```

### Limitacoes (transparencia)

- Apenas revisoes espacadas funcionam offline (nao toda a plataforma)
- O aluno precisa ter aberto a revisao pelo menos uma vez online para cachear os itens
- Novas licoes e exercicios nao ficam disponiveis offline
- Gravacao de audio nao funciona offline
- Se o aluno ficar offline por muitos dias, os intervalos calculados localmente podem divergir levemente do servidor (resolvido no sync)


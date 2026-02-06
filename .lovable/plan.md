

## Diagnostico: Por que o isolamento de organizacao nao funciona

### Causa raiz

O banco de dados mostra que:
- **Ifatokun Academy** (slug: `ifatokun`): 52 modulos
- **Ijo Ifatokun** (slug: `ijoifatokun`): 0 modulos
- **Ijo Ifadola** (slug: `ijoifadola`): 0 modulos

Entao quando voce acessa `/org/ijoifatokun/dashboard`, o filtro de organizacao funciona -- mas nao ha modulos para mostrar. Se voce ve 52 modulos, e porque esta caindo em uma rota sem filtro.

### Os 3 problemas que causam o vazamento

**Problema 1: OrganizationContext ignora a URL `/org/:slug`**

O `OrganizationContext` detecta o tenant pelo hostname (subdominio). No ambiente de preview (`id-preview--*.lovable.app`), ele sempre retorna `ifatokun` como padrao (linha 79 do `OrganizationContext.tsx`). Mesmo acessando `/org/ijoifatokun/dashboard`, o contexto global da organizacao continua sendo `ifatokun`.

**Problema 2: Links do Header sao hardcoded sem `/org/:slug`**

O `Header.tsx` usa links fixos como `/dashboard`, `/review`, `/challenge` (linhas 27-33). Quando o aluno esta em `/org/ijoifatokun/dashboard` e clica em qualquer link de navegacao, ele e levado para rotas "soltas" (ex: `/review`) que nao tem filtro de organizacao.

**Problema 3: ModuleCard e LessonCard navegam sem prefixo de org**

O `ModuleCard` navega para `/module/${module.id}` (sem `/org/:slug/module/...`). Ao clicar em um modulo, o aluno sai do contexto da organizacao.

---

### Plano de correcao (4 etapas)

#### Etapa 1 — OrganizationContext deve respeitar `/org/:slug` da URL

Modificar `OrganizationContext.tsx` para, alem de detectar pelo hostname, verificar se a URL atual contem `/org/:slug` e usar esse slug como prioridade.

Logica:
```text
1. Verificar URL: se pathname comeca com /org/:slug, usar esse slug
2. Senao, verificar hostname (subdominio/dominio customizado)
3. Senao, fallback para profile.organization_id ou 'ifatokun'
```

**Arquivo:** `src/contexts/OrganizationContext.tsx`

#### Etapa 2 — Header deve usar links com prefixo de org quando em contexto `/org/:slug`

Criar um hook utilitario ou usar `useOrgRoute` (que ja existe) para gerar paths corretos. Quando o aluno esta em `/org/ijoifatokun/dashboard`, os links do menu devem ser:
- `/org/ijoifatokun/dashboard` (em vez de `/dashboard`)
- `/org/ijoifatokun/review` (em vez de `/review`)
- etc.

**Arquivo:** `src/components/layout/Header.tsx`

#### Etapa 3 — ModuleCard e LessonCard devem navegar com prefixo de org

Modificar `ModuleCard.tsx` e `LessonCard.tsx` para detectar se estamos em uma rota de org e usar o prefixo correto na navegacao.

**Arquivos:** `src/components/modules/ModuleCard.tsx`, `src/components/modules/LessonCard.tsx`

#### Etapa 4 — Adicionar rotas org que faltam no App.tsx

Atualmente so existem rotas `/org/:orgSlug` para dashboard, module, lesson e quiz. Faltam:
- `/org/:orgSlug/review` (revisao espacada)
- `/org/:orgSlug/challenge` (modo desafio)
- `/org/:orgSlug/achievements` (conquistas)
- `/org/:orgSlug/recording-studio` (gravacao)
- `/org/:orgSlug/test-memorization` (memorizacao)
- `/org/:orgSlug/memorization-guide` (guia)
- `/org/:orgSlug/review/stats` (estatisticas)

**Arquivo:** `src/App.tsx`

---

### Secao tecnica — Resumo das mudancas

| Arquivo | Mudanca |
|---------|---------|
| `src/contexts/OrganizationContext.tsx` | Adicionar deteccao de org via `window.location.pathname` (`/org/:slug`) como prioridade sobre hostname |
| `src/components/layout/Header.tsx` | Usar `useOrgRoute()` ou deteccao de pathname para gerar links com prefixo `/org/:slug` |
| `src/components/modules/ModuleCard.tsx` | Usar `useOrgRoute()` ou `useParams` para navegar com prefixo correto |
| `src/components/modules/LessonCard.tsx` | Mesmo ajuste do ModuleCard |
| `src/App.tsx` | Adicionar rotas `/org/:orgSlug/*` faltantes (review, challenge, achievements, etc.) |
| `src/components/dashboard/HeroStudyTrack.tsx` | Verificar se links internos tambem precisam de prefixo (provavel) |

### Resultado esperado

Apos a correcao:
1. Acessando `/org/ijoifatokun/dashboard`, o contexto de organizacao sera "Ijo Ifatokun"
2. Todos os links de navegacao manterao o prefixo `/org/ijoifatokun/...`
3. Modulos, licoes e exercicios serao filtrados pela organizacao correta
4. Nenhum conteudo de outra organizacao sera visivel


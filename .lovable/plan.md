
## Correcao: Navegacao do Dashboard quebra isolamento de organizacao

### Problema

O `Dashboard.tsx` tem **5 chamadas `navigate()` com paths fixos** que ignoram o prefixo `/org/:slug`. Quando o usuario esta em `/org/ifatokun/dashboard` e clica em qualquer botao (Revisao, Desafio, Memorizacao, Gravacao), ele e levado para rotas sem prefixo de org (ex: `/review` em vez de `/org/ifatokun/review`), perdendo o contexto da organizacao.

Linhas afetadas:
- Linha 241: `navigate('/review')`
- Linha 269: `navigate('/challenge')`
- Linha 300: `navigate('/memorization-guide')`
- Linha 308: `navigate('/test-memorization')`
- Linha 337: `navigate('/recording-studio')`

Nota sobre o admin: As paginas admin (AdminModules, AdminLessons, AdminInvites, etc.) ja filtram corretamente por `activeOrg.id` usando o hook `useAdminOrganization`. O switcher de organizacoes tambem ja funciona corretamente apos a correcao anterior. O problema e exclusivamente na area do aluno (Dashboard).

### Correcao

**Arquivo: `src/pages/Dashboard.tsx`**

1. Importar `useOrgNavigate` (hook ja existente)
2. Substituir as 5 chamadas `navigate()` hardcoded por `navigate(getOrgPath('/path'))`

Mudancas concretas:

| Linha | Antes | Depois |
|-------|-------|--------|
| 241 | `navigate('/review')` | `navigate(getOrgPath('/review'))` |
| 269 | `navigate('/challenge')` | `navigate(getOrgPath('/challenge'))` |
| 300 | `navigate('/memorization-guide')` | `navigate(getOrgPath('/memorization-guide'))` |
| 308 | `navigate('/test-memorization')` | `navigate(getOrgPath('/test-memorization'))` |
| 337 | `navigate('/recording-studio')` | `navigate(getOrgPath('/recording-studio'))` |

### Secao tecnica

Apenas 1 arquivo modificado: `src/pages/Dashboard.tsx`

- Adicionar import: `import { useOrgNavigate } from '@/hooks/useOrgNavigate';`
- Adicionar no corpo do componente: `const { getOrgPath } = useOrgNavigate();`
- Substituir 5 chamadas `navigate()` para usar `getOrgPath()`

Nenhuma mudanca de banco de dados. Nenhuma nova rota necessaria (rotas `/org/:orgSlug/*` ja foram adicionadas no App.tsx anteriormente).

### Resultado esperado

Em `/org/ifatokun/dashboard`:
- "Revisar Agora" leva para `/org/ifatokun/review`
- "Iniciar Desafio" leva para `/org/ifatokun/challenge`
- "Guia" leva para `/org/ifatokun/memorization-guide`
- "Testar" leva para `/org/ifatokun/test-memorization`
- "Abrir Estudio" leva para `/org/ifatokun/recording-studio`

Em `/dashboard` (sem org): comportamento inalterado, links continuam como `/review`, `/challenge`, etc.

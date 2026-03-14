

## Plano: Exercícios em rascunho mostram "Será liberado em breve"

### Problema atual
A query de exercícios usa `.eq('is_published', true)`, então exercícios em rascunho simplesmente não aparecem. Quando uma lição tem exercícios apenas em rascunho, ela aparece vazia.

### Solução
Buscar **todos** os exercícios (publicados e rascunho), mas renderizar os não-publicados como placeholders "em breve" em vez de exercícios interativos.

### Mudanças

**1. `src/pages/LessonView.tsx`**
- Remover o filtro `.eq('is_published', true)` da query de exercícios
- Na renderização do exercício atual, verificar `exercise.is_published`:
  - Se `true`: renderiza normalmente
  - Se `false`: renderiza um card placeholder com ícone e mensagem "Este exercício será liberado em breve"
- Exercícios não-publicados não contam para progresso nem podem ser "completados"
- Botão "Próximo" pula automaticamente exercícios não-publicados

**2. `src/components/modules/LessonCard.tsx`**
- Mostrar contagem separada: "X exercícios disponíveis · Y em breve" quando houver exercícios não-publicados

**3. `src/hooks/useModuleProgress.ts`**
- Manter a query de exercícios publicados para cálculo de progresso (sem mudança — já usa `is_published = true` implicitamente via `user_progress`)

### Comportamento esperado
- Usuário abre lição → vê exercícios publicados normalmente
- Exercícios em rascunho aparecem como cards cinza com "Exercício será liberado em breve"
- O progresso da lição é calculado apenas sobre exercícios publicados
- Lição sem nenhum exercício publicado mostra mensagem de "conteúdo em preparação"

### Arquivos afetados
| Arquivo | Mudança |
|---|---|
| `src/pages/LessonView.tsx` | Buscar todos exercícios, renderizar placeholder para rascunhos |
| `src/components/modules/LessonCard.tsx` | Exibir contagem de exercícios "em breve" |


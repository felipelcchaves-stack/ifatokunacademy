

## Plano: Seletor de tipos de exercício no gerador pedagógico

### Problema
Hoje o gerador sempre cria os 7 exercícios fixos. O usuário quer poder escolher quais tipos gerar — por exemplo, para módulos de vídeo, pular memorização/flashcard/ordenação.

### Solução
Adicionar checkboxes para cada um dos 7 exercícios na UI do `PedagogicalExerciseGenerator.tsx`, todos marcados por padrão. O usuário desmarca os que não quer. A geração filtra apenas os selecionados.

### Mudanças

**Arquivo: `src/components/admin/PedagogicalExerciseGenerator.tsx`**

1. Adicionar estado `selectedExercises` — um objeto com 7 chaves booleanas (uma por exercício), todas `true` por padrão:
```ts
const [selectedExercises, setSelectedExercises] = useState({
  readingContexto: true,
  memorizationContexto: true,
  tapCompleteContexto: true,
  flashcardContexto: true,
  readingVerso: true,
  memorizationVerso: true,
  dragDropVerso: true,
});
```

2. Na seção "Estrutura que será gerada", trocar os itens estáticos por checkboxes interativos — cada um ligado ao respectivo campo do estado.

3. Na função `generateExercises()`, condicionar cada `exercises.push(...)` ao respectivo `selectedExercises.xxx === true`.

4. Atualizar a validação: exigir pelo menos 1 exercício selecionado. Tornar o campo "Verso" opcional quando nenhum exercício da Fase 2 estiver selecionado (e vice-versa para Contexto).

5. Atualizar o texto do botão para mostrar a contagem dinâmica: `Gerar ${count} Exercício(s)`.

### Escopo
| Arquivo | Mudança |
|---|---|
| `src/components/admin/PedagogicalExerciseGenerator.tsx` | Checkboxes de seleção, geração condicional, validação atualizada |

Nenhuma mudança no banco de dados.


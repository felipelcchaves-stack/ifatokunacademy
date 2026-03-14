

## Plano: Corrigir palavras não aparecendo no TapComplete

### Problema

O exercício salvo no banco tem o campo `texts` (array):
```json
{ "texts": ["Seja bem-vindo ao Iyara Ikeeko..."] }
```

Mas o `LessonView.tsx` passa apenas `content.text` (string singular) para o componente:
```tsx
<TapComplete text={content.text || ''} ... />
```

Como `content.text` não existe, passa string vazia → nenhuma palavra aparece.

### Correção

**Arquivo: `src/pages/LessonView.tsx` (linha ~470-477)**

Passar tanto `text` quanto `texts` para o componente TapComplete, que já suporta ambos:

```tsx
<TapComplete
  text={content.text || ''}
  texts={content.texts}
  onComplete={(correct) => correct && handleExerciseComplete()}
  onPlayAudio={() => handlePlayTapCompleteAudio(
    content.text || (content.texts?.[0]) || '', 
    content.audioUrl
  )}
  audioLoading={tapCompleteAudioLoading}
  preferChunkMode={content.preferChunkMode}
  chunkSize={content.chunkSize}
/>
```

### Escopo
| Arquivo | Mudança |
|---|---|
| `src/pages/LessonView.tsx` | Passar `texts` prop e ajustar fallback do áudio |

Nenhuma mudança no banco de dados ou no componente TapComplete — ele já suporta a prop `texts`.


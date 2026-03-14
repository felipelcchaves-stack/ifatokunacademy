

## Correção: Botão "Continuar Estudando" deve pular módulos concluídos

### Problema
A lógica em `HeroStudyTrack.tsx` (linha 51) procura o primeiro módulo com `progress > 0 && progress < 100`. Se o módulo 1 tem `progress === 100`, ele é ignorado — mas o fallback (linha 56) pega o "primeiro desbloqueado", que pode ser o próprio módulo 1 já concluído.

### Correção
Alterar o fallback para excluir módulos com `progress === 100`:

```
// Atual (linha 56):
const firstUnlockedIndex = modules.findIndex(m => !lockedModules.has(m.id));

// Corrigido:
const firstUnlockedIndex = modules.findIndex(m => !lockedModules.has(m.id) && m.progress < 100);
```

Se todos os módulos estiverem concluídos, manter o último como ativo (ou mostrar mensagem de parabéns).

### Arquivo
- `src/components/dashboard/HeroStudyTrack.tsx` — ajustar lógica do `activeModuleIndex` (linhas 50-58)

### Escopo
- 1 arquivo, ~5 linhas alteradas


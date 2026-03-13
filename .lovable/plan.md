

## Plano: Corrigir Cards de Módulos no Slider

### Problema 1: Descrição substituída pelo texto de desbloqueio

No `HeroModuleSlider.tsx` (linha 204-208), quando o módulo está bloqueado, a descrição é **substituída** pelo texto "Complete a Fase 1 do módulo anterior para desbloquear". O correto é sempre mostrar a descrição real do módulo, e mover o aviso de desbloqueio para outro lugar (ex: badge pequeno acima do botão).

**Arquivo: `src/components/dashboard/HeroModuleSlider.tsx`**

- Linha 204-208: Sempre mostrar `module.description`, independente de estar bloqueado
- Adicionar um texto pequeno de aviso acima do botão "Bloqueado" com o requisito de desbloqueio (ex: `text-xs text-amber-600`)

Mesma correção no `ModuleCard.tsx` (variantes hero e default, linhas ~242 e ~410) que têm a mesma lógica de substituir descrição.

### Problema 2: Título com font-serif sobrepondo o cadeado

O título usa `font-serif text-2xl font-bold` posicionado no bottom da imagem (`absolute bottom-0`). Nos módulos bloqueados, o overlay escuro + cadeado central + título grande em serif criam confusão visual.

**Arquivo: `src/components/dashboard/HeroModuleSlider.tsx`**

- Linha 193: Trocar `font-serif text-2xl font-bold` por `font-sans text-lg font-semibold` — mais limpo e legível
- Adicionar `bg-black/40 backdrop-blur-sm rounded-t-lg px-3 py-2` ao container do título para criar separação visual do fundo
- Nos módulos bloqueados, mover o título para **fora** da imagem (dentro do bloco de conteúdo) para não competir com o cadeado

Mesma correção nas variantes hero e default do `ModuleCard.tsx`.

### Resumo

| Arquivo | Mudança |
|---|---|
| `HeroModuleSlider.tsx` | Sempre mostrar descrição real; aviso de desbloqueio como badge separado; título com font-sans menor e melhor contraste |
| `ModuleCard.tsx` (hero + default) | Mesmas correções de descrição e tipografia do título |




## Plano: Informações contextuais em módulos/lições bloqueados

### Problema atual
Quando um módulo está bloqueado, o aluno vê apenas um cadeado sem contexto. Não sabe se precisa completar o módulo anterior, se há uma data de liberação, ou se o admin ainda não liberou.

### O que já existe
O hook `useSequentialProgress` já calcula `unlockRequirement` com mensagens como:
- `"Disponível a partir de 15/03/2026"` (date_based)
- `"Complete a Fase 1 do módulo anterior"` (sequential)
- `"Este módulo ainda não foi liberado"` (manual)

O `ModuleCard` já exibe `unlockRequirement` como texto pequeno, mas o visual é fraco e não há countdown.

### Solução

**1. Componente `UnlockInfo`** — Novo componente reutilizável que renderiza info contextual por tipo de bloqueio:

- **date_based**: Countdown em tempo real ("Libera em 2d 14h") com ícone de calendário
- **sequential**: Barra de progresso do módulo anterior + texto "Complete o módulo X"  
- **manual**: Texto "Aguardando liberação pelo professor"
- **always_unlocked**: Nunca aparece

**2. Atualizar `ModuleCard`** (todas as variantes):
- Substituir o texto simples `unlockRequirement` pelo novo `UnlockInfo`
- Na overlay do cadeado, adicionar a info contextual abaixo do ícone

**3. Atualizar `LessonCard`**:
- Passar `unlockReason` como prop (novo)
- Quando bloqueado por sequência, mostrar "Complete a lição anterior" ao lado do cadeado
- Quando o módulo é date_based, mostrar countdown

**4. Passar dados necessários**:
- `ModuleView` já tem `unlock_rule` e `unlock_date` do módulo — passar para `LessonCard`
- `Dashboard` já passa `unlockRequirement` — enriquecer com `unlockRule` e `unlockDate`

### Layout proposto

```text
┌─────────────────────────────────────┐
│  [Banner com overlay escuro]        │
│         🔒                          │
│   "Libera em 2d 14h 32min"         │  ← date_based
│   ━━━━━━━━━━━━━━ (barra countdown) │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [Banner com overlay escuro]        │
│         🔒                          │
│   "Complete a Fase 1 do módulo      │  ← sequential
│    anterior para desbloquear"       │
│   ━━━━━━━━━━ 60% ━━━━━━━━━━        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [Banner com overlay escuro]        │
│         🔒                          │
│   "Aguardando liberação"            │  ← manual
└─────────────────────────────────────┘
```

Para LessonCard (dentro do módulo):
```text
┌──────────────────────────────────────────┐
│  🔒  Lição 2 - Fundamentos              │
│      Complete a lição anterior (75%)     │
│      ━━━━━━━━━━ 75% ━━━━━━━             │
└──────────────────────────────────────────┘
```

### Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/modules/UnlockInfo.tsx` | Novo componente com countdown e info contextual |
| `src/components/modules/ModuleCard.tsx` | Usar `UnlockInfo` nas 3 variantes; receber `unlockRule` e `unlockDate` |
| `src/components/modules/LessonCard.tsx` | Receber `unlockReason` opcional; exibir contexto quando bloqueado |
| `src/pages/ModuleView.tsx` | Passar info de bloqueio para `LessonCard` |
| `src/components/dashboard/HeroStudyTrack.tsx` | Passar `unlockRule`/`unlockDate` para `ModuleCard` |

### Detalhes técnicos
- Countdown usa `useEffect` com `setInterval` de 1 minuto para atualizar
- Quando faltam < 24h, atualiza a cada segundo
- Quando o countdown chega a zero, dispara refresh da página


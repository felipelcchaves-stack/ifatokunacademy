

## Plano: Reordenar Módulos + Regras Flexíveis de Desbloqueio

### Melhoria 1: Reordenar Módulos (Drag & Drop)

A página AdminLessons já usa `@dnd-kit` para reordenação. Vamos replicar o mesmo padrão em AdminModules.

**Arquivo: `src/pages/admin/AdminModules.tsx`**

1. Importar `DndContext`, `SortableContext`, `useSortable`, `arrayMove` do `@dnd-kit` (já instalado)
2. Trocar o grid de módulos por um layout sortable (lista vertical ou grid com sortable)
3. No `onDragEnd`, reordenar o array local e fazer `UPDATE` no `display_order` de cada módulo reordenado no banco
4. Extrair cada card de módulo para um componente `SortableModuleCard` com handle de arrasto (o `GripVertical` já existe no card mas é só visual)

---

### Melhoria 2: Regras Flexíveis de Desbloqueio

**Migração SQL** — Adicionar 2 colunas à tabela `modules`:

```sql
ALTER TABLE modules ADD COLUMN unlock_rule text NOT NULL DEFAULT 'sequential';
ALTER TABLE modules ADD COLUMN unlock_date timestamptz NULL;
```

Valores de `unlock_rule`:
- `sequential` — comportamento atual (desbloqueia quando o anterior é completado)
- `date_based` — desbloqueia automaticamente a partir de uma data/hora
- `manual` — sempre bloqueado até admin liberar (via `is_published` ou flag dedicada)
- `always_unlocked` — sempre desbloqueado, sem pré-requisito

**Arquivo: `src/pages/admin/AdminModules.tsx`** (diálogos de criar/editar)

- Adicionar campo "Regra de Desbloqueio" com Select: Sequencial, Por Data, Manual, Sempre Liberado
- Quando "Por Data" for selecionado, mostrar input de data/hora
- Salvar `unlock_rule` e `unlock_date` no create/update

**Arquivo: `src/hooks/useSequentialProgress.ts`**

- Na função `isModuleUnlocked`, antes de aplicar a lógica sequencial, verificar o `unlock_rule` do módulo:
  - `always_unlocked` → retorna `true`
  - `date_based` → retorna `true` se `now() >= unlock_date`
  - `manual` → retorna `false` (fica bloqueado)
  - `sequential` → lógica atual (Fase 1 do anterior)
- Na função `getUnlockRequirement`, retornar mensagens adequadas:
  - `date_based` → "Disponível a partir de {data}"
  - `manual` → "Este módulo ainda não foi liberado"

**Arquivo: `src/hooks/useDashboardData.ts`**

- Incluir `unlock_rule` e `unlock_date` no select de módulos para que fiquem disponíveis no dashboard

---

### Resumo de Arquivos

| Arquivo | Mudança |
|---|---|
| **Migração SQL** | Adicionar `unlock_rule` e `unlock_date` à tabela `modules` |
| `AdminModules.tsx` | Drag-and-drop com dnd-kit + campos de regra de desbloqueio nos diálogos |
| `useSequentialProgress.ts` | Respeitar `unlock_rule` e `unlock_date` ao verificar desbloqueio |
| `useDashboardData.ts` | Incluir novos campos no fetch de módulos |


# Correção: não é possível salvar a Vídeo Aula

## Diagnóstico

Na screenshot, o diálogo "Adicionar Vídeo Aula" fica maior que a altura da janela:

- O título "Adicionar Vídeo Aula" e o campo Título ficam cortados no topo.
- A caixa cinza "Pré-visualização disponível após salvar" empurra o conteúdo.
- Os botões **Cancelar** e **Publicar Vídeo Aula** ficam abaixo da borda inferior da viewport — por isso parece que não dá para salvar.

Causa: `DialogContent` (em `src/pages/admin/AdminExercises.tsx`, linha 888) usa apenas `sm:max-w-xl`, sem limitar altura nem habilitar scroll. Quando o conteúdo passa da tela (especialmente em laptops ~700px de altura, como na screenshot), o footer fica inacessível.

## Plano (1 arquivo)

`src/pages/admin/AdminExercises.tsx`

1. **Diálogo rolável** — alterar o `DialogContent` para limitar a altura e permitir scroll interno:
   - Adicionar `max-h-[90vh]` e `overflow-hidden` no `DialogContent`.
   - Envolver o bloco `<div className="space-y-4 py-2">` com `overflow-y-auto` e altura flexível, de modo que apenas o miolo role e o `DialogHeader`/`DialogFooter` fiquem fixos e sempre visíveis.

2. **Reduzir altura do placeholder de pré-visualização** — trocar `aspect-video` por algo como `h-24` (ou ocultar até existir URL válida confirmada), já que hoje ele só mostra um texto cinza e ocupa espaço de um vídeo inteiro sem necessidade.

3. **Pequenos ajustes**:
   - Garantir `gap-3` no `DialogFooter` em telas pequenas para evitar que os botões se empilhem com pouco espaço.
   - Manter o botão "Publicar Vídeo Aula" com `aria-label` claro para leitores de tela.

## Verificação

- Abrir o diálogo em viewport ~1100×700 (mesmo da screenshot): título visível, campos roláveis, botões **Cancelar** e **Publicar Vídeo Aula** sempre visíveis no rodapé.
- Colar URL do Drive, clicar em **Publicar Vídeo Aula**, confirmar que a aula é criada e aparece na lista.
- Repetir sem URL: botão muda para **Salvar Rascunho** e funciona.

Sem mudanças de banco ou de lógica de salvamento — somente CSS/layout do diálogo.

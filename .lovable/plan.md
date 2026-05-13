## Plano: Suportar links do Google Drive em exercícios de vídeo

### Problema
Hoje o `VideoExercise.tsx` reconhece apenas YouTube, Vimeo ou arquivo de vídeo direto. Quando o admin cola um link do Google Drive (ex: `https://drive.google.com/file/d/<ID>/view?usp=sharing`), nenhum dos casos casa, então o player tenta usar como `<video src>` e não toca — Drive não serve vídeo bruto nessa URL, ele só funciona via `iframe` apontando para `/preview`.

### Solução
Detectar URLs do Google Drive em `getEmbedUrl` e converter para o formato de embed (`https://drive.google.com/file/d/<ID>/preview`), exibindo num iframe como já fazemos com YouTube/Vimeo.

### Mudanças

**1. `src/components/exercises/VideoExercise.tsx`**
Adicionar novo caso em `getEmbedUrl`:
- Padrões reconhecidos:
  - `drive.google.com/file/d/<ID>/...`
  - `drive.google.com/open?id=<ID>`
  - `drive.google.com/uc?id=<ID>`
- Retornar `https://drive.google.com/file/d/<ID>/preview`
- O iframe atual já cobre a renderização (com `allowFullScreen`).
- Como o Drive não expõe `postMessage` de progresso, manter o botão "Marcar como Concluído" (já existe para embeds), permitindo o aluno concluir manualmente — alinhado com a política `conclusao-video-manual-fallback`.

**2. `src/components/admin/ExerciseEditor.tsx`**
- Atualizar placeholder do input para mencionar Google Drive.
- Atualizar a checagem de preview (linha 389) para também tratar URLs `drive.google.com` como embed (mostrar mensagem "Preview disponível para o aluno") em vez de tentar `<video src>`.
- Opcional: nota informando o admin que o link do Drive precisa estar com permissão "Qualquer pessoa com o link – Leitor".

### Observação importante
O vídeo do Drive só carrega no iframe se o arquivo estiver compartilhado publicamente ("Qualquer pessoa com o link"). Se estiver restrito, o iframe mostrará tela de login do Google. Vamos adicionar uma dica no editor para o admin saber disso.

### Arquivos afetados
| Arquivo | Mudança |
|---|---|
| `src/components/exercises/VideoExercise.tsx` | Reconhecer URLs do Google Drive e gerar URL de embed `/preview` |
| `src/components/admin/ExerciseEditor.tsx` | Atualizar placeholder, preview e dica sobre permissão de compartilhamento |

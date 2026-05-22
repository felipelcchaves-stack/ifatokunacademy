# Atalho "Adicionar vídeo aula" no editor de exercícios

## Diagnóstico

O sistema já suporta um exercício do tipo `video` (Vídeo Aula). Hoje, para criar um, o admin precisa:

1. Em `AdminExercises`, clicar em "Novo exercício".
2. Abrir o dropdown de tipos, escolher "Vídeo Aula" entre 9 opções.
3. Dar um título.
4. Esperar abrir o editor, navegar até a aba de vídeo e colar a URL.

Ao lado disso há um botão chamativo de "Gerar exercícios pedagógicos" (`PedagogicalExerciseGenerator`) que pede textos e gera vários exercícios. Isso passa a sensação de que para ter uma aula é preciso criar "todos os exercícios", quando na prática você só quer publicar a videoaula.

## Plano

### 1. Atalho direto na tela de exercícios da aula

Em `src/pages/admin/AdminExercises.tsx`, adicionar um botão primário **"Adicionar Vídeo Aula"** ao lado de "Novo exercício" (e antes do gerador pedagógico).

Comportamento ao clicar:

- Abre um diálogo enxuto com 2 campos:
  - **Título** (pré-preenchido com o título da aula, editável).
  - **URL do vídeo** (YouTube, Vimeo, Google Drive ou upload direto via `MediaUploader`).
  - Campo opcional de **descrição**.
- Ao confirmar, cria o exercício com `type='video'`, `content={ videoUrl, description }`, `display_order` no fim e `is_published=true` se a URL foi preenchida (caso contrário fica rascunho).
- Fecha o diálogo e mostra o exercício na lista — sem abrir o editor completo.

Isso elimina os passos extras: 1 clique → 2 campos → vídeo no ar.

### 2. Reorganizar a barra de ações

Hoje o gerador pedagógico aparece em destaque. Vamos:

- Manter "Adicionar Vídeo Aula" como botão **primário**.
- "Novo exercício" como botão **secundário** (para os demais tipos).
- "Gerar exercícios pedagógicos" como botão **outline/menu** dentro de um menu "Mais opções", com tooltip explicando que ele gera múltiplos exercícios a partir de textos. Assim fica claro que é opcional.

### 3. Pequenos ajustes de UX no diálogo

- Validação leve: se a URL parecer inválida, mostrar aviso (mas não bloquear, pois o usuário pode salvar como rascunho).
- Pré-visualização do vídeo aparece se a URL for de YouTube/Vimeo/Drive/upload (reaproveita o trecho já existente em `ExerciseEditor`).
- Mensagem de sucesso: "Vídeo aula publicada" ou "Salva como rascunho — adicione a URL para publicar".

### 4. Verificação

- Em `awo-isefa`, criar uma nova aula só com videoaula em 3 cliques.
- Confirmar que o aluno enxerga e marca como concluída — destravando o próximo módulo (já corrigido na entrega anterior).
- Confirmar que o gerador pedagógico continua funcionando para quem quiser usar.

## Arquivos afetados

- `src/pages/admin/AdminExercises.tsx` — novo botão, novo diálogo, reorganização da barra de ações.
- Reaproveita `MediaUploader` e a lógica de criação de exercício já existente. Sem migrations de banco.

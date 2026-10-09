# Awo Academy

Crie uma plataforma SaaS de aprendizado online (E-learning) chamada "Offe Orunmila Learning", com foco em estudos aprofundados e proficiência.




**1. Design e Experiência do Usuário (UX/UI):**
*   **Layout e Navegação:** O design deve ser inspirado e seguir o estilo de navegação modular da "English Live", com uma progressão clara e intuitiva.
*   **Idioma:** Toda a interface, conteúdo e funcionalidades devem ser desenvolvidos e apresentados **integralmente em Português (Brasil)**.
*   **Responsividade:** A plataforma deve ser totalmente responsiva, funcionando perfeitamente em dispositivos desktop, tablets e smartphones.




**2. Estrutura de Conteúdo Educacional:**
*   **Módulos de Proficiência:** Implemente uma estrutura de módulos sequenciais para trilhas de proficiência, nomeados como "Akapo", "Awo" e "Oluwo". A navegação entre esses módulos deve ser em formato de "slider" (carrossel).
*   **Módulos Temáticos:** Crie também módulos temáticos independentes, como "Oogun", "Iyami", "Imule", "Sise Orisa" e "Lingua Yoruba", que podem ser acessados de forma flexível.
*   **Diversidade de Exercícios:** A plataforma deve suportar e permitir a criação dos seguintes tipos de exercícios interativos:
    *   Leitura guiada com áudio sincronizado.
    *   Exercícios de "arrastar e soltar" (drag and drop).
    *   Exercícios de "preencher colunas".
    *   Flash Cards para memorização.
    *   Integração de vídeo aulas.
    *   Textos otimizados para memorização.




**3. Interfaces de Gerenciamento (Admin):**
*   Desenvolva um painel de gerenciamento completo que permita ao administrador (Oluwo Ifatokun) total controle sobre:
    *   Criação, edição e organização de módulos e cursos.
    *   Criação e edição de lições e sessões.
    *   Criação e gerenciamento de todos os tipos de exercícios mencionados acima.
    *   Gerenciamento de usuários e seus acessos.




**4. Integrações Essenciais:**
*   **ElevenLabs:** Prepare a estrutura para integração via API com ElevenLabs para conversão de texto em áudio de alta qualidade.
*   **Pagar.me:** Configure a plataforma para integração com Pagar.me como gateway de pagamento principal.
*   **Checkout Guru:** Integre com Checkout Guru para otimizar o fluxo de checkout e vendas.




**5. Dados Iniciais:**
*   A plataforma deve ser inicializada com **dados mockup** para pelo menos um módulo de proficiência (ex: "Akapo") e um módulo temático (ex: "Lingua Yoruba").
*   Esses dados mockup devem ser **totalmente editáveis** através do painel de gerenciamento, facilitando a substituição por conteúdo real no MVP.




**6. Proteção de Conteúdo (CRÍTICO):**
*   **Implemente medidas rigorosas para impedir a cópia e colagem de qualquer conteúdo educacional (textos, áudios, imagens, etc.) exibido na plataforma.**
*   **Desative o menu de contexto do botão direito do mouse** nas áreas de exibição de conteúdo para prevenir ações como "Copiar" ou "Salvar Imagem Como".
*   **Exceção:** A funcionalidade de copiar e colar, e o botão direito, deve ser mantida **APENAS** nos campos de edição de texto e inclusão de materiais no painel de gerenciamento, e em campos de entrada de dados para alunos (ex: respostas de exercícios).




**Objetivo Final:** A plataforma deve oferecer uma experiência de aprendizado imersiva e protegida, com ferramentas robustas para gerenciamento e monetização.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ifatokunacademy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/96033c3a-2c4e-4768-bdba-4809fc4199fd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Login único pelo Hub (área /admin)

Ver `deploy/HUB-SSO.md`.



## Plano: Tornar todos os textos da tela de login configuraveis via branding

### Problema

A tela de login (`Login.tsx`) tem 3 textos hardcoded que nao podem ser alterados pelo branding da organizacao:

1. Citacao decorativa do lado direito: "O conhecimento é a chave que abre todas as portas." — Provérbio Yorubá
2. Texto informativo abaixo do botao: "O acesso a esta plataforma é exclusivo por convite..."
3. Citacao na tela de MFA: "A segurança é a fortaleza do sábio."

### Solucao

#### 1. Adicionar novos campos ao branding

**Arquivo: `src/contexts/OrganizationContext.tsx`**

Adicionar ao `OrganizationBranding`:
```typescript
login_quote?: string | null;        // Citacao decorativa
login_quote_author?: string | null;  // Autor da citacao
login_footer_text?: string | null;   // Texto abaixo do botao de login
```

#### 2. Adicionar campos de edicao na pagina de Branding

**Arquivo: `src/pages/admin/AdminOrganizationBranding.tsx`**

Dentro do card "Textos e Contato", adicionar:
- Campo "Citação da tela de login" (textarea)
- Campo "Autor da citação"
- Campo "Texto informativo do login" (textarea, com placeholder "O acesso a esta plataforma é exclusivo por convite...")

Atualizar o preview do login para usar esses novos campos dinamicamente.

#### 3. Usar dados dinamicos no Login.tsx

**Arquivo: `src/pages/Login.tsx`**

Substituir:
- Linha 445-449: usar `branding.login_quote` e `branding.login_quote_author` com fallbacks
- Linha 409-413: usar `branding.login_footer_text` com fallback
- Linha 314-319 (MFA): usar mesmos campos

### Arquivos modificados

1. `src/contexts/OrganizationContext.tsx` — 3 novos campos opcionais
2. `src/pages/admin/AdminOrganizationBranding.tsx` — novos inputs + preview atualizado
3. `src/pages/Login.tsx` — textos dinamicos

Nenhuma migracao SQL necessaria — campos ficam no JSON `branding` existente.


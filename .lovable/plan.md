

## Plano: Branding completo acessivel a cada tenant admin

### Situacao atual

A pagina de branding (`AdminOrganizationBranding.tsx`) ja tem:
- Cores (primaria, secundaria, destaque)
- Identidade visual (logo, favicon, fonte, imagem de fundo login)
- Prompt de banner IA
- Previews (login, componentes, header, footer)

**Problemas identificados:**

1. **Acesso restrito a global admin**: A pagina de branding so e acessivel via `/admin/organizations/:id/branding`, que aparece apenas no menu "Organizacoes" — visivel somente para admins globais com org principal ativa. Org admins nao tem acesso.

2. **Sem link de branding/dominio no menu contextual**: Quando um org admin (ou global admin gerenciando outra org) esta no painel, nao ha links para Branding ou Dominio no sidebar.

3. **Footer hardcoded**: O texto "Plataforma de estudos sagrados para aprofundamento nos conhecimentos tradicionais" e fixo. Deveria ser configuravel por org.

4. **Dados de contato hardcoded**: Email, telefone, endereco no footer sao ficticios e nao configuraveis.

5. **Texto do login hardcoded**: "Bem-vindo ao..." e "Plataforma de estudos sagrados" na tela de login sao fixos.

### Solucao

#### 1. Adicionar campos editaveis ao branding da org

Novos campos no `OrganizationBranding`:

```typescript
export interface OrganizationBranding {
  // ... campos existentes ...
  tagline?: string | null;           // Ex: "Plataforma de estudos sagrados"
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  welcome_title?: string | null;     // Titulo da tela de login
  welcome_subtitle?: string | null;  // Subtitulo da tela de login
  footer_description?: string | null;
}
```

**Arquivo**: `src/contexts/OrganizationContext.tsx`

#### 2. Adicionar secoes de edicao na pagina de Branding

**Arquivo**: `src/pages/admin/AdminOrganizationBranding.tsx`

Novo card "Textos e Contato" com campos para:
- Tagline / descricao curta
- Titulo e subtitulo de boas-vindas (login)
- Descricao do footer
- Email, telefone, endereco de contato

#### 3. Usar dados dinamicos no Footer

**Arquivo**: `src/components/layout/Footer.tsx`

Substituir textos hardcoded pelos campos de `organization.branding`:
- `footer_description` ou fallback "Plataforma de estudos..."
- `contact_email` ou fallback gerado
- `contact_phone` ou fallback
- `contact_address` ou fallback

#### 4. Usar dados dinamicos na tela de Login

**Arquivo**: `src/pages/Login.tsx`

Substituir textos fixos:
- "Bem-vindo ao..." → `branding.welcome_title` ou fallback
- "Plataforma de estudos sagrados" → `branding.welcome_subtitle` ou fallback

#### 5. Tornar branding e dominio acessiveis para org admins

**Arquivo**: `src/components/layout/AdminLayout.tsx`

Adicionar ao `orgAdminItems` (e ao menu contextual de global admin):
- Link "Branding" apontando para `/admin/organizations/${activeOrg.id}/branding`
- Link "Dominio" apontando para `/admin/organizations/${activeOrg.id}/domain`

Os links devem usar o ID da org ativa do switcher.

**Arquivo**: `src/pages/admin/AdminOrganizationBranding.tsx`

Remover a restricao `if (!isAdmin) navigate('/dashboard')` — permitir tambem `isOrgAdmin`. Usar `organizationId` do param OU da org ativa.

**Arquivo**: `src/pages/admin/AdminOrganizationDomain.tsx`

Mesma mudanca de acesso.

#### 6. Atualizar preview do login na pagina de branding

Usar os novos campos `welcome_title` e `welcome_subtitle` no preview, em vez de textos fixos.

#### 7. Atualizar preview do footer na pagina de branding

Usar os novos campos de contato e descricao no preview.

### Secao tecnica

**Arquivos modificados:**
1. `src/contexts/OrganizationContext.tsx` — novos campos na interface
2. `src/pages/admin/AdminOrganizationBranding.tsx` — novo card de textos/contato, acesso org admin, previews dinamicos
3. `src/pages/admin/AdminOrganizationDomain.tsx` — acesso org admin
4. `src/components/layout/AdminLayout.tsx` — links Branding/Dominio no menu contextual
5. `src/components/layout/Footer.tsx` — dados dinamicos do branding
6. `src/pages/Login.tsx` — textos dinamicos do branding

**Nenhuma migracao SQL necessaria** — os novos campos ficam dentro do JSON `branding` que ja existe.

**Acesso no sidebar (AdminLayout):**
```text
orgAdminItems + [
  { icon: Palette, label: 'Branding', path: `/admin/organizations/${activeOrg?.id}/branding` },
  { icon: Globe, label: 'Domínio', path: `/admin/organizations/${activeOrg?.id}/domain` },
]
```

Esses links so aparecem quando `activeOrg` esta definida e o usuario e org admin ou global admin.




## Adicionar campo "Prompt de Geração de Banner" por organização

### Motivacao

Atualmente o prompt de geracao de banners esta hardcoded na edge function `generate-module-banner` com tematica fixa de Ifa/Isese/Yoruba. Todas as organizacoes geram banners com a mesma estetica. Cada org precisa poder personalizar seu prompt para refletir sua identidade.

### Solucao

1. Adicionar um campo `banner_prompt` dentro do JSON `branding` de cada organizacao
2. Preencher automaticamente o campo com um prompt padrao (o atual para a org principal, e um generico para novas orgs)
3. Permitir edicao do prompt na pagina de Branding da organizacao
4. A edge function le o prompt da org do modulo e usa-o em vez do hardcoded

### Etapas

#### 1. Atualizar interface `OrganizationBranding`

**Arquivo: `src/contexts/OrganizationContext.tsx`**

Adicionar campo opcional ao tipo:
```typescript
export interface OrganizationBranding {
  // ... campos existentes ...
  banner_prompt?: string | null;
}
```

#### 2. Adicionar campo de edicao na pagina de Branding

**Arquivo: `src/pages/admin/AdminOrganizationBranding.tsx`**

Adicionar um novo Card com um `Textarea` para editar o prompt. Incluir:
- Label "Prompt de Geração de Banner IA"
- Descricao explicando que este texto sera usado como instrucao para a IA gerar banners dos modulos
- Textarea com o valor de `branding.banner_prompt`
- Texto auxiliar com dicas (ex: "Descreva o estilo visual, elementos culturais, cores e atmosfera desejada")

#### 3. Popular orgs existentes com prompts padrao

**Migracao SQL:**
- Atualizar a org principal (slug = 'ifatokun') com o prompt atual completo (tematica Ifa/Yoruba)
- Atualizar outras orgs com um prompt generico neutro
- Atualizar o default do campo `branding` na tabela para incluir `banner_prompt: null`

#### 4. Modificar a edge function para usar o prompt da org

**Arquivo: `supabase/functions/generate-module-banner/index.ts`**

Alteracoes:
- Apos validar o modulo, buscar o `organization_id` do modulo
- Com o `organization_id`, buscar o campo `branding->banner_prompt` da organizacao
- Se existir um prompt customizado, usar como base no lugar do prompt hardcoded
- Manter o prompt atual como fallback caso `banner_prompt` seja null
- Manter a logica de `getContextualElements()` para enriquecer o prompt com palavras-chave do titulo/descricao

Fluxo:
```text
1. Recebe moduleId, title, description
2. Busca module.organization_id
3. Busca organization.branding.banner_prompt
4. Se banner_prompt existe -> usa como base + contextualElements
5. Se banner_prompt e null -> usa prompt hardcoded atual (fallback Ifa/Yoruba)
6. Gera imagem com o prompt final
```

### Secao tecnica

**Tipo atualizado (`OrganizationContext.tsx`, linha 5-13):**
```typescript
export interface OrganizationBranding {
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  login_background_url: string | null;
  banner_prompt?: string | null;
}
```

**Edge function - trecho principal da alteracao:**
```typescript
// Buscar org do modulo
const { data: moduleData } = await supabase
  .from('modules')
  .select('organization_id')
  .eq('id', moduleId)
  .single();

let customPrompt: string | null = null;
if (moduleData?.organization_id) {
  const { data: orgData } = await supabase
    .from('organizations')
    .select('branding')
    .eq('id', moduleData.organization_id)
    .single();
  
  customPrompt = (orgData?.branding as any)?.banner_prompt || null;
}

// Usar customPrompt ou fallback
const prompt = customPrompt 
  ? buildCustomPrompt(customPrompt, title, description, isRetry)
  : buildPrompt(title, description, isRetry);
```

**Nova funcao `buildCustomPrompt`:**
Recebe o prompt base da org e adiciona instrucoes tecnicas fixas (formato 16:9, sem texto, alta resolucao) + elementos contextuais do titulo.

**Prompt padrao para org principal (ifatokun):**
O prompt Ifa/Yoruba atual completo sera salvo no campo `banner_prompt` da org.

**Prompt padrao para novas orgs:**
```
Create a professional banner image for an educational module titled "{title}".
Module description: {description}.
Style: Clean, modern, professional educational platform aesthetic.
Format: Horizontal banner (16:9), no text or letters in the image, high resolution.
```

### Arquivos modificados

1. `src/contexts/OrganizationContext.tsx` - adicionar campo ao tipo
2. `src/pages/admin/AdminOrganizationBranding.tsx` - adicionar textarea de edicao
3. `supabase/functions/generate-module-banner/index.ts` - ler prompt da org
4. Migracao SQL - popular orgs existentes com prompts padrao



## Restringir menu "Organizacoes" para admins globais contextualizados

### Situacao atual

O menu do admin e controlado pela variavel `isAdmin` (linha 79 do `AdminLayout.tsx`):
- `isAdmin = true` (admin global) -> mostra TODOS os menus, incluindo "Organizacoes"
- `isAdmin = false` (org admin) -> mostra menu reduzido sem "Organizacoes"

O usuario logado provavelmente e um **admin global** (listado em `admin_emails`), por isso ve o menu completo mesmo quando seleciona "Ijo Ifa Dola" no switcher.

### Problema

Quando um admin global seleciona uma organizacao especifica no switcher, ele continua vendo menus que nao fazem sentido naquele contexto (como "Organizacoes", "Importar Odu", "Gerar TapComplete", "Gerar Drag & Drop"). Esses menus sao funcoes da **plataforma inteira**, nao de uma org especifica.

### Solucao proposta

Adicionar logica no `AdminLayout.tsx` para distinguir entre:
1. **Admin global gerenciando a plataforma** (org principal/ifatokun selecionada) -> menu completo
2. **Admin global gerenciando uma org especifica** (outra org selecionada) -> menu contextualizado

### Secao tecnica

**Arquivo: `src/components/layout/AdminLayout.tsx`**

Alterar a logica da linha 79 para considerar tambem a org ativa:

```text
// Antes:
const sidebarItems = isAdmin ? globalAdminItems : orgAdminItems;

// Depois:
const isPrimaryOrg = !activeOrg || activeOrg.slug === 'ifatokun';
const sidebarItems = isAdmin && isPrimaryOrg 
  ? globalAdminItems 
  : isAdmin 
    ? [...orgAdminItems, { icon: Settings, label: 'Configuracoes', path: '/admin/settings' }]
    : orgAdminItems;
```

Quando um admin global seleciona uma org que nao e a principal:
- Esconde "Organizacoes", "Importar Odu", "Gerar TapComplete", "Gerar Drag & Drop", "Pagamentos"
- Mantem "Modulos", "Licoes", "Usuarios", "Convites", "Relatorios", "Configuracoes"
- Mantem a possibilidade de voltar a org principal no switcher para acessar o menu completo

### Resultado esperado

- Admin global com org "Ifatokun" selecionada: menu completo (com Organizacoes)
- Admin global com org "Ijo Ifa Dola" selecionada: menu reduzido (sem Organizacoes)
- Org admin de "Ijo Ifa Dola": menu reduzido (sem Organizacoes)




## Plano: Reorganizar Header — Limpar Poluição Visual

### Problema

O header está com 9+ links (Dashboard, Revisar, Desafios, Gravar, Estatísticas, Hierarquia, Estatuto, Benefícios, Mensalidades), competindo com o logo e nome da organização.

### Solução

Redistribuir os links entre **Header** (itens principais) e **Menu do Perfil** (itens secundários).

---

### Nova distribuição

**Header (navegação principal):**
- Dashboard
- Hierarquia *(só religious_association)*
- Estatuto *(só religious_association)*
- Benefícios *(só religious_association)*
- Mensalidades *(só religious_association)*

**Menu do Perfil (dropdown do avatar):**
- Revisar
- Desafios
- Estatísticas
- Configurações
- Alterar Senha
- Painel Admin *(se admin)*
- Sair

**Removidos do header:**
- Gravar (removido da navegação principal, fica acessível pela página de lições ou dashboard)

---

### Arquivo a modificar

**`src/components/layout/Header.tsx`**

1. Reduzir `baseStudentLinks` para apenas `Dashboard`
2. Manter `institutionalLinks` (Hierarquia, Estatuto, Benefícios, Mensalidades) no header
3. Adicionar Revisar, Desafios e Estatísticas como `DropdownMenuItem` no menu do perfil, antes de Configurações
4. Remover Gravar do header

### Resultado

Header limpo com no máximo 5 links (Dashboard + 4 institucionais), dando espaço ao logo. Funcionalidades de estudo ficam organizadas no menu do perfil.


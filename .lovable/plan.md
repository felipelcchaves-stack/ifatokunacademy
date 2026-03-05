

## Tipos de Organização

A plataforma suporta **dois** tipos de organização:

- **`educational`** — Educacional (sem páginas institucionais)
- **`religious_association`** — Associação Religiosa (hierarquia do templo, estatuto, benefícios, perfil estendido de membros, mensalidades)

Os antigos tipos `afrocultural` e `association` foram unificados em `religious_association`.

---

## Sistema de Mensalidades (`member_dues`) ✅

Tabela `member_dues` criada com RLS:
- Admins da org gerenciam todas as mensalidades
- Membros veem apenas as próprias

### Páginas implementadas:
- **Admin**: `/admin/organizations/:id/dues` — gerar mensalidades, marcar como pago, filtros
- **Membro**: `/org/:slug/dues` — histórico pessoal de mensalidades
- **Dashboard**: Alerta de mensalidades pendentes/vencidas (`DuesAlert`)

### Páginas institucionais (membros):
- `/org/:slug/hierarchy` — Hierarquia do templo (somente leitura)
- `/org/:slug/bylaws` — Estatuto (já existia)
- `/org/:slug/benefits` — Benefícios (somente leitura)
- `/org/:slug/dues` — Minhas mensalidades

### Links no Header:
Links institucionais (Hierarquia, Estatuto, Benefícios, Mensalidades) aparecem condicionalmente para membros de organizações `religious_association`.

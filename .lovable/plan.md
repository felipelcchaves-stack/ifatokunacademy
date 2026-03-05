

## Plano: Unificar Tipos de Organização

### Resumo

Simplificar os tipos de organização de três (`educational`, `afrocultural`, `association`) para apenas dois: **`educational`** e **`religious_association`** (Associação Religiosa). Atualizar todos os pontos do código que verificam o tipo.

---

### Mudanças

**1. Migração SQL — converter dados existentes:**
```sql
UPDATE organizations SET organization_type = 'religious_association' 
WHERE organization_type IN ('afrocultural', 'association');
```

**2. Arquivos a modificar (4):**

| Arquivo | Mudança |
|---|---|
| `AdminOrganizations.tsx` (linhas 352-354) | Reduzir select para 2 opções: `educational` → "Educacional", `religious_association` → "Associação Religiosa" |
| `AdminLayout.tsx` (linha 91) | Trocar condição de `orgType === 'afrocultural' \|\| orgType === 'association'` para `orgType === 'religious_association'` |
| `AdminOrganizationMembers.tsx` (linha 160) | Trocar condição `isAfrocultural` para verificar `organization_type === 'religious_association'` |
| `UserSettings.tsx` | Trocar verificação de tipo para `religious_association` |

**3. Atualizar `plan.md`** com a nova nomenclatura.

---

### Resultado

- **Educacional** — sem páginas institucionais
- **Associação Religiosa** — hierarquia do templo, estatuto, benefícios, perfil estendido de membros


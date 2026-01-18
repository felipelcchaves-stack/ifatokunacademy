import React from 'react';
import { Building2, Check, ChevronDown, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUserOrganizations, UserOrganization } from '@/hooks/useUserOrganizations';
import { Skeleton } from '@/components/ui/skeleton';

interface OrganizationSwitcherProps {
  className?: string;
  compact?: boolean;
}

const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({ 
  className = '',
  compact = false 
}) => {
  const { 
    organizations, 
    loading, 
    currentOrg, 
    switchOrganization,
    setPrimaryOrganization 
  } = useUserOrganizations();

  // Não mostrar se usuário tem apenas uma ou nenhuma org
  if (!loading && organizations.length <= 1) {
    return null;
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  const getRoleBadge = (role: UserOrganization['role']) => {
    switch (role) {
      case 'owner':
        return <Badge variant="default" className="text-xs">Dono</Badge>;
      case 'admin':
        return <Badge variant="secondary" className="text-xs">Admin</Badge>;
      default:
        return null;
    }
  };

  const getOrgInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getOrgColor = (branding: Record<string, unknown> | null) => {
    if (branding?.primary_color) {
      return `hsl(${branding.primary_color})`;
    }
    return 'hsl(var(--primary))';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={`flex items-center gap-2 ${compact ? 'px-2' : 'px-3'} ${className}`}
        >
          {currentOrg && (
            <>
              <div 
                className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: getOrgColor(currentOrg.organization.branding) }}
              >
                {getOrgInitial(currentOrg.organization.name)}
              </div>
              {!compact && (
                <span className="max-w-[120px] truncate text-sm font-medium">
                  {currentOrg.organization.name}
                </span>
              )}
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </>
          )}
          {!currentOrg && (
            <>
              <Building2 className="w-5 h-5" />
              {!compact && <span className="text-sm">Organizações</span>}
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-64 bg-popover z-50">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Suas Organizações
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrganization(org.organization_id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: getOrgColor(org.organization.branding) }}
              >
                {getOrgInitial(org.organization.name)}
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{org.organization.name}</span>
                <span className="text-xs text-muted-foreground">
                  /{org.organization.slug}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {org.is_primary && (
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              )}
              {currentOrg?.organization_id === org.organization_id && (
                <Check className="w-4 h-4 text-primary" />
              )}
              {getRoleBadge(org.role)}
            </div>
          </DropdownMenuItem>
        ))}

        {organizations.length > 1 && currentOrg && !currentOrg.is_primary && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setPrimaryOrganization(currentOrg.organization_id)}
              className="text-xs text-muted-foreground cursor-pointer"
            >
              <Star className="w-4 h-4 mr-2" />
              Definir como organização principal
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default OrganizationSwitcher;

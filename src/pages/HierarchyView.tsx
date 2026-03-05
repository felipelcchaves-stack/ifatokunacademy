import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Crown, ArrowLeft, Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface TempleRole {
  id: string;
  name: string;
  description: string | null;
  category: string;
  level: number;
  is_board_member: boolean;
}

const HierarchyView: React.FC = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { organization } = useOrganization();
  const [roles, setRoles] = useState<TempleRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization?.id) fetchRoles();
  }, [organization?.id]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('temple_roles')
        .select('id, name, description, category, level, is_board_member')
        .eq('organization_id', organization!.id)
        .order('level', { ascending: false });

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const dashboardUrl = orgSlug ? `/org/${orgSlug}/dashboard` : '/dashboard';
  const spiritualRoles = roles.filter(r => r.category === 'spiritual');
  const adminRoles = roles.filter(r => r.category === 'administrative');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-6">
            <Link to={dashboardUrl}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-8">
            <Crown className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Hierarquia</h1>
              <p className="text-muted-foreground">{organization?.name}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : roles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Crown className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum cargo cadastrado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {spiritualRoles.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    Cargos Espirituais
                  </h2>
                  <div className="space-y-3">
                    {spiritualRoles.map(role => (
                      <Card key={role.id}>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{role.name}</p>
                              {role.description && (
                                <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">Nível {role.level}</Badge>
                              {role.is_board_member && (
                                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Diretoria</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {adminRoles.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Cargos Administrativos
                  </h2>
                  <div className="space-y-3">
                    {adminRoles.map(role => (
                      <Card key={role.id}>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{role.name}</p>
                              {role.description && (
                                <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">Nível {role.level}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HierarchyView;

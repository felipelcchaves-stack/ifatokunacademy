import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollText, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

interface Bylaw {
  id: string;
  title: string;
  content: string;
  display_order: number;
}

const BylawsView: React.FC = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { organization } = useOrganization();
  const [bylaws, setBylaws] = useState<Bylaw[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization?.id) fetchBylaws();
  }, [organization?.id]);

  const fetchBylaws = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organization_bylaws' as any)
        .select('id, title, content, display_order')
        .eq('organization_id', organization!.id)
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBylaws((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching bylaws:', error);
    } finally {
      setLoading(false);
    }
  };

  const dashboardUrl = orgSlug ? `/org/${orgSlug}/dashboard` : '/dashboard';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to={dashboardUrl}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <ScrollText className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Estatuto</h1>
            <p className="text-muted-foreground">{organization?.name}</p>
          </div>
        </div>

        {bylaws.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ScrollText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum artigo publicado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {bylaws.map((bylaw) => (
              <Card key={bylaw.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{bylaw.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                    {bylaw.content}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BylawsView;

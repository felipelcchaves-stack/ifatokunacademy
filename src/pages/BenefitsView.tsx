import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Gift, ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface Benefit {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
}

const BenefitsView: React.FC = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { organization } = useOrganization();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization?.id) fetchBenefits();
  }, [organization?.id]);

  const fetchBenefits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organization_benefits')
        .select('id, title, description, icon')
        .eq('organization_id', organization!.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBenefits(data || []);
    } catch (error) {
      console.error('Error fetching benefits:', error);
    } finally {
      setLoading(false);
    }
  };

  const dashboardUrl = orgSlug ? `/org/${orgSlug}/dashboard` : '/dashboard';

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
            <Gift className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Benefícios</h1>
              <p className="text-muted-foreground">{organization?.name}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : benefits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum benefício cadastrado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {benefits.map(benefit => (
                <Card key={benefit.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">{benefit.icon || '🎁'}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                        {benefit.description && (
                          <p className="text-sm text-muted-foreground mt-1">{benefit.description}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BenefitsView;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Users, Shield, Play, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ModuleSlider from '@/components/modules/ModuleSlider';
import { proficiencyModules, thematicModules } from '@/data/mockData';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { platformName } = usePlatformSettings();
  
  const displayPlatformName = platformName?.split(' ').slice(0, 2).join(' ') || 'Offe Orunmila';

  const features = [
    {
      icon: BookOpen,
      title: 'Módulos Estruturados',
      description: 'Trilhas de aprendizado progressivas do iniciante ao mestre.',
    },
    {
      icon: Users,
      title: 'Comunidade Viva',
      description: 'Aprenda com praticantes experientes e uma comunidade engajada.',
    },
    {
      icon: Shield,
      title: 'Conhecimento Autêntico',
      description: 'Conteúdo verificado e preservado pela tradição oral.',
    },
  ];

  const testimonials = [
    {
      name: 'Maria Santos',
      role: 'Estudante Awo',
      content: 'A plataforma transformou minha jornada de aprendizado. O conteúdo é profundo e acessível.',
      avatar: 'MS',
    },
    {
      name: 'Carlos Oliveira',
      role: 'Estudante Akapo',
      content: 'Finalmente encontrei um lugar que respeita e preserva nosso conhecimento ancestral.',
      avatar: 'CO',
    },
    {
      name: 'Ana Paula',
      role: 'Praticante',
      content: 'Os exercícios interativos me ajudam a memorizar os Odù de forma muito mais efetiva.',
      avatar: 'AP',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center gradient-hero pattern-adinkra overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/50 to-secondary" />
        
        <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 backdrop-blur-sm rounded-full mb-6 animate-fade-in-up">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Plataforma de Estudos Tradicionais</span>
            </div>
            
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in-up stagger-1">
              Desvende os Mistérios de{' '}
              <span className="text-gradient-gold">Orunmilá</span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed animate-fade-in-up stagger-2">
              Uma jornada de aprendizado profundo na sabedoria ancestral Yorubá. 
              Módulos estruturados, exercícios interativos e conhecimento autêntico.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up stagger-3">
              <Button 
                size="lg"
                className="gradient-gold text-secondary font-semibold shadow-gold hover:opacity-90 transition-opacity text-lg px-8"
                onClick={() => navigate('/register')}
              >
                Começar Jornada
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 text-lg px-8"
                onClick={() => navigate('/modules')}
              >
                <Play className="w-5 h-5 mr-2" />
                Ver Módulos
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Por que {displayPlatformName}?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma desenvolvida com respeito à tradição e compromisso com a excelência pedagógica.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-card rounded-2xl p-8 shadow-soft border border-border hover:shadow-elevated transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-xl gradient-gold flex items-center justify-center mb-6 shadow-gold group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-secondary" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proficiency Modules Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <ModuleSlider 
            modules={proficiencyModules}
            title="Trilhas de Proficiência"
            subtitle="Progrida do nível Akapo ao Oluwo"
          />
        </div>
      </section>

      {/* Thematic Modules Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <ModuleSlider 
            modules={thematicModules}
            title="Módulos Temáticos"
            subtitle="Aprofunde-se em áreas específicas do conhecimento"
          />
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              O Que Dizem Nossos Estudantes
            </h2>
            <p className="text-secondary-foreground/70 max-w-2xl mx-auto">
              Histórias de transformação e aprendizado da nossa comunidade.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="bg-secondary-foreground/5 backdrop-blur-sm rounded-2xl p-6 border border-secondary-foreground/10"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center text-secondary font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-medium">{testimonial.name}</h4>
                    <p className="text-sm text-secondary-foreground/60">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-secondary-foreground/80 italic">
                  "{testimonial.content}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl p-12 border border-primary/20">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pronto para Começar sua Jornada?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Junte-se a centenas de estudantes que já estão transformando seu conhecimento através da sabedoria ancestral.
            </p>
            <Button 
              size="lg"
              className="gradient-gold text-secondary font-semibold shadow-gold hover:opacity-90 transition-opacity text-lg px-8"
              onClick={() => navigate('/register')}
            >
              Criar Conta Gratuita
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;

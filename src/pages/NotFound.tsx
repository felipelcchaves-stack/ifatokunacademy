import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Usuário tentou acessar rota inexistente:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-4">
        <h1 className="mb-4 text-6xl font-serif font-bold text-primary">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">
          Ops! Página não encontrada
        </p>
        <p className="mb-8 text-muted-foreground max-w-md mx-auto">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Button asChild className="gradient-gold text-secondary shadow-gold">
          <Link to="/login">
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;

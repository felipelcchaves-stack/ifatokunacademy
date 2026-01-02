import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  onBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AdminErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  private handleBack = () => {
    this.setState({ hasError: false, error: null });
    this.props.onBack?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {this.props.fallbackTitle || 'Ocorreu um erro ao renderizar esta tela'}
            </h2>
            <p className="text-muted-foreground max-w-md">
              Houve um problema ao carregar este conteúdo. Isso pode ser causado por dados inconsistentes.
            </p>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                  Ver detalhes técnicos
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto max-w-lg">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>

          <div className="flex gap-3">
            {this.props.onBack && (
              <Button variant="outline" onClick={this.handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            )}
            <Button onClick={this.handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, AlertTriangle, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useModuleRetention, ModuleWithRetention } from '@/hooks/useModuleRetention';
import { cn } from '@/lib/utils';

const ModuleRetentionAlert: React.FC = () => {
  const navigate = useNavigate();
  const { modulesNeedingReview, loading } = useModuleRetention();

  if (loading || modulesNeedingReview.length === 0) {
    return null;
  }

  const overdueCount = modulesNeedingReview.filter(m => m.status === 'overdue').length;
  const dueSoonCount = modulesNeedingReview.filter(m => m.status === 'due_soon').length;

  const getStatusIcon = (status: ModuleWithRetention['status']) => {
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'due_soon':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getStatusColor = (status: ModuleWithRetention['status']) => {
    switch (status) {
      case 'overdue':
        return 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30';
      case 'due_soon':
        return 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30';
      default:
        return 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30';
    }
  };

  const getRetentionBadge = (score: number) => {
    if (score >= 90) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
          💚 {score}%
        </span>
      );
    } else if (score >= 70) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          💛 {score}%
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          ❤️ {score}%
        </span>
      );
    }
  };

  return (
    <div className="group relative bg-card rounded-2xl p-6 border border-border shadow-soft hover:shadow-elevated transition-all duration-300 overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300",
              overdueCount > 0 
                ? "bg-gradient-to-br from-red-500 to-amber-600" 
                : "bg-gradient-to-br from-amber-500 to-orange-600"
            )}>
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                overdueCount > 0 ? "text-red-600" : "text-amber-600"
              )}>
                Manutenção de Memória
              </span>
              <h3 className="font-bold text-foreground">
                {overdueCount > 0 
                  ? `${overdueCount} módulo${overdueCount > 1 ? 's' : ''} precisam de revisão` 
                  : `${dueSoonCount} revisão${dueSoonCount > 1 ? 'ões' : ''} em breve`}
              </h3>
            </div>
          </div>
        </div>

        {/* Module List */}
        <div className="space-y-2 mb-4">
          {modulesNeedingReview.slice(0, 3).map((module) => (
            <div 
              key={module.module_id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer hover:border-primary/30",
                getStatusColor(module.status)
              )}
              onClick={() => navigate(`/module/${module.module_id}/retention`)}
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(module.status)}
                <span className="font-medium text-sm">{module.module_title}</span>
              </div>
              <div className="flex items-center gap-2">
                {getRetentionBadge(module.retention_score)}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>

        {modulesNeedingReview.length > 3 && (
          <p className="text-xs text-muted-foreground mb-4">
            +{modulesNeedingReview.length - 3} outros módulos
          </p>
        )}

        {/* Action Button */}
        <Button 
          className={cn(
            "w-full font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200",
            overdueCount > 0 
              ? "bg-gradient-to-r from-red-500 to-amber-600 hover:from-red-600 hover:to-amber-700 text-white"
              : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
          )}
          onClick={() => {
            const firstModule = modulesNeedingReview[0];
            if (firstModule) {
              navigate(`/module/${firstModule.module_id}/retention`);
            }
          }}
        >
          <Brain className="w-4 h-4 mr-2" />
          Revisar Agora
        </Button>
      </div>
    </div>
  );
};

export default ModuleRetentionAlert;

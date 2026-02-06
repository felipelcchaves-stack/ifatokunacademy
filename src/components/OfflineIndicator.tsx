import React from 'react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOnline, isSyncing, pendingCount }) => {
  // Don't show anything if online and no pending items
  if (isOnline && !isSyncing && pendingCount === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium mb-4 transition-colors',
        !isOnline && 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
        isSyncing && 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
        isOnline && !isSyncing && pendingCount > 0 && 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
      )}
    >
      {!isOnline && (
        <>
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Você está offline. Revisões serão salvas localmente.</span>
          {pendingCount > 0 && (
            <span className="ml-auto text-xs opacity-75">
              {pendingCount} {pendingCount === 1 ? 'pendente' : 'pendentes'}
            </span>
          )}
        </>
      )}
      {isSyncing && (
        <>
          <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
          <span>Sincronizando {pendingCount} {pendingCount === 1 ? 'revisão' : 'revisões'}...</span>
        </>
      )}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <>
          <Wifi className="w-4 h-4 shrink-0" />
          <span>Conexão restaurada. Sincronizando...</span>
        </>
      )}
    </div>
  );
};

export default OfflineIndicator;

import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-emerald-900/90 text-white backdrop-blur-md px-3.5 py-1 text-xs font-medium shadow-md border border-emerald-700">
      <WifiOff className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
      <span>Mode 100% Hors-Ligne actif</span>
    </div>
  );
};

import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { translations, Language } from '../utils/i18n';

interface OfflineIndicatorProps {
  lang: Language;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ lang }) => {
  const isOnline = useOnlineStatus();
  const t = translations[lang];

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:right-auto md:max-w-md z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500/95 text-slate-950 font-medium text-xs md:text-sm shadow-xl backdrop-blur-md animate-bounce">
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{t.offlineNotice}</span>
      <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
    </div>
  );
};

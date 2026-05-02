import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => { setIsOffline(true); setWasOffline(true); };
    const goOnline = () => { setIsOffline(false); };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // Auto-hide "back online" after 3s
  useEffect(() => {
    if (!isOffline && wasOffline) {
      const t = setTimeout(() => setWasOffline(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOffline, wasOffline]);

  if (!isOffline && !wasOffline) return null;

  return (
    <div className={`shrink-0 z-30 sm:hidden px-3 py-1.5 text-center text-[11px] font-medium transition-colors duration-300 ${
      isOffline
        ? 'bg-amber-600 text-white'
        : 'bg-[#3D8B5E] text-white'
    }`}>
      {isOffline ? (
        <span className="flex items-center justify-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
            <path d="M5 12.55a10.94 10.94 0 015.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0122.56 9" />
            <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
            <path d="M8.53 16.11a6 6 0 016.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          Fara conexiune — modificarile se salveaza local
        </span>
      ) : (
        <span>Conexiune restabilita</span>
      )}
    </div>
  );
}

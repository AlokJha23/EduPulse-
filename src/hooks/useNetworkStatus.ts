import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  isReconnecting: boolean;
  offlineSince: Date | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;
  });

  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [offlineSince, setOfflineSince] = useState<Date | null>(null);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setIsReconnecting(false);
    // If it was previously marked offline, flag wasOffline so UI can show a brief "Reconnected" notice
    setWasOffline(true);
    setOfflineSince(null);

    // Auto-clear the reconnected banner after 4 seconds
    const timer = setTimeout(() => {
      setWasOffline(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(false);
    setIsReconnecting(false);
    setOfflineSince(new Date());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setIsOnline(false);
      setOfflineSince(new Date());
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOnline,
    wasOffline,
    isReconnecting,
    offlineSince,
  };
}

import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const NetworkStatusIndicator: React.FC = () => {
  const { isOnline, wasOffline, offlineSince } = useNetworkStatus();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // If user is online and wasn't recently offline, nothing to render for floating alert
  if (isOnline && !wasOffline) {
    return null;
  }

  // If offline was explicitly minimized by user in this session, keep it small
  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      // Ping check
      await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
      // If successful, navigator.onLine will trigger or page re-evaluates
    } catch {
      // Still offline
    } finally {
      setTimeout(() => setIsChecking(false), 800);
    }
  };

  return (
    <div
      id="network-connectivity-banner"
      role="status"
      aria-live="polite"
      className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 max-w-md select-none transition-all duration-300 ease-in-out transform"
    >
      {/* 1. Offline Notification Card */}
      {!isOnline && (
        <div className="bg-slate-900/95 text-white border border-amber-500/40 shadow-2xl rounded-2xl p-3.5 backdrop-blur-md flex items-start gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <WifiOff className="w-4 h-4 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-amber-300">Offline Mode Active</h4>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
              No internet connection detected. Working with local cached session. Changes will sync once reconnected.
            </p>
            {offlineSince && (
              <p className="text-[10px] text-slate-400 mt-1">
                Disconnected since {offlineSince.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}

            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={isChecking}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Checking...' : 'Check Connection'}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            title="Minimize"
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Reconnection Banner (Shows for 4 seconds after coming back online) */}
      {isOnline && wasOffline && (
        <div className="bg-emerald-950/95 text-emerald-100 border border-emerald-500/40 shadow-2xl rounded-2xl p-3 backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-emerald-300">Back Online</h4>
            <p className="text-[11px] text-emerald-200/80">
              Internet connection restored. Synchronized with server.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export const CompactNetworkBadge: React.FC = () => {
  const { isOnline } = useNetworkStatus();

  return (
    <div
      id="navbar-network-status-badge"
      title={isOnline ? 'Network: Online and connected' : 'Network: Offline (cached mode)'}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors select-none ${
        isOnline
          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
          : 'bg-amber-500/15 text-amber-700 border-amber-300 animate-pulse'
      }`}
    >
      {isOnline ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          <Wifi className="w-3 h-3 text-emerald-600 hidden sm:inline" />
          <span className="hidden md:inline text-[10px]">Online</span>
        </>
      ) : (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          <WifiOff className="w-3 h-3 text-amber-600" />
          <span className="text-[10px] font-semibold">Offline</span>
        </>
      )}
    </div>
  );
};

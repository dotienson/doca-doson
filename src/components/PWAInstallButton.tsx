import { useState } from 'react';
import { Download, Share, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { t, type Language, type ThemeMode } from '../data/orchidometer';

interface PWAInstallButtonProps {
  lang: Language;
  theme: ThemeMode;
  compact?: boolean;
}

export function PWAInstallButton({ lang, theme, compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const isDark = theme === 'dark';

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => {
          void install();
        }}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap shrink-0 ${
          compact ? 'min-h-[34px] px-2.5 text-xs' : 'min-h-[38px] px-3 text-xs'
        } ${
          isDark
            ? 'bg-teal-500/15 border border-teal-400/30 text-teal-300 hover:bg-teal-500/25'
            : 'bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100'
        }`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{t[lang].pwaInstall}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg border font-semibold transition-colors whitespace-nowrap shrink-0 ${
            compact ? 'min-h-[34px] px-2.5 text-xs' : 'min-h-[38px] px-3 text-xs'
          } ${
            isDark
              ? 'bg-[#161B22] border-white/15 text-slate-200 hover:bg-[#1E2530]'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Share className="w-3.5 h-3.5 shrink-0" />
          <span>{t[lang].pwaInstallShort}</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className={`w-full max-w-sm rounded-2xl border p-5 space-y-3.5 ${
                isDark
                  ? 'bg-[#11151B] border-white/15 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-900 shadow-lg'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold">{t[lang].pwaIosTitle}</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg ${
                    isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className={`space-y-2 text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <li>1. {t[lang].pwaIosStep1}</li>
                <li>2. {t[lang].pwaIosStep2}</li>
                <li>3. {t[lang].pwaIosStep3}</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className={`w-full min-h-[42px] rounded-xl text-sm font-semibold transition-colors ${
                  isDark
                    ? 'bg-white text-slate-950 hover:bg-slate-200'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {t[lang].understood}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineIndicator({ lang, theme }: { lang: Language; theme: ThemeMode }) {
  const isOnline = useOnlineStatus();
  const isDark = theme === 'dark';

  if (isOnline) return null;

  return (
    <div
      className={`fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium whitespace-nowrap ${
        isDark
          ? 'bg-amber-950/90 border-amber-500/40 text-amber-200'
          : 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
      }`}
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>{t[lang].offlineMode}</span>
    </div>
  );
}

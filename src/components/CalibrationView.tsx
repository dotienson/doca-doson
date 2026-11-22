import { AnimatePresence, motion } from 'motion/react';
import { Check, Lock, Moon, Ruler, Sun, X } from 'lucide-react';
import {
  CARD_HEIGHT_MM,
  CARD_WIDTH_MM,
  DEVICE_PRESETS,
  triggerHaptic,
  t,
  type CalibMethod,
  type DisplayMode,
  type Language,
  type ThemeMode,
} from '../data/orchidometer';

interface CalibrationViewProps {
  lang: Language;
  onToggleLang: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  calibMethod: CalibMethod;
  setCalibMethod: (m: CalibMethod) => void;
  calibrationWidth: number;
  setCalibrationWidth: React.Dispatch<React.SetStateAction<number>>;
  displayMode: DisplayMode;
  setDisplayMode: (m: DisplayMode) => void;
  screenInches: number;
  setScreenInches: (s: number) => void;
  selectedDevice: number;
  setSelectedDevice: (d: number) => void;
  isPremiumUnlocked: boolean;
  setIsPremiumUnlocked: (v: boolean) => void;
  showPremiumPrompt: boolean;
  setShowPremiumPrompt: (v: boolean) => void;
  premiumCode: string;
  setPremiumCode: (v: string) => void;
  premiumError: boolean;
  setPremiumError: (v: boolean) => void;
  onUnlockSuccess: () => void;
  onConfirmCalibrate: () => void;
}

export function CalibrationView({
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  calibMethod,
  setCalibMethod,
  calibrationWidth,
  setCalibrationWidth,
  displayMode,
  setDisplayMode,
  screenInches,
  setScreenInches,
  selectedDevice,
  setSelectedDevice,
  isPremiumUnlocked,
  setIsPremiumUnlocked,
  showPremiumPrompt,
  setShowPremiumPrompt,
  premiumCode,
  setPremiumCode,
  premiumError,
  setPremiumError,
  onUnlockSuccess,
  onConfirmCalibrate,
}: CalibrationViewProps) {
  const isDark = theme === 'dark';

  const modeOptions: { id: DisplayMode; label: string; isPremium?: boolean }[] = [
    { id: 'vertical', label: t[lang].vertical },
    { id: 'horizontal', label: t[lang].horizontal },
    { id: 'both', label: t[lang].both },
    { id: 'triple', label: t[lang].triple },
    { id: 'beads', label: t[lang].beads, isPremium: true },
  ];

  const handleSelectMode = (mode: { id: DisplayMode; isPremium?: boolean }) => {
    if (mode.isPremium && !isPremiumUnlocked) {
      setShowPremiumPrompt(true);
    } else {
      setDisplayMode(mode.id);
      setShowPremiumPrompt(false);
    }
  };

  const renderMethodTabs = () => (
    <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl ${isDark ? 'bg-[#161B22]' : 'bg-slate-200/70'}`}>
      <button
        type="button"
        onClick={() => {
          setCalibMethod('ruler');
          setCalibrationWidth(250);
        }}
        className={`min-h-[44px] px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap truncate ${
          calibMethod === 'ruler'
            ? isDark
              ? 'bg-[#212834] text-white'
              : 'bg-white text-slate-900 shadow-xs'
            : isDark
            ? 'text-slate-400 hover:text-white'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        {t[lang].ruler}
      </button>
      <button
        type="button"
        onClick={() => {
          setCalibMethod('card');
          setCalibrationWidth(150);
        }}
        className={`min-h-[44px] px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap truncate ${
          calibMethod === 'card'
            ? isDark
              ? 'bg-[#212834] text-white'
              : 'bg-white text-slate-900 shadow-xs'
            : isDark
            ? 'text-slate-400 hover:text-white'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        {t[lang].card}
      </button>
      <button
        type="button"
        onClick={() => {
          setCalibMethod('screen');
        }}
        className={`min-h-[44px] px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap truncate ${
          calibMethod === 'screen'
            ? isDark
              ? 'bg-[#212834] text-white'
              : 'bg-white text-slate-900 shadow-xs'
            : isDark
            ? 'text-slate-400 hover:text-white'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        {t[lang].screen}
      </button>
    </div>
  );

  const renderModeSelector = () => (
    <div className="space-y-2 relative">
      <span className={`block text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        {t[lang].displayMode}
      </span>
      <div className="grid grid-cols-2 gap-2">
        {modeOptions.map((mode) => {
          const active = displayMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleSelectMode(mode)}
              className={`min-h-[44px] px-3 text-xs sm:text-sm font-medium rounded-xl border transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
                mode.id === 'beads' ? 'col-span-2' : ''
              } ${
                active
                  ? isDark
                    ? 'bg-teal-500 border-teal-500 text-slate-950 font-semibold'
                    : 'bg-slate-900 border-slate-900 text-white font-semibold'
                  : isDark
                  ? 'bg-[#161B22] border-white/10 text-slate-200 hover:bg-[#1E2530]'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <span>{mode.label}</span>
              {mode.isPremium && !isPremiumUnlocked && (
                <Lock className="w-3.5 h-3.5 opacity-75 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {showPremiumPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`mt-2 p-4 rounded-xl border space-y-3 ${
              isDark
                ? 'bg-[#0D1117] text-white border-white/15'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-teal-400" />
                <span>{t[lang].premiumPromptTitle}</span>
              </h4>
              <button
                type="button"
                aria-label={t[lang].cancel}
                onClick={() => setShowPremiumPrompt(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              placeholder={t[lang].promoPlaceholder}
              value={premiumCode}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setPremiumCode(val);
                if (val === '6868') {
                  setIsPremiumUnlocked(true);
                  localStorage.setItem('orchidometer_vip', 'true');
                  setShowPremiumPrompt(false);
                  setDisplayMode('beads');
                  setPremiumError(false);
                  onUnlockSuccess();
                  triggerHaptic([80, 40, 80]);
                } else if (val.length >= 4) {
                  setPremiumError(true);
                  triggerHaptic(50);
                } else {
                  setPremiumError(false);
                }
              }}
              className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-white text-center tabular-nums text-base font-semibold tracking-widest focus:outline-none focus:border-teal-400"
            />
            {premiumError && (
              <div className="flex items-center justify-between text-xs text-red-200 bg-red-950/70 border border-red-800/70 rounded-xl px-3 py-2">
                <span>{t[lang].premiumError}</span>
                <button
                  type="button"
                  onClick={() => setPremiumError(false)}
                  className="min-h-[32px] min-w-[32px] flex items-center justify-center text-red-300 hover:text-white ml-2 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderVisualCalibStage = () => (
    <div className="w-full flex flex-col items-center justify-center gap-3.5 sm:gap-5">
      {calibMethod === 'screen' ? (
        <div
          className={`w-full max-w-md border rounded-2xl p-4 sm:p-5 space-y-3.5 ${
            isDark ? 'bg-[#11151B] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {t[lang].screenPrompt}
          </p>
          <select
            aria-label={t[lang].screenPrompt}
            className={`w-full min-h-[44px] border rounded-xl py-2.5 px-3 text-sm font-medium focus:outline-none focus:border-teal-500 ${
              isDark
                ? 'bg-[#090B0E] border-white/15 text-white'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
            value={selectedDevice}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setSelectedDevice(val);
              if (val > 0) setScreenInches(val);
            }}
          >
            {DEVICE_PRESETS.map((preset) => (
              <option key={preset.nameVi} value={preset.size}>
                {lang === 'vi' ? preset.nameVi : preset.nameEn}{' '}
                {preset.size > 0 ? `(${preset.size}")` : ''}
              </option>
            ))}
          </select>

          <div
            className={`flex items-center justify-between pt-2.5 border-t ${
              isDark ? 'border-white/10' : 'border-slate-100'
            }`}
          >
            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {lang === 'vi' ? 'Đường chéo màn hình' : 'Diagonal'}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="3"
                max="40"
                value={screenInches}
                onChange={(e) => {
                  setScreenInches(parseFloat(e.target.value) || 6.1);
                  setSelectedDevice(0);
                }}
                className={`w-24 min-h-[42px] text-center tabular-nums text-lg font-semibold border rounded-xl py-1.5 focus:outline-none focus:border-teal-500 ${
                  isDark
                    ? 'bg-[#090B0E] border-white/15 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
              <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>in</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center gap-3.5">
          <div className="flex items-center justify-center min-h-[120px] sm:min-h-[180px] w-full overflow-x-auto py-1.5">
            {calibMethod === 'card' ? (
              <div
                style={{
                  width: `${calibrationWidth}px`,
                  height: `${(calibrationWidth / CARD_WIDTH_MM) * CARD_HEIGHT_MM}px`,
                }}
                className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-3 text-center shrink-0 ${
                  isDark
                    ? 'border-teal-400 bg-[#11151B]'
                    : 'border-teal-600 bg-white'
                }`}
              >
                <span className="tabular-nums text-[11px] font-medium text-slate-400 mb-1">
                  53.98 × 85.60 mm
                </span>
                <span className={`text-xs font-medium leading-snug ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  {t[lang].cardPrompt}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5">
                <p className={`text-xs font-medium text-center px-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t[lang].rulerPrompt}
                </p>
                <div
                  style={{ width: `${calibrationWidth}px` }}
                  className={`h-14 relative flex items-end border rounded-lg ${
                    isDark ? 'bg-[#11151B] border-white/20' : 'bg-white border-slate-300'
                  }`}
                >
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDark ? 'bg-slate-200' : 'bg-slate-900'}`} />
                  {[0, 1, 2, 3, 4, 5].map((cm) => (
                    <div
                      key={cm}
                      style={{ left: `${(cm / 5) * 100}%` }}
                      className="absolute bottom-0 flex flex-col items-center -translate-x-1/2"
                    >
                      <span className={`tabular-nums font-semibold text-[11px] mb-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {cm}
                      </span>
                      <div
                        className={`w-0.5 ${isDark ? 'bg-slate-200' : 'bg-slate-900'} ${
                          cm === 0 || cm === 5 ? 'h-6' : 'h-3.5'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div
            className={`w-full max-w-md space-y-2 border rounded-2xl p-3 sm:p-4 ${
              isDark ? 'bg-[#11151B] border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                aria-label="Decrease calibration width"
                onClick={() => setCalibrationWidth((w) => Math.max(50, w - 1))}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 rounded-xl font-semibold text-lg transition-all ${
                  isDark
                    ? 'bg-[#1A2029] hover:bg-[#232B38] text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                −
              </button>
              <input
                type="range"
                min="100"
                max="500"
                value={calibrationWidth}
                onChange={(e) => setCalibrationWidth(parseInt(e.target.value, 10))}
                className="flex-1 clinical-slider"
              />
              <button
                type="button"
                aria-label="Increase calibration width"
                onClick={() => setCalibrationWidth((w) => Math.min(800, w + 1))}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 rounded-xl font-semibold text-lg transition-all ${
                  isDark
                    ? 'bg-[#1A2029] hover:bg-[#232B38] text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                +
              </button>
            </div>
            <div className={`flex items-center justify-between gap-2 text-[11px] sm:text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="truncate">{t[lang].sliderHint}</span>
              <span className={`tabular-nums font-semibold whitespace-nowrap shrink-0 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {calibrationWidth} px
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        paddingTop: 'var(--sat)',
        paddingBottom: 'var(--sab)',
        paddingLeft: 'var(--sal)',
        paddingRight: 'var(--sar)',
      }}
      className={`min-h-dvh flex flex-col justify-between transition-colors ${
        isDark ? 'bg-[#090B0E] text-slate-100' : 'bg-[#F4F6F9] text-slate-900'
      }`}
    >
      {/* Top Bar — Compact 44px on Mobile Portrait, 3-Zone on Desktop */}
      <header className={`w-full border-b shrink-0 ${isDark ? 'bg-[#0D1117] border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="max-w-6xl mx-auto px-3.5 sm:px-8 h-11 sm:h-14 flex items-center justify-between gap-4 sm:gap-8">
          <div className={`text-sm sm:text-lg font-bold tracking-tight whitespace-nowrap shrink-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t[lang].brandTitle}
          </div>
          <nav className={`hidden md:flex items-center gap-6 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className={`font-medium whitespace-nowrap shrink-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t[lang].calibTitle}
            </span>
            <a
              href="http://dotienson.com/app"
              target="_blank"
              rel="noopener noreferrer"
              className={`transition-colors whitespace-nowrap shrink-0 ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}
            >
              Chipkevitch 1996
            </a>
          </nav>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Light mode' : 'Dark mode'}
              className={`min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg transition-colors ${
                isDark ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onToggleLang}
              className={`min-h-[38px] px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'vi' ? 'VI / EN' : 'EN / VI'}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Portrait Layout: Visual Reference Stage Immediately Above the Fold + Compact Sticky Thumb CTA */}
      <main className="lg:hidden flex-1 flex flex-col justify-between px-3.5 py-3 pb-22 space-y-3.5 max-w-lg mx-auto w-full">
        <div className="space-y-2.5">
          <div>
            <p className={`text-[11px] font-medium flex items-center gap-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
              <Ruler className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t[lang].appName}</span>
            </p>
            <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t[lang].calibTitle}
            </h1>
          </div>
          {renderMethodTabs()}
        </div>

        {renderVisualCalibStage()}

        <div className={`border rounded-2xl p-3.5 ${isDark ? 'bg-[#11151B] border-white/10' : 'bg-white border-slate-200'}`}>
          {renderModeSelector()}
        </div>

        <div className={`text-center text-[11px] space-y-0.5 pt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <div>{t[lang].author}</div>
          <div className="tabular-nums text-[10px] opacity-80">J Urol. 1996;156(6):2050-3</div>
        </div>

        {/* Mobile Sticky Thumb CTA */}
        <div
          style={{ paddingBottom: 'calc(var(--sab) + 0.625rem)' }}
          className={`fixed bottom-0 left-0 right-0 px-3.5 pt-2.5 border-t z-30 ${
            isDark ? 'bg-[#0D1117] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              triggerHaptic(40);
              onConfirmCalibrate();
            }}
            className="w-full max-w-lg mx-auto min-h-[46px] px-4 py-2.5 bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{t[lang].confirmCalib}</span>
          </button>
        </div>
      </main>

      {/* Desktop 2-Column Architectural Split */}
      <main className="hidden lg:flex flex-1 w-full max-w-6xl mx-auto px-8 py-10 items-center">
        <div
          className={`w-full border rounded-2xl grid grid-cols-12 overflow-hidden ${
            isDark ? 'bg-[#11151B] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div
            className={`col-span-5 p-8 border-r flex flex-col justify-between gap-6 ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <div className="space-y-6">
              <div className="space-y-1.5">
                <div className={`flex items-center gap-2 text-xs font-medium ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                  <Ruler className="w-4 h-4" />
                  <span>{t[lang].appName}</span>
                </div>
                <h1 className={`text-2xl font-bold tracking-tight [text-wrap:balance] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t[lang].calibTitle}
                </h1>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {t[lang].calibDesc}
                </p>
              </div>

              <div className="space-y-2">
                <span className={`block text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t[lang].calibMethodPrefix}
                </span>
                {renderMethodTabs()}
              </div>

              {renderModeSelector()}
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(40);
                onConfirmCalibrate();
              }}
              className="w-full min-h-[48px] px-4 py-3 bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Check className="w-4 h-4" />
              <span>{t[lang].confirmCalib}</span>
            </button>
          </div>

          <div
            className={`col-span-7 p-8 flex flex-col items-center justify-center min-h-[380px] ${
              isDark ? 'bg-[#090B0E]' : 'bg-[#F4F6F9]'
            }`}
          >
            {renderVisualCalibStage()}
          </div>
        </div>
      </main>

      {/* Desktop Footer */}
      <footer className={`hidden lg:block w-full border-t ${isDark ? 'bg-[#0D1117] border-white/10' : 'bg-white border-slate-200'}`}>
        <div className={`max-w-6xl mx-auto px-8 py-4 flex items-center justify-between gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <div className="flex items-center gap-2">
            <a
              href="https://tamanhhospital.vn/chuyen-gia/do-tien-son/"
              target="_blank"
              rel="noopener noreferrer"
              className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}
            >
              {t[lang].author}
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="http://dotienson.com/app"
              target="_blank"
              rel="noopener noreferrer"
              className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}
            >
              {t[lang].worldFirst}
            </a>
          </div>
          <span className="tabular-nums text-[11px] opacity-80">
            J Urol. 1996;156(6):2050-3
          </span>
        </div>
      </footer>
    </div>
  );
}

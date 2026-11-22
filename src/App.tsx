import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  Lock,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import {
  CARD_WIDTH_MM,
  ORCHIDOMETER_DATA,
  RULER_LENGTH_MM,
  VOLUMES,
  getStageStyle,
  triggerHaptic,
  t,
  type CalibMethod,
  type DisplayMode,
  type Language,
  type ThemeMode,
} from './data/orchidometer';
import { Ellipsoid2D } from './components/Ellipsoid2D';
import { Orchidometer3DBeads } from './components/Orchidometer3DBeads';
import { CalibrationView } from './components/CalibrationView';

export default function App() {
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [consentDeclined, setConsentDeclined] = useState(false);
  const [isCodeEntered, setIsCodeEntered] = useState(false);
  const [account, setAccount] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [loginPremiumCode, setLoginPremiumCode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [pixelsPerMm, setPixelsPerMm] = useState<number | null>(null);
  const [currentVolumeIdx, setCurrentVolumeIdx] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [calibrationWidth, setCalibrationWidth] = useState(250);
  const [calibMethod, setCalibMethod] = useState<CalibMethod>('screen');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('vertical');
  const [screenInches, setScreenInches] = useState<number>(6.5);
  const [selectedDevice, setSelectedDevice] = useState<number>(6.5);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>('vi');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [lastCalibMethod, setLastCalibMethod] = useState<CalibMethod | null>(null);
  const [lastCalibTime, setLastCalibTime] = useState<string | null>(null);
  const [hasCalibratedThisSession, setHasCalibratedThisSession] = useState(false);
  const [is3DShading, setIs3DShading] = useState<boolean>(true);
  const [controlsCollapsed, setControlsCollapsed] = useState<boolean>(false);

  // VIP / 3D Bead Chain Unlock States (code: 6868)
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
  const [premiumCode, setPremiumCode] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [premiumError, setPremiumError] = useState(false);

  const volumeBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isDark = theme === 'dark';

  const handleToggleFocus = (targetId: string | null) => {
    triggerHaptic(targetId ? 45 : 30);
    setFocusedId(targetId);
  };

  const toggleLanguage = () => {
    const next: Language = lang === 'vi' ? 'en' : 'vi';
    setLang(next);
    localStorage.setItem('orchidometer_lang', next);
  };

  const toggleTheme = () => {
    triggerHaptic(20);
    setTheme((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('orchidometer_theme', next);
      return next;
    });
  };

  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        focusedId ? '#000000' : theme === 'dark' ? '#090B0E' : '#F4F6F9'
      );
    }
    document.body.className = focusedId
      ? 'bg-black text-slate-100 antialiased selection:bg-teal-500 selection:text-white'
      : theme === 'dark'
      ? 'bg-[#090B0E] text-slate-100 antialiased selection:bg-teal-500 selection:text-white'
      : 'bg-[#F4F6F9] text-slate-900 antialiased selection:bg-teal-600 selection:text-white';
  }, [focusedId, theme]);

  useEffect(() => {
    const activeBtn = volumeBtnRefs.current[currentVolumeIdx];
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentVolumeIdx, displayMode, controlsCollapsed]);

  useEffect(() => {
    const savedPpm = localStorage.getItem('orchidometer_ppm');
    const savedMode = localStorage.getItem('orchidometer_mode') as DisplayMode | null;
    const savedMethod = localStorage.getItem('orchidometer_calib_method') as CalibMethod | null;
    const savedTime = localStorage.getItem('orchidometer_calib_time');
    const savedVip = localStorage.getItem('orchidometer_vip') === 'true';

    if (savedVip) {
      setIsPremiumUnlocked(true);
    }
    if (savedPpm) {
      setPixelsPerMm(parseFloat(savedPpm));
      setIsCalibrated(true);
    }
    if (savedMethod) setLastCalibMethod(savedMethod);
    if (savedTime) setLastCalibTime(savedTime);
    if (savedMode) {
      if (savedMode === 'beads' && !savedVip) {
        setDisplayMode('vertical');
      } else {
        setDisplayMode(savedMode);
      }
    }
    const savedLang = localStorage.getItem('orchidometer_lang') as Language | null;
    if (savedLang) setLang(savedLang);

    const savedTheme = localStorage.getItem('orchidometer_theme') as ThemeMode | null;
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    }

    const savedAccount = localStorage.getItem('orchidometer_account');
    if (savedAccount) setAccount(savedAccount);

    const saved3D = localStorage.getItem('orchidometer_3d');
    if (saved3D !== null) setIs3DShading(saved3D === 'true');
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedAccount = account.trim();
    const trimmedPasscode = promoCode.trim();
    const trimmedPremium = loginPremiumCode.trim();

    if (!trimmedAccount) {
      setLoginError(t[lang].accountRequired);
      triggerHaptic(40);
      return;
    }

    if (!(trimmedPasscode.endsWith('6') || trimmedPasscode.endsWith('8'))) {
      setLoginError(t[lang].passcodeInvalid);
      triggerHaptic(45);
      return;
    }

    if (trimmedPremium && trimmedPremium !== '6868') {
      setLoginError(t[lang].premiumInvalidLogin);
      triggerHaptic(45);
      return;
    }

    setLoginError(null);
    localStorage.setItem('orchidometer_account', trimmedAccount);

    if (trimmedPremium === '6868') {
      setIsPremiumUnlocked(true);
      localStorage.setItem('orchidometer_vip', 'true');
      setShowSuccess(true);
      triggerHaptic([70, 35, 70]);
      setTimeout(() => setShowSuccess(false), 3200);
    } else {
      triggerHaptic(35);
    }

    setIsCodeEntered(true);
  };

  const handleCalibrate = () => {
    let ppm = 1;
    if (calibMethod === 'screen') {
      const w = window.screen.width;
      const h = window.screen.height;
      const diagPx = Math.sqrt(w * w + h * h);
      const cssPpi = diagPx / screenInches;
      ppm = cssPpi / 25.4;
    } else {
      ppm =
        calibMethod === 'card'
          ? calibrationWidth / CARD_WIDTH_MM
          : calibrationWidth / RULER_LENGTH_MM;
    }
    setPixelsPerMm(ppm);
    setIsCalibrated(true);
    setHasCalibratedThisSession(true);

    const now = new Date();
    const timeStr = `${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    setLastCalibMethod(calibMethod);
    setLastCalibTime(timeStr);

    localStorage.setItem('orchidometer_ppm', ppm.toString());
    localStorage.setItem('orchidometer_mode', displayMode);
    localStorage.setItem('orchidometer_calib_method', calibMethod);
    localStorage.setItem('orchidometer_calib_time', timeStr);
  };

  const resetCalibration = () => {
    setFocusedId(null);
    setIsCalibrated(false);
    localStorage.removeItem('orchidometer_ppm');
    localStorage.removeItem('orchidometer_calib_method');
    localStorage.removeItem('orchidometer_calib_time');
  };

  const nextVolume = () => {
    setCurrentVolumeIdx((prev) => (prev + 1) % VOLUMES.length);
    triggerHaptic(35);
  };

  const prevVolume = () => {
    setCurrentVolumeIdx((prev) => (prev - 1 + VOLUMES.length) % VOLUMES.length);
    triggerHaptic(35);
  };

  const handleSwitchMode = (mode: DisplayMode) => {
    setFocusedId(null);
    if (mode === 'beads' && !isPremiumUnlocked) {
      setShowPremiumPrompt(true);
      return;
    }
    triggerHaptic(30);
    setDisplayMode(mode);
    localStorage.setItem('orchidometer_mode', mode);
  };

  // Gate 0: Consent Declined
  if (consentDeclined) {
    return (
      <div
        style={{
          paddingTop: 'var(--sat)',
          paddingBottom: 'var(--sab)',
          paddingLeft: 'var(--sal)',
          paddingRight: 'var(--sar)',
        }}
        className={`min-h-dvh flex items-center justify-center p-4 ${
          isDark ? 'bg-[#090B0E] text-slate-100' : 'bg-[#F4F6F9] text-slate-900'
        }`}
      >
        <div
          className={`p-5 rounded-2xl max-w-[356px] w-full border space-y-3.5 ${
            isDark ? 'bg-[#11151B] border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className={`w-5 h-5 shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
            <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t[lang].declinedTitle}
            </h2>
          </div>
          <p className={`text-[13px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t[lang].declinedDesc}
          </p>
          <a
            href="https://tamanhhospital.vn/chuyen-gia/do-tien-son/"
            className={`min-h-[44px] w-full px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center ${
              isDark
                ? 'bg-white text-slate-950 hover:bg-slate-200'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {t[lang].exit}
          </a>
        </div>
      </div>
    );
  }

  // Gate 1: Streamlined Professional Clinical Notice (no nested box-inside-box)
  if (!hasConsented) {
    return (
      <div
        style={{
          paddingTop: 'var(--sat)',
          paddingBottom: 'var(--sab)',
          paddingLeft: 'var(--sal)',
          paddingRight: 'var(--sar)',
        }}
        className={`min-h-dvh flex items-center justify-center p-4 ${
          isDark ? 'bg-[#090B0E] text-slate-100' : 'bg-[#F4F6F9] text-slate-900'
        }`}
      >
        <div
          className={`p-4 sm:p-5 rounded-2xl max-w-[356px] w-full border space-y-3.5 ${
            isDark ? 'bg-[#11151B] border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div
            className={`flex items-center justify-between gap-2 pb-2.5 border-b ${
              isDark ? 'border-white/10' : 'border-slate-200/80'
            }`}
          >
            <span
              className={`text-xs font-semibold truncate ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {t[lang].brandTitle} · {t[lang].appName}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={toggleTheme}
                className={`min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg transition-colors ${
                  isDark
                    ? 'text-slate-300 hover:text-white bg-[#1A2029]'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80'
                }`}
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={toggleLanguage}
                className={`min-h-[32px] px-2.5 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  isDark
                    ? 'text-slate-300 hover:text-white bg-[#1A2029]'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80'
                }`}
              >
                {lang === 'vi' ? 'VI / EN' : 'EN / VI'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
              />
              <h1
                className={`text-[15px] font-bold tracking-tight leading-snug ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {t[lang].consentTitle}
              </h1>
            </div>

            <div className="space-y-1.5">
              <p
                className={`text-[13px] font-semibold leading-snug ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                {t[lang].consentWarning1}
              </p>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {t[lang].consentWarning2}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setConsentDeclined(true)}
              className={`flex-1 min-h-[42px] py-2 px-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap active:scale-[0.99] ${
                isDark
                  ? 'bg-[#1A2029] hover:bg-[#222A36] text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {t[lang].cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(30);
                setHasConsented(true);
              }}
              className={`flex-[1.35] min-h-[42px] py-2 px-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap active:scale-[0.99] ${
                isDark
                  ? 'bg-teal-500 hover:bg-teal-400 text-slate-950'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
            >
              {t[lang].confirm}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gate 2: Clinical Account + Passcode + Optional Premium Code Login
  if (hasConsented && !isCodeEntered) {
    return (
      <div
        style={{
          paddingTop: 'var(--sat)',
          paddingBottom: 'var(--sab)',
          paddingLeft: 'var(--sal)',
          paddingRight: 'var(--sar)',
        }}
        className={`min-h-dvh flex items-center justify-center p-4 ${
          isDark ? 'bg-[#090B0E] text-slate-100' : 'bg-[#F4F6F9] text-slate-900'
        }`}
      >
        <form
          onSubmit={handleLoginSubmit}
          noValidate
          className={`p-4 sm:p-5 rounded-2xl max-w-[360px] w-full border space-y-3.5 ${
            isDark ? 'bg-[#11151B] border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div
            className={`flex items-start justify-between gap-2 pb-2.5 border-b ${
              isDark ? 'border-white/10' : 'border-slate-200/80'
            }`}
          >
            <div className="min-w-0">
              <h1
                className={`text-base font-bold tracking-tight truncate ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {t[lang].promoTitle}
              </h1>
              <p
                className={`text-xs leading-snug mt-0.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {t[lang].promoDesc}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={toggleTheme}
                className={`min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg transition-colors ${
                  isDark
                    ? 'text-slate-300 hover:text-white bg-[#1A2029]'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80'
                }`}
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={toggleLanguage}
                className={`min-h-[32px] px-2 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  isDark
                    ? 'text-slate-300 hover:text-white bg-[#1A2029]'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80'
                }`}
              >
                {lang === 'vi' ? 'VI' : 'EN'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {/* Account */}
            <div className="space-y-1">
              <label
                htmlFor="login-account"
                className={`block text-xs font-semibold ${
                  isDark ? 'text-slate-200' : 'text-slate-700'
                }`}
              >
                {t[lang].accountLabel}
              </label>
              <input
                id="login-account"
                autoFocus={!account}
                type="text"
                autoComplete="username"
                placeholder={t[lang].accountPlaceholder}
                value={account}
                onChange={(e) => {
                  setAccount(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                className={`w-full min-h-[42px] border rounded-xl py-2 px-3 text-sm font-medium focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-[#090B0E] border-white/15 text-white placeholder:text-slate-500 focus:border-teal-400'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white'
                }`}
              />
            </div>

            {/* Passcode */}
            <div className="space-y-1">
              <label
                htmlFor="login-passcode"
                className={`block text-xs font-semibold ${
                  isDark ? 'text-slate-200' : 'text-slate-700'
                }`}
              >
                {t[lang].passcodeLabel}
              </label>
              <div className="relative">
                <input
                  id="login-passcode"
                  autoFocus={Boolean(account)}
                  type={showPasscode ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="current-password"
                  placeholder={t[lang].passcodePlaceholder}
                  value={promoCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setPromoCode(val);
                    if (loginError) setLoginError(null);
                  }}
                  className={`w-full min-h-[42px] border rounded-xl py-2 pl-3 pr-10 tabular-nums text-sm font-semibold tracking-wider placeholder:tracking-normal placeholder:font-normal focus:outline-none transition-colors ${
                    isDark
                      ? 'bg-[#090B0E] border-white/15 text-white placeholder:text-slate-500 focus:border-teal-400'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white'
                  }`}
                />
                <button
                  type="button"
                  aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                  onClick={() => setShowPasscode((v) => !v)}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg transition-colors ${
                    isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Optional Premium Code */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="login-premium"
                  className={`text-xs font-semibold ${
                    isDark ? 'text-slate-200' : 'text-slate-700'
                  }`}
                >
                  {t[lang].premiumCodeLabel}
                </label>
                <span
                  className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  {t[lang].premiumOptionalHint}
                </span>
              </div>
              <input
                id="login-premium"
                type="text"
                inputMode="numeric"
                placeholder={t[lang].premiumCodePlaceholder}
                value={loginPremiumCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setLoginPremiumCode(val);
                  if (loginError) setLoginError(null);
                }}
                className={`w-full min-h-[42px] border rounded-xl py-2 px-3 tabular-nums text-sm font-medium focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-[#090B0E] border-white/15 text-white placeholder:text-slate-500 focus:border-teal-400'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white'
                }`}
              />
            </div>
          </div>

          {loginError && (
            <p
              className={`text-xs border rounded-xl px-3 py-2 leading-snug ${
                isDark
                  ? 'text-red-200 bg-red-950/60 border-red-800/60'
                  : 'text-red-700 bg-red-50 border-red-200'
              }`}
            >
              {loginError}
            </p>
          )}

          <button
            type="submit"
            className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.99] flex items-center justify-center gap-2 whitespace-nowrap ${
              isDark
                ? 'bg-teal-500 hover:bg-teal-400 text-slate-950'
                : 'bg-teal-600 hover:bg-teal-700 text-white'
            }`}
          >
            <Lock className="w-4 h-4 shrink-0" />
            <span>{t[lang].loginButton}</span>
          </button>
        </form>
      </div>
    );
  }

  // Gate 3: Physical Screen Calibration
  if (!isCalibrated) {
    return (
      <CalibrationView
        lang={lang}
        onToggleLang={toggleLanguage}
        theme={theme}
        onToggleTheme={toggleTheme}
        calibMethod={calibMethod}
        setCalibMethod={setCalibMethod}
        calibrationWidth={calibrationWidth}
        setCalibrationWidth={setCalibrationWidth}
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        screenInches={screenInches}
        setScreenInches={setScreenInches}
        selectedDevice={selectedDevice}
        setSelectedDevice={setSelectedDevice}
        isPremiumUnlocked={isPremiumUnlocked}
        setIsPremiumUnlocked={setIsPremiumUnlocked}
        showPremiumPrompt={showPremiumPrompt}
        setShowPremiumPrompt={setShowPremiumPrompt}
        premiumCode={premiumCode}
        setPremiumCode={setPremiumCode}
        premiumError={premiumError}
        setPremiumError={setPremiumError}
        onUnlockSuccess={() => {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3200);
        }}
        onConfirmCalibrate={handleCalibrate}
      />
    );
  }

  const currentVolume = VOLUMES[currentVolumeIdx];
  const [lengthMm, widthMm] = ORCHIDOMETER_DATA[currentVolume];
  const ppm = pixelsPerMm || 1;
  const stageStyle = getStageStyle(currentVolume);
  const isFocused = focusedId !== null;
  const isBeads3D = displayMode === 'beads';

  const calibMethodLabel =
    lastCalibMethod === 'ruler'
      ? t[lang].calibMethodRuler
      : lastCalibMethod === 'card'
      ? t[lang].calibMethodCard
      : t[lang].calibMethodScreen;

  return (
    <div
      style={{
        paddingLeft: 'var(--sal)',
        paddingRight: 'var(--sar)',
      }}
      className={`h-dvh flex flex-col overflow-hidden transition-colors duration-300 ${
        isFocused
          ? 'bg-black text-slate-100'
          : isDark
          ? 'bg-[#090B0E] text-slate-100'
          : 'bg-[#F4F6F9] text-slate-900'
      }`}
    >
      {/* Top Bar — Compact 44px on Mobile Portrait, 3-Zone Contract */}
      {!isFocused && (
        <header
          style={{ paddingTop: 'var(--sat)' }}
          className={`w-full border-b shrink-0 z-30 ${
            isDark ? 'bg-[#0D1117] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-8 h-11 sm:h-14 flex items-center justify-between gap-2 sm:gap-8">
            <span
              className={`text-sm sm:text-lg font-bold tracking-tight whitespace-nowrap shrink-0 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {t[lang].brandTitle}
            </span>

            <nav
              className={`flex items-center gap-2 sm:gap-5 text-xs sm:text-sm ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              <button
                type="button"
                onClick={() => setShowInfo(true)}
                className={`min-h-[38px] px-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  isDark ? 'hover:text-white' : 'hover:text-slate-900'
                }`}
              >
                {t[lang].guideButton}
              </button>
              <button
                type="button"
                onClick={resetCalibration}
                className={`min-h-[38px] px-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  isDark ? 'hover:text-white' : 'hover:text-slate-900'
                }`}
              >
                {t[lang].recalibrateButton}
              </button>
              <button
                type="button"
                onClick={toggleLanguage}
                className={`hidden sm:inline-flex items-center min-h-[38px] px-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  isDark ? 'hover:text-white' : 'hover:text-slate-900'
                }`}
              >
                {lang === 'vi' ? 'VI / EN' : 'EN / VI'}
              </button>
            </nav>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={toggleTheme}
                className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border transition-colors shrink-0 ${
                  isDark
                    ? 'bg-[#161B22] border-white/10 text-slate-300 hover:text-white hover:bg-[#1E2530]'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {!isBeads3D ? (
                <button
                  type="button"
                  onClick={() => {
                    setIs3DShading((prev) => {
                      const next = !prev;
                      localStorage.setItem('orchidometer_3d', next ? 'true' : 'false');
                      return next;
                    });
                    triggerHaptic(30);
                  }}
                  className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg active:scale-[0.98] transition-all whitespace-nowrap shrink-0 ${
                    isDark
                      ? 'bg-white text-slate-950 hover:bg-slate-200'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {is3DShading ? t[lang].toggle3D : t[lang].toggle2D}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleFocus(`beads3d-${currentVolume}`)}
                  className={`min-h-[36px] px-3.5 py-1.5 text-xs font-semibold rounded-lg active:scale-[0.98] transition-all whitespace-nowrap shrink-0 ${
                    isDark
                      ? 'bg-teal-500 text-slate-950 hover:bg-teal-400'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                >
                  Focus
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Calibrated Stage */}
      <main
        className="flex-1 relative flex flex-col items-center justify-center overflow-hidden"
        onClick={() => {
          if (isFocused) handleToggleFocus(null);
        }}
      >
        {isBeads3D ? (
          <Orchidometer3DBeads
            currentVolumeIdx={currentVolumeIdx}
            onChangeVolumeIdx={setCurrentVolumeIdx}
            pixelsPerMm={ppm}
            focusedId={focusedId}
            onToggleFocus={handleToggleFocus}
            lang={lang}
            theme={theme}
            controlsCollapsed={controlsCollapsed}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center px-3 sm:px-4 py-3 sm:py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentVolume}-${displayMode}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-5 sm:gap-9 max-w-full"
              >
                {displayMode === 'triple' ? (
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.18}
                    onDragEnd={(_, { offset }) => {
                      if (offset.x < -30) {
                        setCurrentVolumeIdx((prev) => {
                          if (prev < VOLUMES.length - 1) triggerHaptic(35);
                          return Math.min(VOLUMES.length - 1, prev + 1);
                        });
                      } else if (offset.x > 30) {
                        setCurrentVolumeIdx((prev) => {
                          if (prev > 0) triggerHaptic(35);
                          return Math.max(0, prev - 1);
                        });
                      }
                    }}
                    className="flex flex-row items-center justify-center gap-3 sm:gap-10 px-2 max-w-full overflow-x-auto no-scrollbar touch-pan-y"
                  >
                    {[currentVolumeIdx - 1, currentVolumeIdx, currentVolumeIdx + 1].map((idx) => {
                      if (idx < 0 || idx >= VOLUMES.length) {
                        return <div key={`empty-${idx}`} className="w-10 sm:w-20 shrink-0" />;
                      }
                      const vol = VOLUMES[idx];
                      const [l, w] = ORCHIDOMETER_DATA[vol];
                      const st = getStageStyle(vol);
                      const isCenter = idx === currentVolumeIdx;
                      return (
                        <div key={vol} className="flex flex-col items-center shrink-0">
                          <Ellipsoid2D
                            id={`triple-${vol}`}
                            widthMm={w}
                            lengthMm={l}
                            ppm={ppm}
                            isHorizontal={false}
                            styleObj={st}
                            isFocused={focusedId === `triple-${vol}`}
                            isHidden={focusedId !== null && focusedId !== `triple-${vol}`}
                            onClick={handleToggleFocus}
                            is3D={is3DShading}
                            theme={theme}
                          />
                          <div
                            className={`mt-3 sm:mt-5 tabular-nums font-bold ${
                              isDark ? st.textClass : st.textLightClass
                            } ${
                              isCenter ? 'text-lg sm:text-2xl' : 'text-xs sm:text-base opacity-70'
                            } transition-opacity duration-300 ${
                              isFocused ? 'opacity-0' : 'opacity-100'
                            }`}
                          >
                            {vol} mL
                          </div>
                          <div
                            className={`tabular-nums mt-0.5 ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            } ${
                              isCenter ? 'text-[11px] sm:text-xs' : 'text-[10px] opacity-60'
                            } transition-opacity duration-300 ${
                              isFocused ? 'opacity-0' : 'opacity-100'
                            }`}
                          >
                            {w} × {l} mm
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <div
                    className={`flex ${
                      displayMode === 'both'
                        ? 'flex-wrap items-center justify-center gap-5 sm:gap-16'
                        : 'flex-col items-center justify-center'
                    }`}
                  >
                    {(displayMode === 'vertical' || displayMode === 'both') && (
                      <Ellipsoid2D
                        id="vertical"
                        widthMm={widthMm}
                        lengthMm={lengthMm}
                        ppm={ppm}
                        isHorizontal={false}
                        styleObj={stageStyle}
                        isFocused={focusedId === 'vertical'}
                        isHidden={focusedId !== null && focusedId !== 'vertical'}
                        onClick={handleToggleFocus}
                        is3D={is3DShading}
                        theme={theme}
                      />
                    )}
                    {(displayMode === 'horizontal' || displayMode === 'both') && (
                      <Ellipsoid2D
                        id="horizontal"
                        widthMm={widthMm}
                        lengthMm={lengthMm}
                        ppm={ppm}
                        isHorizontal={true}
                        styleObj={stageStyle}
                        isFocused={focusedId === 'horizontal'}
                        isHidden={focusedId !== null && focusedId !== 'horizontal'}
                        onClick={handleToggleFocus}
                        is3D={is3DShading}
                        theme={theme}
                      />
                    )}
                  </div>
                )}

                {displayMode !== 'triple' && !isFocused && (
                  <div className="text-center space-y-1">
                    <div className="flex items-baseline justify-center gap-1.5 tabular-nums">
                      <span
                        className={`text-4xl sm:text-6xl font-bold tracking-tight leading-none ${
                          isDark ? stageStyle.textClass : stageStyle.textLightClass
                        }`}
                      >
                        {currentVolume}
                      </span>
                      <span
                        className={`text-base sm:text-xl font-medium ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        mL
                      </span>
                    </div>
                    <div
                      className={`tabular-nums text-xs sm:text-sm font-medium ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      {widthMm} × {lengthMm} mm
                    </div>
                    <div
                      className={`text-xs flex items-center justify-center gap-2 pt-0.5 ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      <span className={`inline-block w-2 h-2 rounded-xs ${stageStyle.swatchClass}`} />
                      <span>
                        {currentVolume <= 3
                          ? t[lang].stagePrepubertal
                          : currentVolume === 4
                          ? t[lang].stageOnset
                          : currentVolume <= 12
                          ? t[lang].stagePubertal
                          : t[lang].stageAdult}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Focus Mode Exit Cue */}
        {isFocused && (
          <div className="pointer-events-none fixed bottom-6 left-0 right-0 text-center text-xs text-white/45 z-50">
            {t[lang].focusExitHint}
          </div>
        )}
      </main>

      {/* Collapsible Bottom Control Dock — Compact Mobile Thumb Zone */}
      {!isFocused && (
        <div
          style={{ paddingBottom: 'var(--sab)' }}
          className={`w-full border-t shrink-0 z-30 ${
            isDark ? 'bg-[#0D1117] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div
            className={`w-full border-b ${
              !hasCalibratedThisSession
                ? isDark
                  ? 'bg-red-950/75 border-red-500/35'
                  : 'bg-red-50 border-red-200'
                : isDark
                ? 'border-white/5'
                : 'border-slate-100'
            }`}
          >
            <div className="max-w-5xl mx-auto px-3 py-1 flex items-center justify-between gap-2">
              <div className="tabular-nums text-[11px] truncate min-w-0">
                {!hasCalibratedThisSession ? (
                  <button
                    type="button"
                    onClick={resetCalibration}
                    className={`min-h-[28px] font-medium inline-flex items-center gap-1.5 max-w-full ${
                      isDark
                        ? 'text-red-200 hover:text-white'
                        : 'text-red-700 hover:text-red-900'
                    }`}
                  >
                    <AlertTriangle
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isDark ? 'text-red-400' : 'text-red-600'
                      }`}
                    />
                    <span className="truncate">{t[lang].calibWarning}</span>
                  </button>
                ) : (
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                    {Math.round(ppm * 10) / 10} px/mm
                    {lastCalibMethod && lastCalibTime
                      ? ` · ${calibMethodLabel} · ${lastCalibTime}`
                      : ''}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setControlsCollapsed((c) => !c)}
                className={`min-h-[28px] px-2 text-[11px] font-medium flex items-center gap-1 transition-colors shrink-0 whitespace-nowrap ${
                  isDark
                    ? 'text-slate-300 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {controlsCollapsed ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>{t[lang].controlsShow}</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>{t[lang].controlsHide}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {!controlsCollapsed && (
            <div className="max-w-5xl mx-auto px-2.5 sm:px-6 py-2 space-y-1.5">
              {/* Row 1: Thumb Stepper + Auto-Centered Volume Rail */}
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                <button
                  type="button"
                  aria-label="Previous volume"
                  onClick={prevVolume}
                  className={`min-h-[44px] min-w-[44px] border rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                    isDark
                      ? 'bg-[#161B22] hover:bg-[#1E2530] border-white/10 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex-1 flex items-center justify-start sm:justify-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
                  {VOLUMES.map((v, idx) => {
                    const active = idx === currentVolumeIdx;
                    return (
                      <button
                        key={v}
                        ref={(el) => {
                          volumeBtnRefs.current[idx] = el;
                        }}
                        type="button"
                        onClick={() => {
                          triggerHaptic(25);
                          setCurrentVolumeIdx(idx);
                        }}
                        className={`min-h-[38px] min-w-[36px] px-2 tabular-nums text-xs rounded-lg transition-colors shrink-0 ${
                          active
                            ? isDark
                              ? 'bg-teal-500 text-slate-950 font-bold'
                              : 'bg-teal-600 text-white font-bold'
                            : isDark
                            ? 'text-slate-400 font-medium hover:text-white hover:bg-white/5'
                            : 'text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  aria-label="Next volume"
                  onClick={nextVolume}
                  className={`min-h-[44px] min-w-[44px] border rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                    isDark
                      ? 'bg-[#161B22] hover:bg-[#1E2530] border-white/10 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Row 2: Single-Line Segmented Mode Rail */}
              <div
                className={`flex items-center justify-start sm:justify-center gap-1 overflow-x-auto no-scrollbar p-1 rounded-xl ${
                  isDark ? 'bg-[#161B22]' : 'bg-slate-100'
                }`}
              >
                {(
                  [
                    { id: 'vertical', label: t[lang].vertical },
                    { id: 'horizontal', label: t[lang].horizontal },
                    { id: 'both', label: t[lang].both },
                    { id: 'triple', label: t[lang].triple },
                    { id: 'beads', label: t[lang].beads, locked: !isPremiumUnlocked },
                  ] as { id: DisplayMode; label: string; locked?: boolean }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSwitchMode(m.id)}
                    className={`min-h-[36px] px-2.5 text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
                      displayMode === m.id
                        ? isDark
                          ? 'bg-white/15 text-white font-semibold'
                          : 'bg-white text-slate-900 font-semibold shadow-xs'
                        : isDark
                        ? 'text-slate-400 font-medium hover:text-slate-200'
                        : 'text-slate-600 font-medium hover:text-slate-900'
                    }`}
                  >
                    <span>{m.label}</span>
                    {m.locked && <Lock className="w-3 h-3 opacity-70" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIP Unlock Modal */}
      <AnimatePresence>
        {showPremiumPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 p-4 sm:p-5 flex items-center justify-center"
            onClick={() => setShowPremiumPrompt(false)}
          >
            <div
              className={`border rounded-2xl p-4 sm:p-5 max-w-[320px] w-full space-y-3 ${
                isDark ? 'bg-[#11151B] border-white/15' : 'bg-white border-slate-200 shadow-lg'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                      isDark
                        ? 'bg-teal-500/12 border-teal-400/25 text-teal-400'
                        : 'bg-teal-50 border-teal-200 text-teal-600'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                  </div>
                  <h3
                    className={`text-sm sm:text-base font-bold truncate ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {t[lang].premiumPromptTitle}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPremiumPrompt(false)}
                  className={`min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg shrink-0 ${
                    isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-400 hover:text-slate-900'
                  }`}
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
                    localStorage.setItem('orchidometer_mode', 'beads');
                    setPremiumError(false);
                    setShowSuccess(true);
                    triggerHaptic([80, 40, 80]);
                    setTimeout(() => setShowSuccess(false), 3200);
                  } else if (val.length >= 4) {
                    setPremiumError(true);
                    triggerHaptic(50);
                  } else {
                    setPremiumError(false);
                  }
                }}
                className={`w-full min-h-[46px] border rounded-xl py-2.5 px-3 text-center tabular-nums text-lg font-bold tracking-[0.22em] placeholder:tracking-normal placeholder:font-normal placeholder:text-sm focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-[#090B0E] border-white/15 text-white placeholder:text-slate-500 focus:border-teal-400'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white'
                }`}
              />
              {premiumError && (
                <p
                  className={`text-xs border rounded-xl px-3 py-2 ${
                    isDark
                      ? 'text-red-200 bg-red-950/60 border-red-800/60'
                      : 'text-red-700 bg-red-50 border-red-200'
                  }`}
                >
                  {t[lang].premiumError}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast Banner (top-aligned below header so it never overlaps mobile thumb dock) */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl font-semibold text-xs z-50 flex items-center gap-2 whitespace-nowrap max-w-[calc(100vw-2rem)] ${
              isDark ? 'bg-teal-500 text-slate-950' : 'bg-teal-600 text-white shadow-md'
            }`}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span className="truncate">{t[lang].premiumSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clinical Protocol Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 p-3.5 sm:p-6 flex items-center justify-center"
            onClick={() => setShowInfo(false)}
          >
            <div
              className={`p-5 sm:p-6 rounded-2xl max-w-lg w-full border space-y-4 max-h-[86dvh] overflow-y-auto ${
                isDark
                  ? 'bg-[#11151B] border-white/15'
                  : 'bg-white border-slate-200 shadow-lg'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <h2
                  className={`text-base sm:text-lg font-bold ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {t[lang].guideTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowInfo(false)}
                  className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg ${
                    isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ol
                className={`space-y-2.5 sm:space-y-3 text-xs sm:text-sm leading-relaxed ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {[
                  t[lang].guide1,
                  t[lang].guide2,
                  t[lang].guide3,
                  t[lang].guide4,
                  t[lang].guide5,
                ].map((step, i) => (
                  <li key={i} className="flex gap-2.5 sm:gap-3">
                    <span
                      className={`tabular-nums text-xs font-semibold mt-0.5 shrink-0 ${
                        isDark ? 'text-teal-400' : 'text-teal-600'
                      }`}
                    >
                      0{i + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <div
                className={`p-3 border rounded-xl text-xs leading-relaxed space-y-2 ${
                  isDark
                    ? 'bg-[#090B0E] border-white/10 text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <p>{t[lang].guideNote}</p>
                <p className={isDark ? 'text-slate-500' : 'text-slate-500'}>{t[lang].reference}</p>
              </div>

              <div
                className={`flex flex-wrap items-center justify-between gap-2 text-xs pt-1 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <a
                  href="https://tamanhhospital.vn/chuyen-gia/do-tien-son/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`transition-colors min-h-[36px] inline-flex items-center ${
                    isDark ? 'hover:text-white' : 'hover:text-slate-900'
                  }`}
                >
                  {t[lang].author}
                </a>
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className={`transition-colors min-h-[36px] px-2 font-medium ${
                    isDark ? 'hover:text-white' : 'hover:text-slate-900'
                  }`}
                >
                  {lang === 'vi' ? 'Tiếng Việt / EN' : 'English / VI'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className={`w-full min-h-[46px] rounded-xl font-semibold text-sm transition-colors ${
                  isDark
                    ? 'bg-white text-slate-950 hover:bg-slate-200'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {t[lang].understood}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

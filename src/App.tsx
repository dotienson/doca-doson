/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Ruler, Info, ChevronLeft, ChevronRight, Check, RefreshCw, AlertTriangle, Crown } from 'lucide-react';

// Standard Orchidometer dimensions (Length x Width in mm)
// Volume (ml): [Length, Width]
const ORCHIDOMETER_DATA: Record<number, [number, number]> = {
  1: [14, 10],
  2: [18, 12],
  3: [21, 14],
  4: [23, 15],
  5: [25, 16],
  6: [27, 17],
  8: [30, 19],
  10: [32, 20],
  12: [34, 22],
  15: [37, 23],
  20: [41, 25],
  25: [45, 27],
};

const VOLUMES = Object.keys(ORCHIDOMETER_DATA).map(Number).sort((a, b) => a - b);

const t = {
  vi: {
    consentTitle: "Lưu ý quan trọng",
    consentWarning1: "Không chạm màn hình vào đối tượng khám;",
    consentWarning2: "Phương pháp so sánh hình ảnh chỉ mang tính sàng lọc khi không có sẵn dụng cụ khám, không thay thế siêu âm đo kích thước và thước Prader chuyên dụng",
    cancel: "Huỷ",
    confirm: "Xác nhận",
    declinedTitle: "Kết thúc phiên sử dụng",
    declinedDesc: "Ứng dụng sẽ không hoạt động khi người dùng không xác nhận về các lưu ý an toàn và chuyên môn",
    exit: "Thoát",
    calibTitle: "Hiệu chuẩn màn hình",
    calibDesc: "Chọn vật thể tham chiếu để đồng bộ kích thước thực tế (mm) với màn hình của bạn.",
    ruler: "Thước kẻ",
    card: "Thẻ ATM",
    screen: "Nhập Inch",
    displayMode: "Chế độ hiển thị",
    vertical: "Dọc",
    horizontal: "Ngang",
    both: "Cả 2",
    triple: "3 Kích thước",
    beads: "Chuỗi hạt",
    screenPrompt: "Chọn dòng máy của bạn hoặc nhập kích thước đường chéo màn hình.",
    cardPrompt: "Khớp viền thẻ vào đây",
    rulerPrompt: "Áp thước kẻ vật lý vào đoạn 5cm này",
    sliderHint: "Kéo thanh trượt hoặc dùng nút +/- để tinh chỉnh",
    confirmCalib: "Xác nhận hiệu chuẩn",
    author: "Sáng chế độc quyền của BS. Đỗ Tiến Sơn",
    worldFirst: "Orchidometer kĩ thuật số đầu tiên sử dụng phương pháp Chipkevitch",
    stage1: "Giai đoạn Tiền dậy thì",
    stage2: "Giai đoạn Dậy thì",
    stage3: "Giai đoạn Trưởng thành",
    subtitle: "BS. Đỗ Tiến Sơn (TAHN, ESPE)",
    guideTitle: "Hướng dẫn sử dụng",
    guide1: "Thông báo trẻ và gia đình quy trình đối chiếu theo quy trình",
    guide2: "Hiệu chuẩn màn hình với lựa chọn phù hợp, giải thích sơ bộ cho gia đình về các kích cỡ đối chiếu.",
    guide3: "Sát khuẩn tay; Đeo găng tay khám ở tay bộc lộ đối tượng. Tay còn lại cầm điện thoại song song với đối tượng cần so sánh. Không đeo găng tay ở tay cầm điện thoại. Nếu cần dùng 2 tay để bộc lộ đối tượng đối chiếu: Hãy báo người hỗ trợ cầm thiết bị.",
    guide4: "Sử dụng các nút mũi tên để thay đổi thể tích (ml). Chạm vào hình elip để vào Focus Mode.",
    guide5: "Thông báo kết quả khám sàng lọc. Có thể đối chiếu với thước Prader và Siêu âm khi có chỉ định.",
    guideNote: "Lưu ý: Kích thước elip trên màn hình đã được hiệu chuẩn theo mm thực tế. Luôn hiệu chuẩn trước mỗi lần sử dụng. Màn hình mặc định được cài đặt cho dòng iPhone 11 Pro Max.",
    understood: "Xác nhận",
    calibFactor: "Hệ số Hiệu chuẩn Màn hình",
    promoTitle: "Nhập mã kích hoạt",
    promoDesc: "Vui lòng nhập mã kích hoạt để tiếp tục sử dụng ứng dụng.",
    promoPlaceholder: "Nhập mã số..."
  },
  en: {
    consentTitle: "Important Notice",
    consentWarning1: "Do not touch the screen to the examination subject;",
    consentWarning2: "The image comparison method is for screening purposes only when examination tools are unavailable, and does not replace ultrasound sizing or a dedicated Prader orchidometer.",
    cancel: "Cancel",
    confirm: "Confirm",
    declinedTitle: "Session Ended",
    declinedDesc: "The application will not operate unless the user confirms the safety and professional notices.",
    exit: "Exit",
    calibTitle: "Screen Calibration",
    calibDesc: "Select a reference object to synchronize actual dimensions (mm) with your screen.",
    ruler: "Ruler",
    card: "Credit Card",
    screen: "Screen Size",
    displayMode: "Display Mode",
    vertical: "Vertical",
    horizontal: "Horizontal",
    both: "Both",
    triple: "3 Sizes",
    beads: "Beads",
    screenPrompt: "Select your device model or enter screen diagonal size.",
    cardPrompt: "Fit card edges here",
    rulerPrompt: "Align physical ruler to this 5cm segment",
    sliderHint: "Drag slider or use +/- to adjust",
    confirmCalib: "Confirm Calibration",
    author: "Exclusive invention by Dr. Do Tien Son",
    worldFirst: "The first digital Orchidometer using the Chipkevitch method",
    stage1: "Pre-pubertal Stage",
    stage2: "Pubertal Stage",
    stage3: "Adult Stage",
    subtitle: "Dr. Do Tien Son (TAHN, ESPE)",
    guideTitle: "Instructions for Use",
    guide1: "Inform the child and family of the comparison procedure.",
    guide2: "Calibrate the screen with the appropriate option, briefly explain the comparison sizes to the family.",
    guide3: "Sanitize hands; Wear an examination glove on the hand exposing the subject. Hold the phone parallel to the subject with the other hand. Do not wear a glove on the hand holding the phone. If two hands are needed to expose the subject: Ask an assistant to hold the device.",
    guide4: "Use the arrow buttons to change the volume (ml). Tap the ellipse to enter Focus Mode.",
    guide5: "Announce the screening results. Can be compared with a Prader orchidometer and Ultrasound when indicated.",
    guideNote: "Note: The ellipse size on the screen is calibrated to actual mm. Always calibrate before each use. The default screen is set for iPhone 11 Pro Max.",
    understood: "Confirm",
    calibFactor: "Standardized Calibration Active",
    promoTitle: "Enter Activation Code",
    promoDesc: "Please enter the activation code to continue using the application.",
    promoPlaceholder: "Enter code..."
  }
};

const DEVICE_PRESETS = [
  { name: 'Tùy chỉnh (Nhập tay)', size: 0 },
  { name: 'iPhone 12/13 mini', size: 5.4 },
  { name: 'iPhone X/XS/11 Pro', size: 5.8 },
  { name: 'iPhone 11/12/13/14/15/16', size: 6.1 },
  { name: 'iPhone 15/16 Pro', size: 6.1 },
  { name: 'iPhone 11 Pro Max/XS Max', size: 6.5 },
  { name: 'iPhone 12/13/14 Pro Max', size: 6.7 },
  { name: 'iPhone 14/15/16 Plus', size: 6.7 },
  { name: 'iPhone 15/16 Pro Max', size: 6.7 },
  { name: 'Galaxy S23/S24', size: 6.1 },
  { name: 'Galaxy S23+/S24+', size: 6.6 },
  { name: 'Galaxy S23/S24 Ultra', size: 6.8 },
];

const getStageStyle = (volume: number) => {
  if (volume <= 3) return {
    bg: 'from-emerald-400 to-emerald-600 border-emerald-300/50 shadow-emerald-500/30',
    text: 'text-emerald-500'
  };
  if (volume === 4) return {
    bg: 'from-red-400 to-red-600 border-red-300/50 shadow-red-500/30',
    text: 'text-red-500'
  };
  if (volume <= 12) return {
    bg: 'from-yellow-400 to-amber-500 border-yellow-300/50 shadow-amber-400/30',
    text: 'text-amber-500'
  };
  return {
    bg: 'from-orange-500 to-red-500 border-orange-400/50 shadow-red-500/30',
    text: 'text-red-500'
  };
};

const Ellipsoid = ({ id, widthMm, lengthMm, ppm, isHorizontal, styleObj, isFocused, isHidden, onClick }: any) => {
  const w = isHorizontal ? lengthMm : widthMm;
  const h = isHorizontal ? widthMm : lengthMm;
  
  return (
    <div className={`relative group flex items-center justify-center transition-opacity duration-500 ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <motion.div 
        onClick={(e: any) => { e.stopPropagation(); onClick(isFocused ? null : id); }}
        style={{ 
          width: `${w * ppm}px`, 
          height: `${h * ppm}px`,
        }}
        className={`bg-gradient-to-br ${styleObj.bg} rounded-[100%] transition-all duration-500 border-2 cursor-pointer
          ${isFocused ? 'shadow-[0_0_40px_rgba(255,255,255,0.4)] z-50' : ''}
        `}
      />
    </div>
  );
};

// Standard Credit Card size in mm (Vertical)
const CARD_WIDTH_MM = 53.98;
const CARD_HEIGHT_MM = 85.60;
const RULER_LENGTH_MM = 50; // 5cm

export default function App() {
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [consentDeclined, setConsentDeclined] = useState(false);
  const [isCodeEntered, setIsCodeEntered] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [pixelsPerMm, setPixelsPerMm] = useState<number | null>(null);
  const [currentVolumeIdx, setCurrentVolumeIdx] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [calibrationWidth, setCalibrationWidth] = useState(250); // Initial pixel width for calibration box
  const [calibMethod, setCalibMethod] = useState<'ruler' | 'card' | 'screen'>('screen');
  const [displayMode, setDisplayMode] = useState<'vertical' | 'horizontal' | 'both' | 'triple' | 'beads'>('vertical');
  const [screenInches, setScreenInches] = useState<number>(6.5); // Default to iPhone 11 Pro Max (6.5 inch)
  const [selectedDevice, setSelectedDevice] = useState<number>(6.5);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [lang, setLang] = useState<'vi' | 'en'>('vi');

  // Update theme color for status bar based on focus mode
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', focusedId ? '#000000' : '#0f172a');
    }
  }, [focusedId]);

  // Load calibration from localStorage
  useEffect(() => {
    const savedPpm = localStorage.getItem('orchidometer_ppm');
    const savedMode = localStorage.getItem('orchidometer_mode');
    const savedPromo = localStorage.getItem('orchidometer_promo');
    if (savedPpm) {
      setPixelsPerMm(parseFloat(savedPpm));
      setIsCalibrated(true);
    }
    if (savedMode) {
      setDisplayMode(savedMode as any);
    }
    if (savedPromo === 'true') {
      setIsCodeEntered(true);
    }
    const savedLang = localStorage.getItem('orchidometer_lang');
    if (savedLang) {
      setLang(savedLang as 'vi' | 'en');
    }
  }, []);

  const handleCalibrate = () => {
    let ppm = 1;
    if (calibMethod === 'screen') {
      const w = window.screen.width;
      const h = window.screen.height;
      const diagPx = Math.sqrt(w * w + h * h);
      const cssPpi = diagPx / screenInches;
      ppm = cssPpi / 25.4;
    } else {
      ppm = calibMethod === 'card' 
        ? calibrationWidth / CARD_WIDTH_MM 
        : calibrationWidth / RULER_LENGTH_MM;
    }
    setPixelsPerMm(ppm);
    setIsCalibrated(true);
    localStorage.setItem('orchidometer_ppm', ppm.toString());
    localStorage.setItem('orchidometer_mode', displayMode);
  };

  const resetCalibration = () => {
    setIsCalibrated(false);
    localStorage.removeItem('orchidometer_ppm');
  };

  const nextVolume = () => {
    setCurrentVolumeIdx((prev) => (prev + 1) % VOLUMES.length);
  };

  const prevVolume = () => {
    setCurrentVolumeIdx((prev) => (prev - 1 + VOLUMES.length) % VOLUMES.length);
  };

  if (consentDeclined) {
    return (
      <div 
        style={{ 
          paddingTop: 'var(--sat)', 
          paddingBottom: 'var(--sab)',
          paddingLeft: 'var(--sal)',
          paddingRight: 'var(--sar)'
        }}
        className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center font-sans"
      >
        <div className="bg-slate-800 p-5 sm:p-6 rounded-2xl max-w-xs sm:max-w-sm border border-slate-700 space-y-3 sm:space-y-4 shadow-2xl mx-auto">
          <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto" />
          <h2 className="text-lg sm:text-xl font-bold text-white">{t[lang].declinedTitle}</h2>
          <p className="text-slate-400 text-xs sm:text-sm">{t[lang].declinedDesc}</p>
          <a href="https://tamanhhospital.vn/chuyen-gia/do-tien-son/" className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors inline-block">{t[lang].exit}</a>
        </div>
      </div>
    );
  }

  if (!hasConsented) {
    return (
      <div 
        style={{ 
          paddingTop: 'var(--sat)', 
          paddingBottom: 'var(--sab)',
          paddingLeft: 'var(--sal)',
          paddingRight: 'var(--sar)'
        }}
        className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center font-sans"
      >
        <div className="bg-slate-800 p-5 sm:p-6 rounded-2xl max-w-xs sm:max-w-sm border border-slate-700 space-y-3 sm:space-y-4 shadow-2xl mx-auto">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">{t[lang].consentTitle}</h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {t[lang].consentWarning1}<br/>
            {t[lang].consentWarning2}
          </p>
          <div className="flex gap-2 pt-1">
            <button 
              onClick={() => setConsentDeclined(true)}
              className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition-colors"
            >
              {t[lang].cancel}
            </button>
            <button 
              onClick={() => setHasConsented(true)}
              className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-indigo-500/30"
            >
              {t[lang].confirm}
            </button>
          </div>
          <div className="pt-3 border-t border-slate-700 flex justify-center">
            <button 
              onClick={() => { const newLang = lang === 'vi' ? 'en' : 'vi'; setLang(newLang); localStorage.setItem('orchidometer_lang', newLang); }}
              className="px-3 py-1 rounded-full bg-slate-900 text-slate-400 text-[10px] sm:text-xs font-bold hover:text-white hover:bg-slate-700 transition-colors inline-block"
            >
              {lang === 'vi' ? 'Tiếng Việt' : 'English'} ⇄
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hasConsented && !isCodeEntered) {
    return (
      <div 
        style={{ 
          paddingTop: 'var(--sat)', 
          paddingBottom: 'var(--sab)',
          paddingLeft: 'var(--sal)',
          paddingRight: 'var(--sar)'
        }}
        className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center font-sans"
      >
        <div className="bg-slate-800 p-5 sm:p-6 rounded-2xl max-w-xs sm:max-w-sm w-full border border-slate-700 space-y-3 sm:space-y-4 shadow-2xl mx-auto">
          <h2 className="text-lg sm:text-xl font-bold text-white">{t[lang].promoTitle}</h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {t[lang].promoDesc}
          </p>
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={t[lang].promoPlaceholder}
            value={promoCode}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setPromoCode(val);
              if (val.endsWith('8') || val.endsWith('9')) {
                setIsCodeEntered(true);
                localStorage.setItem('orchidometer_promo', 'true');
              }
            }}
            className="w-full bg-slate-900 border-2 border-slate-600 rounded-xl py-2 px-3 text-white font-bold text-center text-lg focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>
    );
  }

  if (!isCalibrated) {
    return (
      <div 
        style={{ 
          paddingTop: 'var(--sat)', 
          paddingBottom: 'var(--sab)',
          paddingLeft: 'var(--sal)',
          paddingRight: 'var(--sar)'
        }}
        className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans text-slate-900"
      >
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-indigo-600 flex items-center justify-center gap-2">
              <Ruler className="w-6 h-6" />
              {t[lang].calibTitle}
            </h1>
            <p className="text-slate-500 text-sm">
              {t[lang].calibDesc}
            </p>
          </div>

          {/* Method Selector */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => { setCalibMethod('ruler'); setCalibrationWidth(250); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${calibMethod === 'ruler' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t[lang].ruler}
            </button>
            <button 
              onClick={() => { setCalibMethod('card'); setCalibrationWidth(150); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${calibMethod === 'card' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t[lang].card}
            </button>
            <button 
              onClick={() => { setCalibMethod('screen'); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${calibMethod === 'screen' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t[lang].screen}
            </button>
          </div>

          <div className="space-y-2 w-full pt-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t[lang].displayMode}</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'vertical', label: t[lang].vertical },
                { id: 'horizontal', label: t[lang].horizontal },
                { id: 'both', label: t[lang].both },
                { id: 'triple', label: t[lang].triple },
                { id: 'beads', label: t[lang].beads }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setDisplayMode(mode.id as any)}
                  className={`py-2 text-sm font-medium rounded-lg transition-all border ${displayMode === mode.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex flex-col items-center space-y-8 py-4 w-full">
            {calibMethod === 'screen' ? (
              <div className="w-full space-y-4 bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
                <div className="text-center text-sm text-indigo-800 mb-2">
                  {t[lang].screenPrompt}
                </div>
                
                <select 
                  className="w-full bg-white border-2 border-indigo-200 rounded-xl py-3 px-4 text-indigo-700 font-medium focus:outline-none focus:border-indigo-500 appearance-none"
                  value={selectedDevice}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSelectedDevice(val);
                    if (val > 0) setScreenInches(val);
                  }}
                >
                  {DEVICE_PRESETS.map(preset => (
                    <option key={preset.name} value={preset.size}>{preset.name} {preset.size > 0 ? `(${preset.size}")` : ''}</option>
                  ))}
                </select>

                <div className="flex items-center justify-center gap-4 mt-4">
                  <input 
                    type="number" 
                    step="0.1"
                    value={screenInches}
                    onChange={(e) => {
                      setScreenInches(parseFloat(e.target.value) || 6.1);
                      setSelectedDevice(0); // switch to custom
                    }}
                    className="w-24 text-center text-2xl font-bold text-indigo-600 bg-white border-2 border-indigo-200 rounded-xl py-2 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-lg font-bold text-slate-500">inches</span>
                </div>
              </div>
            ) : calibMethod === 'card' ? (
              <div 
                style={{ 
                  width: `${calibrationWidth}px`, 
                  height: `${(calibrationWidth / CARD_WIDTH_MM) * CARD_HEIGHT_MM}px` 
                }}
                className="border-4 border-indigo-500 border-dashed rounded-xl bg-indigo-50/50 flex items-center justify-center transition-all duration-75"
              >
                <span className="text-indigo-400 font-medium text-xs text-center px-4">
                  {t[lang].cardPrompt}
                </span>
              </div>
            ) : (
              <div 
                style={{ width: `${calibrationWidth}px` }}
                className="h-12 relative flex items-end transition-all duration-75 mt-4"
              >
                {/* Main horizontal line */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                
                {/* Tick marks */}
                {[0, 1, 2, 3, 4, 5].map((cm) => (
                  <div key={cm} style={{ left: `${(cm / 5) * 100}%` }} className="absolute bottom-0 flex flex-col items-center -translate-x-1/2">
                    <span className="text-indigo-600 font-bold text-[10px] mb-1">{cm}</span>
                    <div className={`w-0.5 bg-indigo-500 ${cm === 0 || cm === 5 ? 'h-6' : 'h-3'}`} />
                  </div>
                ))}
                <div className="absolute -top-8 left-0 right-0 text-center text-xs font-medium text-indigo-500">
                  {t[lang].rulerPrompt}
                </div>
              </div>
            )}

            <div className="w-full space-y-3">
              <div className="flex items-center gap-4">
                <button onClick={() => setCalibrationWidth(w => Math.max(50, w - 1))} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 font-bold text-xl transition-colors">-</button>
                <input 
                  type="range" 
                  min="100" 
                  max="500" 
                  value={calibrationWidth} 
                  onChange={(e) => setCalibrationWidth(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <button onClick={() => setCalibrationWidth(w => Math.min(800, w + 1))} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 font-bold text-xl transition-colors">+</button>
              </div>
              <div className="text-center text-[10px] text-slate-400 font-medium">
                {t[lang].sliderHint}
              </div>
            </div>
          </div>

          <button 
            onClick={handleCalibrate}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            {t[lang].confirmCalib}
          </button>
        </div>
        <div className="mt-8 text-[10px] sm:text-xs text-slate-400 font-semibold text-center flex flex-col gap-1">
          <a href="https://tamanhhospital.vn/chuyen-gia/do-tien-son/" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 transition-colors">
            {t[lang].author}
          </a>
          <a href="http://dotienson.com/app" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 transition-colors">
            {t[lang].worldFirst}
          </a>
          <div className="mt-2">
            <button 
              onClick={() => { const newLang = lang === 'vi' ? 'en' : 'vi'; setLang(newLang); localStorage.setItem('orchidometer_lang', newLang); }}
              className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] sm:text-xs font-bold hover:text-indigo-600 hover:bg-slate-200 transition-colors inline-block"
            >
              {lang === 'vi' ? 'Tiếng Việt' : 'English'} ⇄
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentVolume = VOLUMES[currentVolumeIdx];
  const [lengthMm, widthMm] = ORCHIDOMETER_DATA[currentVolume];
  const ppm = pixelsPerMm || 1;
  const stageStyle = getStageStyle(currentVolume);

  return (
    <div 
      style={{ 
        paddingLeft: 'var(--sal)',
        paddingRight: 'var(--sar)'
      }}
      className={`min-h-screen flex flex-col font-sans text-white overflow-hidden transition-colors duration-500 ${focusedId ? 'bg-black' : 'bg-slate-900'}`}
    >
      {/* Header */}
      <header 
        style={{ paddingTop: 'calc(var(--sat) + 1.5rem)' }}
        className={`px-6 pb-6 flex justify-between items-center bg-slate-800/50 backdrop-blur-md border-b border-slate-700 transition-opacity duration-500 ${focusedId ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 text-2xl">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl text-indigo-300 leading-none mb-1" style={{ fontFamily: "'Caveat', cursive" }}>Sondo's Digital</h1>
            <p className="text-xl text-white uppercase tracking-widest font-black">Orchidometer</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{t[lang].subtitle}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400"
          >
            <Info className="w-6 h-6" />
          </button>
          <button 
            onClick={resetCalibration}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400"
          >
            <RefreshCw className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Display Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 pb-28 relative" onClick={() => setFocusedId(null)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentVolume}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex flex-col items-center space-y-12"
          >
            {displayMode === 'beads' ? (
              <div className="w-full relative py-12 overflow-hidden touch-none">
                <div className="absolute top-1/2 left-0 right-0 h-[4px] bg-red-500 -translate-y-1/2 z-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <motion.div 
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = offset.x;
                    if (swipe < -30) {
                      setCurrentVolumeIdx(prev => Math.min(VOLUMES.length - 1, prev + 1));
                    } else if (swipe > 30) {
                      setCurrentVolumeIdx(prev => Math.max(0, prev - 1));
                    }
                  }}
                  animate={{ x: 0 }}
                  className="flex items-center gap-6 justify-center relative z-10"
                >
                  {[currentVolumeIdx - 1, currentVolumeIdx, currentVolumeIdx + 1].map((idx) => {
                    if (idx < 0 || idx >= VOLUMES.length) return <div key={`empty-${idx}`} className="w-24 shrink-0" />;
                    const vol = VOLUMES[idx];
                    const [l, w] = ORCHIDOMETER_DATA[vol];
                    const style = getStageStyle(vol);
                    return (
                      <div key={vol} className="flex flex-col items-center shrink-0 transition-all duration-300">
                        <Ellipsoid 
                          id={`beads-${vol}`}
                          widthMm={w} lengthMm={l} ppm={ppm} isHorizontal={true} styleObj={style} 
                          isFocused={focusedId === `beads-${vol}`}
                          isHidden={focusedId !== null && focusedId !== `beads-${vol}`}
                          onClick={setFocusedId}
                        />
                        <div className={`absolute -bottom-12 font-bold ${style.text} text-xl transition-opacity duration-500 ${focusedId ? 'opacity-0' : 'opacity-100'}`}>{vol}mL</div>
                      </div>
                    );
                  })}
                </motion.div>
              </div>
            ) : displayMode === 'triple' ? (
              <div className="flex flex-row items-center justify-center gap-6 w-full overflow-x-auto pt-4 pb-8 px-4">
                {[currentVolumeIdx - 1, currentVolumeIdx, currentVolumeIdx + 1].map(idx => {
                  if (idx < 0 || idx >= VOLUMES.length) return <div key={idx} className="w-20 shrink-0" />;
                  const vol = VOLUMES[idx];
                  const [l, w] = ORCHIDOMETER_DATA[vol];
                  const style = getStageStyle(vol);
                  const isCenter = idx === currentVolumeIdx;
                  return (
                    <div key={vol} className="flex flex-col items-center transition-all shrink-0">
                      <Ellipsoid 
                        id={`triple-${vol}`}
                        widthMm={w} lengthMm={l} ppm={ppm} isHorizontal={false} styleObj={style} 
                        isFocused={focusedId === `triple-${vol}`}
                        isHidden={focusedId !== null && focusedId !== `triple-${vol}`}
                        onClick={setFocusedId}
                      />
                      <div className={`mt-8 font-bold ${style.text} ${isCenter ? 'text-3xl' : 'text-xl'} transition-opacity duration-500 ${focusedId ? 'opacity-0' : 'opacity-100'}`}>{vol}mL</div>
                      <div className={`font-mono text-slate-400 mt-1 ${isCenter ? 'text-sm' : 'text-[10px]'} transition-opacity duration-500 ${focusedId ? 'opacity-0' : 'opacity-100'}`}>{w} x {l} mm</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`flex ${displayMode === 'both' ? 'flex-row gap-16' : 'flex-col'} items-center justify-center`}>
                {(displayMode === 'vertical' || displayMode === 'both') && (
                  <Ellipsoid 
                    id="vertical"
                    widthMm={widthMm} lengthMm={lengthMm} ppm={ppm} isHorizontal={false} styleObj={stageStyle} 
                    isFocused={focusedId === 'vertical'}
                    isHidden={focusedId !== null && focusedId !== 'vertical'}
                    onClick={setFocusedId}
                  />
                )}
                {(displayMode === 'horizontal' || displayMode === 'both') && (
                  <Ellipsoid 
                    id="horizontal"
                    widthMm={widthMm} lengthMm={lengthMm} ppm={ppm} isHorizontal={true} styleObj={stageStyle} 
                    isFocused={focusedId === 'horizontal'}
                    isHidden={focusedId !== null && focusedId !== 'horizontal'}
                    onClick={setFocusedId}
                  />
                )}
              </div>
            )}

            {/* Volume Label */}
            {displayMode !== 'triple' && displayMode !== 'beads' && (
              <div className={`text-center transition-opacity duration-500 ${focusedId ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className={`text-7xl font-black ${stageStyle.text} flex items-baseline justify-center gap-2`}>
                  <span>{currentVolume}</span>
                  <span className="text-3xl font-bold text-slate-500">mL</span>
                </div>
                <div className="text-sm text-slate-400 font-mono mt-2 font-medium">
                  {widthMm} x {lengthMm} mm
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Controls */}
        <div 
          style={{ bottom: 'calc(var(--sab) + 3rem)' }}
          className={`absolute left-0 right-0 px-8 flex justify-between items-center max-w-md mx-auto transition-opacity duration-500 ${focusedId ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <button 
            onClick={prevVolume}
            className="w-14 h-14 bg-slate-800 hover:bg-slate-700 rounded-2xl flex items-center justify-center transition-all active:scale-95 border border-slate-700"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <div className="flex gap-1">
            {VOLUMES.map((v, idx) => (
              <div 
                key={v} 
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentVolumeIdx ? 'w-6 bg-indigo-500' : 'w-1.5 bg-slate-700'}`}
              />
            ))}
          </div>

          <button 
            onClick={nextVolume}
            className="w-14 h-14 bg-slate-800 hover:bg-slate-700 rounded-2xl flex items-center justify-center transition-all active:scale-95 border border-slate-700"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      </main>

      {/* Info Overlay */}
      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm p-8 flex items-center justify-center"
            onClick={() => setShowInfo(false)}
          >
            <div className="bg-slate-800 p-8 rounded-3xl max-w-sm border border-slate-700 space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-indigo-400">{t[lang].guideTitle}</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</div>
                  <span>{t[lang].guide1}</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</div>
                  <span>{t[lang].guide2}</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</div>
                  <span>{t[lang].guide3}</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</div>
                  <span>{t[lang].guide4}</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">5</div>
                  <span>{t[lang].guide5}</span>
                </li>
              </ul>
              <div className="p-3 bg-slate-900/50 rounded-xl text-xs text-slate-400 italic">
                {t[lang].guideNote}
              </div>
              <button 
                onClick={() => setShowInfo(false)}
                className="w-full bg-indigo-600 py-3 rounded-xl font-bold mt-4"
              >
                {t[lang].understood}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer 
        style={{ paddingBottom: 'calc(var(--sab) + 1rem)' }}
        className={`p-4 text-center space-y-2 transition-opacity duration-500 ${focusedId ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="inline-block px-3 py-1 rounded-md bg-yellow-400/20 text-yellow-500 border border-yellow-500/30 text-xs font-medium">
          {t[lang].calibFactor}: {Math.round(ppm * 10) / 10} px/mm
        </div>
        <div className="text-[10px] sm:text-xs text-indigo-400/80 font-semibold flex flex-col gap-1">
          <a href="https://tamanhhospital.vn/chuyen-gia/do-tien-son/" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-300 transition-colors">
            {t[lang].author}
          </a>
          <a href="http://dotienson.com/app" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-300 transition-colors">
            {t[lang].worldFirst}
          </a>
        </div>
        <div className="mt-2">
          <button 
            onClick={() => { const newLang = lang === 'vi' ? 'en' : 'vi'; setLang(newLang); localStorage.setItem('orchidometer_lang', newLang); }}
            className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] sm:text-xs font-bold hover:text-white hover:bg-slate-700 transition-colors inline-block"
          >
            {lang === 'vi' ? 'Tiếng Việt' : 'English'} ⇄
          </button>
        </div>
      </footer>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Ruler, Info, ChevronLeft, ChevronRight, Check, RefreshCw, AlertTriangle } from 'lucide-react';

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
    bg: 'from-orange-400 to-orange-600 border-orange-300/50 shadow-orange-500/30',
    text: 'text-orange-500'
  };
  if (volume <= 12) return {
    bg: 'from-blue-400 to-blue-600 border-blue-300/50 shadow-blue-500/30',
    text: 'text-blue-500'
  };
  return {
    bg: 'from-indigo-400 to-indigo-600 border-indigo-300/50 shadow-indigo-500/30',
    text: 'text-indigo-500'
  };
};

const getStageName = (volume: number) => {
  if (volume <= 3) return 'Giai đoạn Tiền dậy thì';
  if (volume <= 12) return 'Giai đoạn Dậy thì';
  return 'Giai đoạn Trưởng thành';
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
  const [pixelsPerMm, setPixelsPerMm] = useState<number | null>(null);
  const [currentVolumeIdx, setCurrentVolumeIdx] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [calibrationWidth, setCalibrationWidth] = useState(250); // Initial pixel width for calibration box
  const [calibMethod, setCalibMethod] = useState<'ruler' | 'card' | 'screen'>('ruler');
  const [displayMode, setDisplayMode] = useState<'vertical' | 'horizontal' | 'both' | 'triple'>('vertical');
  const [screenInches, setScreenInches] = useState<number>(6.1); // Default to common 6.1 inch screen
  const [selectedDevice, setSelectedDevice] = useState<number>(6.1);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Load calibration from localStorage
  useEffect(() => {
    const savedPpm = localStorage.getItem('orchidometer_ppm');
    const savedMode = localStorage.getItem('orchidometer_mode');
    if (savedPpm) {
      setPixelsPerMm(parseFloat(savedPpm));
      setIsCalibrated(true);
    }
    if (savedMode) {
      setDisplayMode(savedMode as any);
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center font-sans">
        <div className="bg-slate-800 p-8 rounded-3xl max-w-md border border-slate-700 space-y-4 shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Đã huỷ truy cập</h2>
          <p className="text-slate-400">Bạn cần xác nhận các lưu ý an toàn để sử dụng ứng dụng này.</p>
          <button onClick={() => setConsentDeclined(false)} className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors">Quay lại</button>
        </div>
      </div>
    );
  }

  if (!hasConsented) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center font-sans">
        <div className="bg-slate-800 p-8 rounded-3xl max-w-md border border-slate-700 space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">Lưu ý quan trọng</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Chú ý không chạm màn hình vào đối tượng khám; hình ảnh chỉ mang tính đối chiếu, không thay thế siêu âm và thước Prader.
          </p>
          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => setConsentDeclined(true)}
              className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
            >
              Huỷ
            </button>
            <button 
              onClick={() => setHasConsented(true)}
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/30"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isCalibrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans text-slate-900">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-indigo-600 flex items-center justify-center gap-2">
              <Ruler className="w-6 h-6" />
              Hiệu chuẩn màn hình
            </h1>
            <p className="text-slate-500 text-sm">
              Chọn vật thể tham chiếu để đồng bộ kích thước thực tế (mm) với màn hình của bạn.
            </p>
          </div>

          {/* Method Selector */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => { setCalibMethod('ruler'); setCalibrationWidth(250); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${calibMethod === 'ruler' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Thước kẻ
            </button>
            <button 
              onClick={() => { setCalibMethod('card'); setCalibrationWidth(150); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${calibMethod === 'card' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Thẻ ATM
            </button>
            <button 
              onClick={() => { setCalibMethod('screen'); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${calibMethod === 'screen' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Nhập Inch
            </button>
          </div>

          <div className="space-y-2 w-full pt-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chế độ hiển thị</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'vertical', label: 'Dọc' },
                { id: 'horizontal', label: 'Ngang' },
                { id: 'both', label: 'Cả 2' },
                { id: 'triple', label: '3 Kích thước' }
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
                  Chọn dòng máy của bạn hoặc nhập kích thước đường chéo màn hình.
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
                  Khớp viền thẻ vào đây
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
                  Áp thước kẻ vật lý vào đoạn 5cm này
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
                Kéo thanh trượt hoặc dùng nút +/- để tinh chỉnh
              </div>
            </div>
          </div>

          <button 
            onClick={handleCalibrate}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Xác nhận hiệu chuẩn
          </button>
        </div>
        <div className="mt-8 text-xs text-slate-400 font-semibold text-center">
          Sáng chế độc quyền của BS. Đỗ Tiến Sơn
        </div>
      </div>
    );
  }

  const currentVolume = VOLUMES[currentVolumeIdx];
  const [lengthMm, widthMm] = ORCHIDOMETER_DATA[currentVolume];
  const ppm = pixelsPerMm || 1;
  const stageStyle = getStageStyle(currentVolume);

  return (
    <div className={`min-h-screen flex flex-col font-sans text-white overflow-hidden transition-colors duration-500 ${focusedId ? 'bg-black' : 'bg-slate-900'}`}>
      {/* Header */}
      <header className={`p-6 flex justify-between items-center bg-slate-800/50 backdrop-blur-md border-b border-slate-700 transition-opacity duration-500 ${focusedId ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 text-2xl">
            🍒
          </div>
          <div>
            <h1 className="text-3xl text-indigo-300 leading-none mb-1" style={{ fontFamily: "'Caveat', cursive" }}>Sondo's Digital</h1>
            <p className="text-xl text-white uppercase tracking-widest font-black">Orchidometer</p>
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
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative" onClick={() => setFocusedId(null)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentVolume}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex flex-col items-center space-y-12"
          >
            {displayMode === 'triple' ? (
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
            {displayMode !== 'triple' && (
              <div className={`text-center transition-opacity duration-500 ${focusedId ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className={`text-7xl font-black ${stageStyle.text} flex items-baseline justify-center gap-2`}>
                  <span>{currentVolume}</span>
                  <span className="text-3xl font-bold text-slate-500">mL</span>
                </div>
                <div className="text-sm text-slate-400 font-mono mt-2 font-medium">
                  {widthMm} x {lengthMm} mm
                </div>
                <p className="text-slate-400 text-sm mt-3 font-medium">
                  {getStageName(currentVolume)}
                </p>
              </div>
            )}
            {displayMode === 'triple' && (
              <div className={`text-center mt-4 transition-opacity duration-500 ${focusedId ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <p className="text-slate-400 text-sm font-medium">
                  {getStageName(currentVolume)}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Controls */}
        <div className={`absolute bottom-12 left-0 right-0 px-8 flex justify-between items-center max-w-md mx-auto transition-opacity duration-500 ${focusedId ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
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
              <h3 className="text-xl font-bold text-indigo-400">Hướng dẫn sử dụng</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</div>
                  <span>Đặt điện thoại song song với đối tượng cần so sánh.</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</div>
                  <span>Sử dụng các nút mũi tên để thay đổi thể tích (ml).</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</div>
                  <span>Kích thước elip trên màn hình đã được hiệu chuẩn theo mm thực tế.</span>
                </li>
              </ul>
              <button 
                onClick={() => setShowInfo(false)}
                className="w-full bg-indigo-600 py-3 rounded-xl font-bold mt-4"
              >
                Đã hiểu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className={`p-4 text-center space-y-2 transition-opacity duration-500 ${focusedId ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="text-[10px] text-slate-600 font-medium uppercase tracking-widest">
          Standardized Calibration Active • {Math.round(ppm * 10) / 10} px/mm
        </div>
        <div className="text-xs text-indigo-400/80 font-semibold">
          Sáng chế độc quyền của BS. Đỗ Tiến Sơn
        </div>
      </footer>
    </div>
  );
}

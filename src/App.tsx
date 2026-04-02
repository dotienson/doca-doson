/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Ruler, Info, ChevronLeft, ChevronRight, Check, RefreshCw } from 'lucide-react';

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

// Standard Credit Card size in mm (Vertical)
const CARD_WIDTH_MM = 53.98;
const CARD_HEIGHT_MM = 85.60;
const RULER_LENGTH_MM = 50; // 5cm

export default function App() {
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [pixelsPerMm, setPixelsPerMm] = useState<number | null>(null);
  const [currentVolumeIdx, setCurrentVolumeIdx] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [calibrationWidth, setCalibrationWidth] = useState(250); // Initial pixel width for calibration box
  const [calibMethod, setCalibMethod] = useState<'ruler' | 'card'>('ruler');

  // Load calibration from localStorage
  useEffect(() => {
    const savedPpm = localStorage.getItem('orchidometer_ppm');
    if (savedPpm) {
      setPixelsPerMm(parseFloat(savedPpm));
      setIsCalibrated(true);
    }
  }, []);

  const handleCalibrate = () => {
    const ppm = calibMethod === 'card' 
      ? calibrationWidth / CARD_WIDTH_MM 
      : calibrationWidth / RULER_LENGTH_MM;
    setPixelsPerMm(ppm);
    setIsCalibrated(true);
    localStorage.setItem('orchidometer_ppm', ppm.toString());
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
              Thước kẻ (5cm)
            </button>
            <button 
              onClick={() => { setCalibMethod('card'); setCalibrationWidth(150); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${calibMethod === 'card' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Thẻ ATM dọc
            </button>
          </div>

          <div className="relative flex flex-col items-center space-y-8 py-4">
            {calibMethod === 'card' ? (
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

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-white overflow-hidden">
      {/* Header */}
      <header className="p-6 flex justify-between items-center bg-slate-800/50 backdrop-blur-md border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Ruler className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Sondo Digital</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Orchidometer</p>
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
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentVolume}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex flex-col items-center space-y-12"
          >
            {/* The Ellipsoid representation */}
            <div className="relative group">
              <div 
                style={{ 
                  width: `${widthMm * ppm}px`, 
                  height: `${lengthMm * ppm}px`,
                  boxShadow: '0 0 40px rgba(79, 70, 229, 0.3)'
                }}
                className="bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-[100%] transition-all duration-300 border-2 border-indigo-300/50"
              />
              {/* Size Indicators */}
              <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col items-start text-[10px] text-slate-500 font-mono">
                <div className="h-[1px] w-8 bg-slate-700 mb-1" />
                <span>{lengthMm}mm</span>
              </div>
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-[10px] text-slate-500 font-mono">
                <div className="w-[1px] h-6 bg-slate-700 mb-1" />
                <span>{widthMm}mm</span>
              </div>
            </div>

            {/* Volume Label */}
            <div className="text-center">
              <div className="text-7xl font-black text-indigo-500 tracking-tighter">
                {currentVolume}
                <span className="text-2xl font-medium text-slate-500 ml-1">ml</span>
              </div>
              <p className="text-slate-400 text-sm mt-2 font-medium">
                {currentVolume <= 3 ? 'Giai đoạn Tiền dậy thì' : 
                 currentVolume <= 12 ? 'Giai đoạn Dậy thì' : 'Giai đoạn Trưởng thành'}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Controls */}
        <div className="absolute bottom-12 left-0 right-0 px-8 flex justify-between items-center max-w-md mx-auto">
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

      <footer className="p-4 text-center space-y-2">
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

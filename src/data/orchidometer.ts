export type Language = 'vi' | 'en';
export type ThemeMode = 'light' | 'dark';
export type CalibMethod = 'ruler' | 'card' | 'screen';
export type DisplayMode = 'vertical' | 'horizontal' | 'both' | 'triple' | 'beads';
export type BeadMaterialFinish = 'resin' | 'wood' | 'acrylic';

// Standard Prader Orchidometer dimensions (Length x Width in mm) - Chipkevitch method
export const ORCHIDOMETER_DATA: Record<number, [number, number]> = {
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

export const VOLUMES = Object.keys(ORCHIDOMETER_DATA).map(Number).sort((a, b) => a - b);

export const CARD_WIDTH_MM = 53.98;
export const CARD_HEIGHT_MM = 85.60;
export const RULER_LENGTH_MM = 50; // 5 cm

export interface DevicePreset {
  id: string;
  nameVi: string;
  nameEn: string;
  size: number;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'custom', nameVi: 'Tùy chỉnh (Nhập tay)', nameEn: 'Custom (Manual)', size: 0 },
  // iPhone
  { id: 'iphone-mini', nameVi: 'iPhone 12 / 13 mini', nameEn: 'iPhone 12 / 13 mini', size: 5.4 },
  { id: 'iphone-xs', nameVi: 'iPhone X / XS / 11 Pro', nameEn: 'iPhone X / XS / 11 Pro', size: 5.8 },
  { id: 'iphone-61', nameVi: 'iPhone 11 / 12 / 13 / 14 / 15 / 16 / 16e', nameEn: 'iPhone 11–16 / 16e', size: 6.1 },
  { id: 'iphone-16pro', nameVi: 'iPhone 16 Pro', nameEn: 'iPhone 16 Pro', size: 6.3 },
  { id: 'iphone-xsmax', nameVi: 'iPhone XS Max / 11 Pro Max', nameEn: 'iPhone XS Max / 11 Pro Max', size: 6.5 },
  { id: 'iphone-plus-pm', nameVi: 'iPhone 12–15 Pro Max / 14–16 Plus', nameEn: 'iPhone 12–15 Pro Max / 14–16 Plus', size: 6.7 },
  { id: 'iphone-16pm', nameVi: 'iPhone 16 Pro Max', nameEn: 'iPhone 16 Pro Max', size: 6.9 },
  // iPad
  { id: 'ipad-mini', nameVi: 'iPad mini 6 / 7', nameEn: 'iPad mini 6 / 7', size: 8.3 },
  { id: 'ipad-102', nameVi: 'iPad Gen 9', nameEn: 'iPad 9th Gen', size: 10.2 },
  { id: 'ipad-109', nameVi: 'iPad Gen 10 / Air 4–5', nameEn: 'iPad 10th Gen / Air 4–5', size: 10.9 },
  { id: 'ipad-11', nameVi: 'iPad Air M2 11" / iPad Pro 11"', nameEn: 'iPad Air / Pro 11"', size: 11.0 },
  { id: 'ipad-13', nameVi: 'iPad Air 13" / iPad Pro 12.9–13"', nameEn: 'iPad Air / Pro 12.9–13"', size: 12.9 },
  // Samsung Galaxy
  { id: 'galaxy-s', nameVi: 'Samsung Galaxy S23 / S24 / S25', nameEn: 'Samsung Galaxy S23 / S24 / S25', size: 6.2 },
  { id: 'galaxy-a', nameVi: 'Samsung Galaxy A35 / A55 / S24+', nameEn: 'Samsung Galaxy A35 / A55 / S24+', size: 6.6 },
  { id: 'galaxy-s25plus', nameVi: 'Samsung Galaxy S25+ / Z Flip 5–6', nameEn: 'Samsung Galaxy S25+ / Z Flip 5–6', size: 6.7 },
  { id: 'galaxy-ultra', nameVi: 'Samsung Galaxy S23 / S24 / S25 Ultra', nameEn: 'Samsung Galaxy S23 / S24 / S25 Ultra', size: 6.8 },
  { id: 'galaxy-fold', nameVi: 'Samsung Galaxy Z Fold 5 / 6 (Màn chính)', nameEn: 'Samsung Galaxy Z Fold 5 / 6 (Main)', size: 7.6 },
  // Xiaomi & OPPO
  { id: 'xiaomi-compact', nameVi: 'Xiaomi 13 / 14 / 15', nameEn: 'Xiaomi 13 / 14 / 15', size: 6.36 },
  { id: 'xiaomi-redmi', nameVi: 'Xiaomi 14T / Redmi Note 12–14', nameEn: 'Xiaomi 14T / Redmi Note 12–14', size: 6.67 },
  { id: 'oppo-reno', nameVi: 'OPPO Reno 11 / 12 / Find X', nameEn: 'OPPO Reno 11 / 12 / Find X', size: 6.7 },
];

export interface DetectedDeviceInfo {
  presetId: string;
  size: number;
  widthPx: number;
  heightPx: number;
  dpr: number;
  matched: boolean;
}

export function detectDevicePreset(): DetectedDeviceInfo {
  if (typeof window === 'undefined') {
    return { presetId: 'iphone-xsmax', size: 6.5, widthPx: 414, heightPx: 896, dpr: 3, matched: false };
  }

  const rawW = window.screen.width || 390;
  const rawH = window.screen.height || 844;
  const w = Math.min(rawW, rawH);
  const h = Math.max(rawW, rawH);
  const dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100;
  const ua = navigator.userAgent.toLowerCase();
  const isIPadUA =
    /ipad/.test(ua) ||
    (navigator.platform === 'MacIntel' && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1);
  const isIPhoneUA = /iphone|ipod/.test(ua);

  // Exact logical viewport matching for Apple devices
  if (isIPadUA || (w >= 740 && h >= 1000 && dpr >= 1.8 && dpr <= 2.2)) {
    if (w <= 760 && h <= 1150) {
      return { presetId: 'ipad-mini', size: 8.3, widthPx: w, heightPx: h, dpr, matched: true };
    }
    if (w <= 815 && h <= 1100) {
      return { presetId: 'ipad-102', size: 10.2, widthPx: w, heightPx: h, dpr, matched: true };
    }
    if (w <= 825 && h <= 1190) {
      return { presetId: 'ipad-109', size: 10.9, widthPx: w, heightPx: h, dpr, matched: true };
    }
    if (w <= 860 && h <= 1230) {
      return { presetId: 'ipad-11', size: 11.0, widthPx: w, heightPx: h, dpr, matched: true };
    }
    if (w >= 1000) {
      return { presetId: 'ipad-13', size: 12.9, widthPx: w, heightPx: h, dpr, matched: true };
    }
  }

  if (isIPhoneUA) {
    if (w === 375 && h === 812) {
      return { presetId: 'iphone-mini', size: 5.4, widthPx: w, heightPx: h, dpr, matched: true };
    }
    if (w === 390 || w === 393) {
      return { presetId: 'iphone-61', size: 6.1, widthPx: w, heightPx: h, dpr, matched: true };
    }
    if (w === 402 && h >= 870) {
      return { presetId: 'iphone-16pro', size: 6.3, widthPx: w, heightPx: h, dpr, matched: true };
    }
    if (w === 414 && h === 896) {
      return { presetId: 'iphone-xsmax', size: 6.5, widthPx: w, heightPx: h, dpr, matched: true };
    }
    if (w === 428 || w === 430) {
      return { presetId: 'iphone-plus-pm', size: 6.7, widthPx: w, heightPx: h, dpr, matched: true };
    }
    if (w >= 440) {
      return { presetId: 'iphone-16pm', size: 6.9, widthPx: w, heightPx: h, dpr, matched: true };
    }
  }

  // Android / Foldable / Desktop heuristics by CSS resolution & UA brand
  if (w >= 650 && w <= 780 && h <= 920) {
    return { presetId: 'galaxy-fold', size: 7.6, widthPx: w, heightPx: h, dpr, matched: true };
  }

  if (/xiaomi|redmi|poco|2312|240|2210/.test(ua)) {
    if (w <= 395 && h <= 865 && dpr >= 2.9) {
      return { presetId: 'xiaomi-compact', size: 6.36, widthPx: w, heightPx: h, dpr, matched: true };
    }
    return { presetId: 'xiaomi-redmi', size: 6.67, widthPx: w, heightPx: h, dpr, matched: true };
  }

  if (/oppo|cph|reno|find/.test(ua)) {
    return { presetId: 'oppo-reno', size: 6.7, widthPx: w, heightPx: h, dpr, matched: true };
  }

  if (/samsung|sm-/.test(ua)) {
    if (w <= 365 && h <= 800) {
      return { presetId: 'galaxy-s', size: 6.2, widthPx: w, heightPx: h, dpr, matched: true };
    }
    if (w >= 408 || h >= 890) {
      return { presetId: 'galaxy-ultra', size: 6.8, widthPx: w, heightPx: h, dpr, matched: true };
    }
    return { presetId: 'galaxy-a', size: 6.6, widthPx: w, heightPx: h, dpr, matched: true };
  }

  // Fallback aspect estimation for general phones
  if (w <= 480) {
    const estimated = h >= 900 ? 'galaxy-ultra' : h >= 840 ? 'galaxy-a' : 'iphone-61';
    const preset = DEVICE_PRESETS.find((p) => p.id === estimated)!;
    return { presetId: preset.id, size: preset.size, widthPx: w, heightPx: h, dpr, matched: false };
  }

  // Desktop / Monitor fallback: estimate diagonal roughly from 96 CSS PPI
  const diagIn = Math.round((Math.hypot(rawW, rawH) / 96) * 10) / 10;
  return {
    presetId: 'custom',
    size: Math.max(10, Math.min(34, diagIn)),
    widthPx: w,
    heightPx: h,
    dpr,
    matched: false,
  };
}

export interface StageStyle {
  key: 'prepubertal' | 'onset' | 'pubertal' | 'adult';
  hex: string;
  hexDark: string;
  hexHighlight: string;
  swatchClass: string;
  textClass: string;
  textLightClass: string;
  bg2DClass: string;
  radialBg: string;
}

export const getStageStyle = (volume: number): StageStyle => {
  if (volume <= 3) {
    return {
      key: 'prepubertal',
      hex: '#10b981',
      hexDark: '#065f46',
      hexHighlight: '#a7f3d0',
      swatchClass: 'bg-emerald-500',
      textClass: 'text-emerald-400',
      textLightClass: 'text-emerald-600',
      bg2DClass: 'from-emerald-400 to-emerald-600 border-emerald-300/40',
      radialBg: 'radial-gradient(circle at 35% 30%, #a7f3d0 0%, #34d399 22%, #059669 55%, #065f46 82%, #022c22 100%)',
    };
  }
  if (volume === 4) {
    return {
      key: 'onset',
      hex: '#ef4444',
      hexDark: '#7f1d1d',
      hexHighlight: '#fecaca',
      swatchClass: 'bg-red-500',
      textClass: 'text-red-400',
      textLightClass: 'text-red-600',
      bg2DClass: 'from-red-400 to-red-600 border-red-300/40',
      radialBg: 'radial-gradient(circle at 35% 30%, #fecaca 0%, #f87171 22%, #dc2626 55%, #991b1b 82%, #450a0a 100%)',
    };
  }
  if (volume <= 12) {
    return {
      key: 'pubertal',
      hex: '#f59e0b',
      hexDark: '#78350f',
      hexHighlight: '#fef08a',
      swatchClass: 'bg-amber-400',
      textClass: 'text-amber-400',
      textLightClass: 'text-amber-600',
      bg2DClass: 'from-amber-300 to-amber-500 border-amber-200/40',
      radialBg: 'radial-gradient(circle at 35% 30%, #fef08a 0%, #facc15 22%, #d97706 55%, #92400e 82%, #451a03 100%)',
    };
  }
  return {
    key: 'adult',
    hex: '#f97316',
    hexDark: '#7c2d12',
    hexHighlight: '#fed7aa',
    swatchClass: 'bg-orange-500',
    textClass: 'text-orange-400',
    textLightClass: 'text-orange-600',
    bg2DClass: 'from-orange-400 to-red-500 border-orange-300/40',
    radialBg: 'radial-gradient(circle at 35% 30%, #fed7aa 0%, #fb923c 22%, #ea580c 55%, #9a3412 82%, #431407 100%)',
  };
};

export const triggerHaptic = (pattern: number | number[] = 50) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors on unsupported platforms
    }
  }
};

export const t = {
  vi: {
    brandTitle: "ePra Dr.Son",
    appName: "Thước Prader điện tử",
    consentTitle: "Lưu ý an toàn & chuyên môn",
    consentWarning1: "Không chạm trực tiếp màn hình thiết bị vào đối tượng khám.",
    consentWarning2: "Phương pháp đối chiếu hình ảnh chỉ mang tính sàng lọc khi chưa có sẵn dụng cụ khám, không thay thế siêu âm đo thể tích hoặc thước Prader chuyên dụng.",
    cancel: "Huỷ",
    confirm: "Xác nhận",
    declinedTitle: "Kết thúc phiên sử dụng",
    declinedDesc: "Ứng dụng chỉ hoạt động khi người dùng xác nhận các lưu ý an toàn và chuyên môn.",
    exit: "Thoát",
    calibTitle: "Hiệu chuẩn màn hình",
    calibDesc: "Đồng bộ tỷ lệ thực tế (mm) của thiết bị trước khi đối chiếu lâm sàng.",
    ruler: "Thước kẻ 5cm",
    card: "Thẻ chuẩn",
    screen: "Kích cỡ máy",
    displayMode: "Chế độ hiển thị",
    vertical: "Dọc",
    horizontal: "Ngang",
    both: "Cả 2",
    triple: "3 Kích thước",
    beads: "Chuỗi hạt 3D",
    screenPrompt: "Chọn dòng máy đang sử dụng hoặc bấm Tự nhận diện màn hình.",
    autoDetectBtn: "Tự nhận diện",
    autoDetectedNote: "Đã gợi ý theo màn hình",
    autoDetectCustomNote: "Không trùng mẫu cố định — khuyến nghị kiểm tra lại bằng thước 5cm.",
    cardPrompt: "Đặt thẻ ATM / CCCD trùng khớp với khung nét đứt",
    rulerPrompt: "Áp thước kẻ vật lý dọc theo vạch chia 0 – 5 cm",
    sliderHint: "Kéo hoặc nhấn − / + để chỉnh từng pixel",
    confirmCalib: "Lưu hiệu chuẩn & Bắt đầu",
    author: "Sáng kiến cải tiến của BS. Đỗ Tiến Sơn",
    worldFirst: "Orchidometer kỹ thuật số theo phương pháp Chipkevitch",
    stagePrepubertal: "Tiền dậy thì (1–3 mL)",
    stageOnset: "Khởi phát dậy thì (4 mL)",
    stagePubertal: "Đang dậy thì (5–12 mL)",
    stageAdult: "Trưởng thành (15–25 mL)",
    guideTitle: "Quy trình sử dụng lâm sàng",
    guide1: "Thông báo cho trẻ và gia đình về quy trình đối chiếu hình ảnh sàng lọc.",
    guide2: "Hiệu chuẩn màn hình với thước kẻ, thẻ chuẩn hoặc model máy; kiểm tra bằng vạch 1 cm nếu cần.",
    guide3: "Sát khuẩn tay; đeo găng tay khám ở tay bộc lộ đối tượng, tay còn lại cầm thiết bị song song để đối chiếu (hoặc nhờ người hỗ trợ cầm máy).",
    guide4: "Kéo trượt các hạt 3D dọc dây hoặc bật So sánh để ghim một hạt mốc đối chiếu song song.",
    guide5: "Ghi nhận kết quả sàng lọc và đối chiếu bằng thước Prader vật lý hoặc siêu âm khi có chỉ định.",
    guideNote: "Lưu ý: Kích thước elip ở chế độ 2D và Chuỗi hạt 3D được khóa tỷ lệ 1:1 mm theo hiệu chuẩn thực tế. Luôn kiểm tra lại zoom trình duyệt trước mỗi phiên khám.",
    understood: "Đóng hướng dẫn",
    calibFactor: "Hệ số màn hình",
    promoTitle: "Đăng nhập phiên khám",
    promoDesc: "Nhập tài khoản, passcode và mã Premium (nếu có).",
    promoPlaceholder: "Nhập mã số...",
    accountLabel: "Tài khoản",
    accountPlaceholder: "Tên tài khoản hoặc email...",
    passcodeLabel: "Passcode",
    passcodePlaceholder: "Nhập passcode...",
    premiumCodeLabel: "Mã Premium",
    premiumOptionalHint: "Để trống nếu chưa có",
    premiumCodePlaceholder: "Không bắt buộc — để trống nếu chưa có",
    rememberLabel: "Ghi nhớ đăng nhập",
    remember24h: "24 giờ",
    remember7d: "7 ngày",
    signOut: "Đăng xuất",
    signedInAs: "Tài khoản",
    loginButton: "Đăng nhập",
    accountRequired: "Vui lòng nhập tên tài khoản.",
    passcodeInvalid: "Passcode chưa hợp lệ.",
    premiumInvalidLogin: "Mã Premium chưa đúng — hãy xóa trống hoặc nhập đúng mã.",
    premiumError: "Mã chưa hợp lệ — liên hệ BS. Sơn để nhận mã Chuỗi hạt 3D",
    premiumPromptTitle: "Mở khóa Chuỗi hạt 3D",
    premiumSuccess: "Đã mở khóa Chuỗi hạt 3D",
    calibMethodPrefix: "Phương pháp",
    calibMethodRuler: "Thước 5cm",
    calibMethodCard: "Thẻ chuẩn",
    calibMethodScreen: "Model máy",
    calibTimePrefix: "lúc",
    reference: "Tài liệu tham khảo: Chipkevitch E. et al. Clinical measurement of testicular volume in adolescents: comparison of the reliability of 5 methods. J Urol. 1996 Dec;156(6):2050-3.",
    calibWarning: "Xin vui lòng hiệu chuẩn màn hình!",
    toggle3D: "Khối 3D",
    toggle2D: "Phẳng 2D",
    guideButton: "Hướng dẫn",
    recalibrateButton: "Hiệu chuẩn",
    quickRulerLabel: "1 cm chuẩn",
    quickRulerBtn: "1 cm",
    pinCompare: "So sánh",
    pinUpdateHere: "Ghim mốc",
    pinnedRefLabel: "Mốc ghim",
    soundLabel: "Âm gõ gỗ",
    focusExitHint: "Chạm nền đen hoặc hạt để thoát Focus Mode",
    controlsHide: "Thu gọn",
    controlsShow: "Điều khiển",
    dragHint3D: "Kéo trượt dọc dây · Vuốt ngang để lăn · Chạm hạt đang chọn để Focus",
    dragHint11: "Kích thước chuẩn 1:1 mm theo màn hình đã hiệu chuẩn",
    webglFallback: "Trình duyệt không hỗ trợ tăng tốc WebGL — đang dùng chế độ mô phỏng 2D chuẩn xác.",
    pwaInstall: "Cài đặt App",
    pwaInstallShort: "Thêm vào máy",
    pwaIosTitle: "Cài đặt trên iPhone / iPad",
    pwaIosStep1: "Mở bằng trình duyệt Safari và chạm biểu tượng Chia sẻ (Share).",
    pwaIosStep2: "Cuộn xuống và chọn “Thêm vào Màn hình chính” (Add to Home Screen).",
    pwaIosStep3: "Chạm “Thêm” để mở toàn màn hình và dùng ngoại tuyến.",
    offlineMode: "Chế độ ngoại tuyến — Dữ liệu khám sẵn sàng",
  },
  en: {
    brandTitle: "ePra Dr.Son",
    appName: "Digital Orchidometer",
    consentTitle: "Clinical & Safety Notice",
    consentWarning1: "Do not touch the device screen directly to the examination subject.",
    consentWarning2: "Visual comparison is intended solely for screening when dedicated instruments are unavailable, and does not replace ultrasound volumetry or a physical Prader orchidometer.",
    cancel: "Cancel",
    confirm: "Confirm",
    declinedTitle: "Session Ended",
    declinedDesc: "The application remains inactive until the safety and clinical notices are acknowledged.",
    exit: "Exit",
    calibTitle: "Screen Calibration",
    calibDesc: "Synchronize physical millimeter scale to your display before screening.",
    ruler: "5cm Ruler",
    card: "ID / Bank Card",
    screen: "Screen Size",
    displayMode: "Display Mode",
    vertical: "Vertical",
    horizontal: "Horizontal",
    both: "Dual Axis",
    triple: "Triple",
    beads: "3D Beads",
    screenPrompt: "Select your device preset or tap Auto-detect display size.",
    autoDetectBtn: "Auto-detect",
    autoDetectedNote: "Suggested from screen",
    autoDetectCustomNote: "Custom screen — please verify with the 5cm ruler if needed.",
    cardPrompt: "Align a standard 53.98 × 85.60 mm card inside the dashed frame",
    rulerPrompt: "Align a physical ruler along the 0 – 5 cm calibration scale",
    sliderHint: "Drag slider or tap − / + for pixel precision",
    confirmCalib: "Save Calibration & Continue",
    author: "Clinical innovation by Dr. Do Tien Son",
    worldFirst: "Digital Prader Orchidometer based on the Chipkevitch method",
    stagePrepubertal: "Pre-pubertal (1–3 mL)",
    stageOnset: "Pubertal Onset (4 mL)",
    stagePubertal: "Pubertal (5–12 mL)",
    stageAdult: "Adult Range (15–25 mL)",
    guideTitle: "Clinical Screening Protocol",
    guide1: "Explain the non-contact visual screening procedure to the patient and family.",
    guide2: "Calibrate the screen using a physical ruler, card, or device diagonal; verify anytime with the 1 cm edge ruler.",
    guide3: "Sanitize hands; wear an examination glove on the exposing hand and hold the device parallel with the ungloved hand (or with an assistant).",
    guide4: "Slide 3D beads along the cord or enable Compare to pin a reference bead side-by-side.",
    guide5: "Document the screening estimate and confirm with a physical Prader orchidometer or ultrasound when clinically indicated.",
    guideNote: "Note: 2D projections and the 3D Bead Chain are locked 1:1 to your calibrated px/mm display scale. Re-verify browser zoom before each session.",
    understood: "Close Protocol",
    calibFactor: "Display Scale",
    promoTitle: "Clinical Session Sign In",
    promoDesc: "Enter your account, passcode, and optional Premium code.",
    promoPlaceholder: "Enter code...",
    accountLabel: "Account",
    accountPlaceholder: "Username or email...",
    passcodeLabel: "Passcode",
    passcodePlaceholder: "Enter passcode...",
    premiumCodeLabel: "Premium Code",
    premiumOptionalHint: "Optional",
    premiumCodePlaceholder: "Leave blank if none",
    rememberLabel: "Remember session",
    remember24h: "24h",
    remember7d: "7d",
    signOut: "Sign out",
    signedInAs: "Account",
    loginButton: "Sign In",
    accountRequired: "Please enter an account name.",
    passcodeInvalid: "Invalid passcode.",
    premiumInvalidLogin: "Invalid Premium code — leave blank or enter a valid code.",
    premiumError: "Invalid code — contact Dr. Son for 3D Bead Chain access",
    premiumPromptTitle: "Unlock 3D Bead Chain",
    premiumSuccess: "3D Bead Chain unlocked",
    calibMethodPrefix: "Method",
    calibMethodRuler: "5cm Ruler",
    calibMethodCard: "Standard Card",
    calibMethodScreen: "Device Diagonal",
    calibTimePrefix: "at",
    reference: "Reference: Chipkevitch E. et al. Clinical measurement of testicular volume in adolescents: comparison of the reliability of 5 methods. J Urol. 1996 Dec;156(6):2050-3.",
    calibWarning: "Please calibrate your screen first!",
    toggle3D: "3D Shaded",
    toggle2D: "2D Flat",
    guideButton: "Protocol",
    recalibrateButton: "Calibrate",
    quickRulerLabel: "1 cm check",
    quickRulerBtn: "1 cm",
    pinCompare: "Compare",
    pinUpdateHere: "Pin ref",
    pinnedRefLabel: "Pinned",
    soundLabel: "Wood clack",
    focusExitHint: "Tap background or bead to exit Focus Mode",
    controlsHide: "Hide",
    controlsShow: "Controls",
    dragHint3D: "Drag along cord · Swipe to roll · Tap active bead for Focus",
    dragHint11: "True 1:1 mm calibrated display scale",
    webglFallback: "WebGL hardware context unavailable — switched to precision 2D calibration view.",
    pwaInstall: "Install App",
    pwaInstallShort: "Add to Home",
    pwaIosTitle: "Install on iPhone / iPad",
    pwaIosStep1: "Open in Safari and tap the Share button.",
    pwaIosStep2: "Scroll down and tap “Add to Home Screen”.",
    pwaIosStep3: "Tap “Add” for full-screen & offline screening.",
    offlineMode: "Offline Mode — Ready for screening",
  },
} as const;

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

export const DEVICE_PRESETS = [
  { nameVi: 'Tùy chỉnh (Nhập tay)', nameEn: 'Custom (Manual)', size: 0 },
  { nameVi: 'iPhone 12/13 mini', nameEn: 'iPhone 12/13 mini', size: 5.4 },
  { nameVi: 'iPhone X/XS/11 Pro', nameEn: 'iPhone X/XS/11 Pro', size: 5.8 },
  { nameVi: 'iPhone 11/12/13/14/15/16', nameEn: 'iPhone 11/12/13/14/15/16', size: 6.1 },
  { nameVi: 'iPhone 15/16 Pro', nameEn: 'iPhone 15/16 Pro', size: 6.1 },
  { nameVi: 'iPhone 11 Pro Max/XS Max', nameEn: 'iPhone 11 Pro Max/XS Max', size: 6.5 },
  { nameVi: 'iPhone 12/13/14 Pro Max', nameEn: 'iPhone 12/13/14 Pro Max', size: 6.7 },
  { nameVi: 'iPhone 14/15/16 Plus', nameEn: 'iPhone 14/15/16 Plus', size: 6.7 },
  { nameVi: 'iPhone 15/16 Pro Max', nameEn: 'iPhone 15/16 Pro Max', size: 6.7 },
  { nameVi: 'Galaxy S23/S24', nameEn: 'Galaxy S23/S24', size: 6.1 },
  { nameVi: 'Galaxy S23+/S24+', nameEn: 'Galaxy S23+/S24+', size: 6.6 },
  { nameVi: 'Galaxy S23/S24 Ultra', nameEn: 'Galaxy S23/S24 Ultra', size: 6.8 },
];

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
    brandTitle: "Doca Doson",
    appName: "Thước Prader Ảo",
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
    screenPrompt: "Chọn dòng máy đang sử dụng hoặc nhập đường chéo màn hình (inch).",
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
    guide2: "Hiệu chuẩn màn hình với thước kẻ, thẻ chuẩn hoặc model máy; giải thích sơ bộ về các mốc kích thước.",
    guide3: "Sát khuẩn tay; đeo găng tay khám ở tay bộc lộ đối tượng, tay còn lại cầm thiết bị song song để đối chiếu (hoặc nhờ người hỗ trợ cầm máy).",
    guide4: "Dùng phím mũi tên hoặc chạm trực tiếp vào hạt để đổi thể tích (mL). Chạm vào khối elip để vào Focus Mode nền đen.",
    guide5: "Ghi nhận kết quả sàng lọc và đối chiếu bằng thước Prader vật lý hoặc siêu âm khi có chỉ định.",
    guideNote: "Lưu ý: Kích thước elip ở chế độ 2D và chế độ So sánh 1:1 mm trong Chuỗi hạt 3D được tính theo hệ số hiệu chuẩn thực tế. Luôn kiểm tra lại hiệu chuẩn trước mỗi phiên khám.",
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
    viewChain3D: "Chuỗi 3D xoay",
    viewActual11: "Chuẩn 1:1 mm",
    finishResin: "Nhựa y tế",
    finishWood: "Gỗ sồi",
    finishAcrylic: "Acrylic mờ",
    resetCam: "Đặt lại góc nhìn",
    focusExitHint: "Chạm nền đen hoặc hạt để thoát Focus Mode",
    controlsHide: "Thu gọn",
    controlsShow: "Điều khiển",
    dragHint3D: "Kéo hạt trượt dọc dây · Vuốt ngang để lăn hạt · Chạm hạt để Focus",
    dragHint11: "Kích thước chuẩn 1:1 mm theo màn hình đã hiệu chuẩn",
    webglFallback: "Trình duyệt không hỗ trợ tăng tốc WebGL — đang dùng chế độ mô phỏng 2D chuẩn xác.",
  },
  en: {
    brandTitle: "Doca Doson",
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
    screenPrompt: "Select your device preset or enter diagonal screen size (inches).",
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
    guide2: "Calibrate the screen using a physical ruler, standard card, or verified device diagonal.",
    guide3: "Sanitize hands; wear an examination glove on the exposing hand and hold the device parallel with the ungloved hand (or with an assistant).",
    guide4: "Step through volumes using the dock controls or tap any bead directly. Tap the active ellipsoid to enter Focus Mode.",
    guide5: "Document the screening estimate and confirm with a physical Prader orchidometer or ultrasound when clinically indicated.",
    guideNote: "Note: 2D projections and the 3D Bead Chain are locked 1:1 to your calibrated px/mm display scale. Re-verify calibration before each clinical session.",
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
    viewChain3D: "3D Chain",
    viewActual11: "1:1 mm",
    finishResin: "Resin",
    finishWood: "Wood",
    finishAcrylic: "Matte",
    resetCam: "Reset View",
    focusExitHint: "Tap background or bead to exit Focus Mode",
    controlsHide: "Hide",
    controlsShow: "Controls",
    dragHint3D: "Drag bead along cord · Swipe across cord to roll · Tap active bead to Focus",
    dragHint11: "True 1:1 mm calibrated display scale",
    webglFallback: "WebGL hardware context unavailable — switched to precision 2D calibration view.",
  },
} as const;

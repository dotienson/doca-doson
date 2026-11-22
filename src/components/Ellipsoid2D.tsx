import { motion } from 'motion/react';
import type { StageStyle, ThemeMode } from '../data/orchidometer';

interface Ellipsoid2DProps {
  id: string;
  widthMm: number;
  lengthMm: number;
  ppm: number;
  isHorizontal: boolean;
  styleObj: StageStyle;
  isFocused: boolean;
  isHidden: boolean;
  onClick: (id: string | null) => void;
  is3D?: boolean;
  theme?: ThemeMode;
}

export function Ellipsoid2D({
  id,
  widthMm,
  lengthMm,
  ppm,
  isHorizontal,
  styleObj,
  isFocused,
  isHidden,
  onClick,
  is3D = true,
  theme = 'light',
}: Ellipsoid2DProps) {
  const w = isHorizontal ? lengthMm : widthMm;
  const h = isHorizontal ? widthMm : lengthMm;
  const pixelW = w * ppm;
  const pixelH = h * ppm;
  const isLight = theme === 'light' && !isFocused;

  return (
    <div
      className={`relative group flex items-center justify-center transition-opacity duration-300 ${
        isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {is3D && !isFocused && (
        <div
          style={{
            width: `${pixelW * 0.86}px`,
            height: `${Math.max(6, pixelH * 0.2)}px`,
            bottom: `-${Math.max(6, pixelH * 0.1)}px`,
          }}
          className={`absolute rounded-[100%] blur-[6px] pointer-events-none ${
            isLight ? 'bg-slate-900/22' : 'bg-black/70'
          }`}
        />
      )}

      <motion.button
        type="button"
        aria-label={`Ellipsoid ${widthMm} by ${lengthMm} millimeters`}
        onClick={(e) => {
          e.stopPropagation();
          onClick(isFocused ? null : id);
        }}
        whileTap={{ scale: 0.985 }}
        style={{
          width: `${pixelW}px`,
          height: `${pixelH}px`,
          ...(is3D
            ? {
                background: styleObj.radialBg,
                boxShadow: isFocused
                  ? '0 0 36px rgba(255,255,255,0.28), inset 0 2px 6px rgba(255,255,255,0.55)'
                  : isLight
                  ? 'inset 0 2px 5px rgba(255,255,255,0.45), inset 0 -4px 9px rgba(0,0,0,0.45), 0 6px 14px rgba(15,23,42,0.18)'
                  : 'inset 0 2px 5px rgba(255,255,255,0.4), inset 0 -4px 10px rgba(0,0,0,0.6), 0 8px 18px rgba(0,0,0,0.45)',
              }
            : {}),
        }}
        className={`relative overflow-hidden rounded-[100%] transition-shadow duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/80 ${
          is3D
            ? `${isLight ? 'border border-slate-900/15' : 'border border-white/25'} ${isFocused ? 'z-50' : ''}`
            : `bg-gradient-to-br ${styleObj.bg2DClass} border ${
                isFocused ? 'shadow-[0_0_28px_rgba(255,255,255,0.25)] z-50' : ''
              }`
        }`}
      >
        {is3D && (
          <>
            <div
              className="absolute inset-0 pointer-events-none rounded-[100%]"
              style={{
                background:
                  'radial-gradient(ellipse at 35% 26%, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.36) 18%, rgba(255,255,255,0.05) 42%, transparent 65%)',
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none rounded-[100%]"
              style={{
                background:
                  'radial-gradient(ellipse at 72% 76%, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.16) 38%, transparent 68%)',
              }}
            />
          </>
        )}
      </motion.button>
    </div>
  );
}

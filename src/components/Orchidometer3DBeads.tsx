import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Columns2, Pin, Volume2, VolumeX } from 'lucide-react';
import {
  ORCHIDOMETER_DATA,
  VOLUMES,
  getStageStyle,
  triggerHaptic,
  t,
  type Language,
  type ThemeMode,
} from '../data/orchidometer';

// Subtle Web Audio synthesizer for realistic oak wood bead clack (iOS Safari compatible)
let woodAudioCtx: AudioContext | null = null;
let lastWoodClackAt = 0;

function ensureWoodAudioReady() {
  if (typeof window === 'undefined') return;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  if (!woodAudioCtx) {
    woodAudioCtx = new AudioCtx();
  }
  if (woodAudioCtx.state === 'suspended') {
    void woodAudioCtx.resume().catch(() => {});
  }
}

function playWoodClack(intensity = 0.7) {
  if (!woodAudioCtx || woodAudioCtx.state !== 'running') return;
  const nowMs = performance.now();
  if (nowMs - lastWoodClackAt < 85) return;
  lastWoodClackAt = nowMs;

  const ctx = woodAudioCtx;
  const now = ctx.currentTime;
  const vol = Math.max(0.02, Math.min(0.14, 0.1 * intensity));

  // Warm hollow oak body resonance
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(590 + Math.random() * 65, now);
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.026);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.036);

  // Crisp wood surface transient
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = 'sine';
  clickOsc.frequency.setValueAtTime(1180 + Math.random() * 140, now);
  clickOsc.frequency.exponentialRampToValueAtTime(740, now + 0.01);
  clickGain.gain.setValueAtTime(vol * 0.45, now);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.011);
  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);
  clickOsc.start(now);
  clickOsc.stop(now + 0.014);
}

// Pre-allocated math helpers (Zero GC in useFrame)
const _xAxis = new THREE.Vector3(1, 0, 0);
const _tmpVec = new THREE.Vector3();
const _tmpTangent = new THREE.Vector3();

const GAP_REST_MM = 14;
const MIN_TIP_GAP_MM = 2.0;
const TAIL_MARGIN_LEFT_MM = 46;
const TAIL_MARGIN_RIGHT_MM = 48;
const END_KNOT_CLEARANCE_MM = 8;
const CORD_RADIUS_MM = 0.8;
const SPAN_TUBULAR_SEGS = 22;
const SPAN_RADIAL_SEGS = 12;

function detectSoftwareWebGL(): { supported: boolean; isSoftwareGl: boolean } {
  if (typeof document === 'undefined') return { supported: false, isSoftwareGl: true };
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { supported: false, isSoftwareGl: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

// Perpendicular cord curve in chain-local normal axis: scales by cos(angle) so gravity bows horizontal spans
// and vanishes cleanly to 0 when vertical (-90° -> straight vertical cord under downward gravity).
function cordLocalWave(s: number, angleRad: number): number {
  return Math.cos(angleRad) * (0.00014 * s * s - 6.5 + Math.sin(s * 0.011) * 1.4);
}

function cordLocalWaveSlope(s: number, angleRad: number): number {
  return Math.cos(angleRad) * (0.00028 * s + Math.cos(s * 0.011) * 1.4 * 0.011);
}

function cordWorldPointAndTangent(
  s: number,
  angleRad: number
): { x: number; y: number; tx: number; ty: number } {
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const w = cordLocalWave(s, angleRad);
  const dw = cordLocalWaveSlope(s, angleRad);

  const x = s * cosA - w * sinA;
  const y = s * sinA + w * cosA;

  const rawTx = cosA - dw * sinA;
  const rawTy = sinA + dw * cosA;
  const len = Math.hypot(rawTx, rawTy) || 1;
  return { x, y, tx: rawTx / len, ty: rawTy / len };
}

interface BeadSpec {
  volume: number;
  idx: number;
  lengthMm: number;
  widthMm: number;
  poleOffset: number;
  restX: number;
}

interface InitialChainConfig {
  specs: BeadSpec[];
  startS: number;
  endS: number;
}

function computeInitialChainConfig(): InitialChainConfig {
  let cursorX = 0;
  const rawXs: number[] = [];

  VOLUMES.forEach((vol) => {
    const [len] = ORCHIDOMETER_DATA[vol];
    rawXs.push(cursorX + len / 2);
    cursorX += len + GAP_REST_MM;
  });

  const totalSpan = cursorX - GAP_REST_MM;
  const centerOffset = totalSpan / 2;

  const specs: BeadSpec[] = VOLUMES.map((vol, idx) => {
    const [len, width] = ORCHIDOMETER_DATA[vol];
    return {
      volume: vol,
      idx,
      lengthMm: len,
      widthMm: width,
      poleOffset: len * 0.466,
      restX: rawXs[idx] - centerOffset,
    };
  });

  const firstLeftTip = specs[0].restX - specs[0].lengthMm / 2;
  const lastRightTip = specs[specs.length - 1].restX + specs[specs.length - 1].lengthMm / 2;

  const startS = firstLeftTip - TAIL_MARGIN_LEFT_MM;
  const endS = lastRightTip + TAIL_MARGIN_RIGHT_MM;

  return {
    specs,
    startS,
    endS,
  };
}

// Pre-allocate an indexed BufferGeometry for a flexible cord span (zero GC updates in useFrame)
function createCordSpanGeometry(): THREE.BufferGeometry {
  const ringVerts = SPAN_RADIAL_SEGS + 1;
  const totalVerts = (SPAN_TUBULAR_SEGS + 1) * ringVerts;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const indices: number[] = [];

  for (let i = 0; i < SPAN_TUBULAR_SEGS; i++) {
    for (let j = 0; j < SPAN_RADIAL_SEGS; j++) {
      const a = i * ringVerts + j;
      const b = (i + 1) * ringVerts + j;
      const c = (i + 1) * ringVerts + (j + 1);
      const d = i * ringVerts + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

// Zero-allocation Cubic Bezier + Catenary Sag tube generator in XY plane
// Uses bell psi(t) = 16*t^2*(1-t)^2 so psi(0)=psi'(0)=psi(1)=psi'(1)=0, preserving exact G1 alignment at bore holes
function updateCordSpanGeometry(
  geo: THREE.BufferGeometry,
  p0x: number,
  p0y: number,
  c1x: number,
  c1y: number,
  c2x: number,
  c2y: number,
  p3x: number,
  p3y: number,
  sagX: number,
  sagY: number,
  radius: number
): void {
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
  const normAttr = geo.getAttribute('normal') as THREE.BufferAttribute;
  const uvAttr = geo.getAttribute('uv') as THREE.BufferAttribute;

  const posArr = posAttr.array as Float32Array;
  const normArr = normAttr.array as Float32Array;
  const uvArr = uvAttr.array as Float32Array;

  let arcLen = 0;
  let prevPx = p0x;
  let prevPy = p0y;

  for (let i = 0; i <= SPAN_TUBULAR_SEGS; i++) {
    const tVal = i / SPAN_TUBULAR_SEGS;
    const u = 1 - tVal;
    const u2 = u * u;
    const t2 = tVal * tVal;

    const b0 = u2 * u;
    const b1 = 3 * u2 * tVal;
    const b2 = 3 * u * t2;
    const b3 = t2 * tVal;

    const psi = 16 * t2 * u2;
    const psiPrime = 32 * tVal * u * (1 - 2 * tVal);

    const px = b0 * p0x + b1 * c1x + b2 * c2x + b3 * p3x + sagX * psi;
    const py = b0 * p0y + b1 * c1y + b2 * c2y + b3 * p3y + sagY * psi;

    if (i > 0) {
      arcLen += Math.hypot(px - prevPx, py - prevPy);
    }
    prevPx = px;
    prevPy = py;

    // Exact tangent derivative P'(t) including catenary sag bell
    const d1x = c1x - p0x;
    const d1y = c1y - p0y;
    const d2x = c2x - c1x;
    const d2y = c2y - c1y;
    const d3x = p3x - c2x;
    const d3y = p3y - c2y;

    let dpx = 3 * u2 * d1x + 6 * u * tVal * d2x + 3 * t2 * d3x + sagX * psiPrime;
    let dpy = 3 * u2 * d1y + 6 * u * tVal * d2y + 3 * t2 * d3y + sagY * psiPrime;
    const len = Math.hypot(dpx, dpy) || 1;
    dpx /= len;
    dpy /= len;

    // XY plane Bishop frame: T = (dpx, dpy, 0), B = (0, 0, 1), N = T x B = (dpy, -dpx, 0)
    const nxBase = dpy;
    const nyBase = -dpx;

    const uCoord = arcLen * 0.24;

    for (let j = 0; j <= SPAN_RADIAL_SEGS; j++) {
      const theta = (j / SPAN_RADIAL_SEGS) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const nx = nxBase * cosT;
      const ny = nyBase * cosT;
      const nz = sinT;

      const vIdx = i * (SPAN_RADIAL_SEGS + 1) + j;
      const pOff = vIdx * 3;
      posArr[pOff] = px + radius * nx;
      posArr[pOff + 1] = py + radius * ny;
      posArr[pOff + 2] = radius * nz;

      normArr[pOff] = nx;
      normArr[pOff + 1] = ny;
      normArr[pOff + 2] = nz;

      const uOff = vIdx * 2;
      uvArr[uOff] = uCoord;
      uvArr[uOff + 1] = j / SPAN_RADIAL_SEGS;
    }
  }

  posAttr.needsUpdate = true;
  normAttr.needsUpdate = true;
  uvAttr.needsUpdate = true;
  geo.computeBoundingSphere();
}

// Solve sliding bead `k` to `desiredX`, pushing neighboring beads softly without overlap within cord stops
function solveChainSlide(
  xs: Float64Array,
  specs: BeadSpec[],
  startAnchorX: number,
  endAnchorX: number,
  k: number,
  desiredX: number
): boolean {
  const n = specs.length;

  let leftLimit = startAnchorX + END_KNOT_CLEARANCE_MM + specs[k].lengthMm / 2;
  for (let j = 0; j < k; j++) {
    leftLimit += specs[j].lengthMm + MIN_TIP_GAP_MM;
  }

  let rightLimit = endAnchorX - END_KNOT_CLEARANCE_MM - specs[k].lengthMm / 2;
  for (let j = k + 1; j < n; j++) {
    rightLimit -= specs[j].lengthMm + MIN_TIP_GAP_MM;
  }

  const clampedX = Math.max(leftLimit, Math.min(rightLimit, desiredX));
  let hitNeighbor = false;

  xs[k] = clampedX;

  for (let i = k + 1; i < n; i++) {
    const minReq = xs[i - 1] + specs[i - 1].lengthMm / 2 + specs[i].lengthMm / 2 + MIN_TIP_GAP_MM;
    if (xs[i] < minReq) {
      xs[i] = minReq;
      hitNeighbor = true;
    }
  }

  for (let i = k - 1; i >= 0; i--) {
    const maxAllow = xs[i + 1] - specs[i].lengthMm / 2 - specs[i + 1].lengthMm / 2 - MIN_TIP_GAP_MM;
    if (xs[i] > maxAllow) {
      xs[i] = maxAllow;
      hitNeighbor = true;
    }
  }

  return hitNeighbor;
}

function blendHex(hexA: string, hexB: string, t: number): string {
  const parse = (h: string) => {
    const clean = h.replace('#', '');
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  };
  const [r1, g1, b1] = parse(hexA);
  const [r2, g2, b2] = parse(hexB);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`;
}

// High-DPI (2048x1024) Stained Oak Wood Albedo + Crisp Front & Back Engraved Volume Numeral Map
function createOakBeadMaps(
  volume: number,
  baseHex: string,
  _highlightHex: string,
  darkHex: string,
  maxAnisotropy: number,
  isVertical: boolean
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const width = 2048;
  const height = 1024;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 1024;
  bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Warm satin-stained beech/oak tones (rich and lively without dark muddiness)
  const warmOakMid = '#7d522d';
  const warmOakDeep = '#4a2c12';
  const stainedTop = blendHex(baseHex, warmOakMid, 0.12);
  const stainedMid = blendHex(baseHex, warmOakMid, 0.22);
  const stainedDark = blendHex(darkHex, warmOakDeep, 0.24);

  // Stained Oak Wood Base Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, stainedTop);
  grad.addColorStop(0.28, stainedMid);
  grad.addColorStop(0.74, stainedMid);
  grad.addColorStop(1, stainedDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, bumpCanvas.width, bumpCanvas.height);

  // Soft, sanded longitudinal wood fibers & subtle medullary rings
  for (let i = 0; i < 72; i++) {
    const yBase = (i / 72) * height;
    const isDarkRing = i % 4 === 0;
    const alpha = isDarkRing ? 0.13 : 0.05 + ((i * 37) % 10) * 0.004;
    ctx.strokeStyle = isDarkRing
      ? `rgba(38, 18, 5, ${alpha})`
      : `rgba(64, 32, 10, ${alpha})`;
    ctx.lineWidth = isDarkRing ? 7.5 : 3.8;

    bCtx.strokeStyle = isDarkRing ? 'rgba(55, 55, 55, 0.18)' : 'rgba(175, 175, 175, 0.09)';
    bCtx.lineWidth = isDarkRing ? 3.2 : 1.5;

    ctx.beginPath();
    bCtx.beginPath();
    for (let x = 0; x <= width; x += 32) {
      const wave =
        Math.sin(x * 0.006 + i * 0.55) * 14 +
        Math.cos(x * 0.015 + i * 1.1) * 5;
      const y = yBase + wave;
      if (x === 0) {
        ctx.moveTo(x, y);
        bCtx.moveTo(x * 0.5, y * 0.5);
      } else {
        ctx.lineTo(x, y);
        bCtx.lineTo(x * 0.5, y * 0.5);
      }
    }
    ctx.stroke();
    bCtx.stroke();
  }

  // Faint fine wood pores (sanded smooth under satin varnish)
  ctx.fillStyle = 'rgba(30, 14, 4, 0.08)';
  for (let p = 0; p < 340; p++) {
    const px = (p * 7919) % width;
    const py = (p * 3571) % height;
    const plen = 14 + (p % 26);
    ctx.fillRect(px, py, plen, 2);
  }

  const label = `${volume}`;
  const drawFrontVolumeLabel = (cx: number, cy: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    bCtx.save();
    bCtx.translate(cx * 0.5, cy * 0.5);

    if (isVertical) {
      // Vertical chain hangs downward (-pi/2): rotate -pi/2 so mL reads upright on screen
      ctx.rotate(-Math.PI / 2);
      ctx.scale(1.18, 0.86);
      bCtx.rotate(-Math.PI / 2);
      bCtx.scale(1.18, 0.86);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    bCtx.textAlign = 'center';
    bCtx.textBaseline = 'middle';

    const numFontSize = isVertical ? 148 : 188;
    const numOffsetY = isVertical ? -18 : -14;
    const numLineW = isVertical ? 11 : 13;

    ctx.font = `700 ${numFontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = numLineW;
    ctx.strokeStyle = 'rgba(12, 8, 4, 0.88)';
    ctx.strokeText(label, 0, numOffsetY);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(label, 0, numOffsetY);

    bCtx.font = `700 ${numFontSize * 0.5}px "Plus Jakarta Sans", sans-serif`;
    bCtx.fillStyle = '#525252';
    bCtx.fillText(label, 0, numOffsetY * 0.5);

    const unitFontSize = isVertical ? 56 : 64;
    const unitOffsetY = isVertical ? 92 : 106;
    const unitLineW = isVertical ? 6 : 7;

    ctx.font = `600 ${unitFontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.lineWidth = unitLineW;
    ctx.strokeStyle = 'rgba(12, 8, 4, 0.82)';
    ctx.strokeText('mL', 0, unitOffsetY);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('mL', 0, unitOffsetY);

    bCtx.font = `600 ${unitFontSize * 0.5}px "Plus Jakarta Sans", sans-serif`;
    bCtx.fillStyle = '#565656';
    bCtx.fillText('mL', 0, unitOffsetY * 0.5);

    ctx.restore();
    bCtx.restore();
  };

  const drawBackEngraving = (cx: number, cy: number) => {
    const brandText = 'Dr.Sơn';

    // Longitudinal axis of the bead (rotate 180° so after rolling 180° around cord X-axis it reads cleanly)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI);
    ctx.scale(0.84, 1.0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '700 106px "Plus Jakarta Sans", sans-serif';
    ctx.lineJoin = 'round';
    // Subtle carved rim catchlight + deep burnt-wood recess + warm natural wood inlay
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(20, 10, 3, 0.90)';
    ctx.strokeText(brandText, 0, 0);
    ctx.fillStyle = 'rgba(255, 245, 224, 0.94)';
    ctx.fillText(brandText, 0, 1);
    ctx.restore();

    // Matching physical recessed groove on bump map for authentic wood engraving highlights
    bCtx.save();
    bCtx.translate(cx * 0.5, cy * 0.5);
    bCtx.rotate(Math.PI);
    bCtx.scale(0.84, 1.0);
    bCtx.textAlign = 'center';
    bCtx.textBaseline = 'middle';
    bCtx.font = '700 53px "Plus Jakarta Sans", sans-serif';
    bCtx.lineJoin = 'round';
    bCtx.lineWidth = 4;
    bCtx.strokeStyle = '#bcbcbc';
    bCtx.strokeText(brandText, 0, -0.8);
    bCtx.fillStyle = '#181818';
    bCtx.fillText(brandText, 0, 0);
    bCtx.restore();
  };

  // Front face (+Z at u = 0.5): crisp mL volume marking
  drawFrontVolumeLabel(width * 0.5, height * 0.5);
  // Back face (-Z across u = 0 / 1 seam): engraved "Dr.Sơn" along bead longitudinal axis
  drawBackEngraving(0, height * 0.5);
  drawBackEngraving(width, height * 0.5);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = Math.min(16, maxAnisotropy);
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.anisotropy = Math.min(8, maxAnisotropy);
  bumpMap.needsUpdate = true;

  return { map, bumpMap };
}

interface FabricCordMaps {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

// Procedural Braided Cotton/Linen Fabric Cord Texture Set (Albedo + Herringbone Weave Relief + Matte Roughness)
function createWovenFabricCordMaps(maxAnisotropy: number): FabricCordMaps {
  const width = 512;
  const height = 256;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rCtx = roughCanvas.getContext('2d')!;

  // Deep weave valley base (unbleached natural cotton cord)
  ctx.fillStyle = '#7c7260';
  ctx.fillRect(0, 0, width, height);

  bCtx.fillStyle = '#242424';
  bCtx.fillRect(0, 0, width, height);

  rCtx.fillStyle = '#f5f5f5';
  rCtx.fillRect(0, 0, width, height);

  const step = 32;
  const drawYarnStrand = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    isLightPly: boolean
  ) => {
    // Deep shadow edge around each braided bundle
    ctx.strokeStyle = 'rgba(42, 36, 28, 0.72)';
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // Main cotton ply body
    ctx.strokeStyle = isLightPly ? '#dfd7c3' : '#cfc5ad';
    ctx.lineWidth = 11.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // Multi-thread spun micro-fibers inside each braided ply
    for (let f = -3.2; f <= 3.2; f += 2.1) {
      ctx.strokeStyle = isLightPly
        ? 'rgba(248, 244, 232, 0.55)'
        : 'rgba(222, 214, 194, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + f);
      ctx.lineTo(x1, y1 + f);
      ctx.stroke();
    }

    // Bump relief: rounded crest per ply
    bCtx.strokeStyle = '#707070';
    bCtx.lineWidth = 13;
    bCtx.lineCap = 'round';
    bCtx.beginPath();
    bCtx.moveTo(x0, y0);
    bCtx.lineTo(x1, y1);
    bCtx.stroke();

    bCtx.strokeStyle = isLightPly ? '#f2f2f2' : '#d2d2d2';
    bCtx.lineWidth = 7.5;
    bCtx.beginPath();
    bCtx.moveTo(x0, y0);
    bCtx.lineTo(x1, y1);
    bCtx.stroke();

    // Roughness variation: valleys rougher, fiber crests slightly softer
    rCtx.strokeStyle = '#d4d4d4';
    rCtx.lineWidth = 8;
    rCtx.lineCap = 'round';
    rCtx.beginPath();
    rCtx.moveTo(x0, y0);
    rCtx.lineTo(x1, y1);
    rCtx.stroke();
  };

  // Interleaving +45° / -45° diamond braid segments for realistic over-under cloth weave
  for (let row = -height; row < width + height; row += step) {
    for (let seg = -2; seg < 12; seg++) {
      const xStart = row + seg * step;
      const yStart = seg * step;
      // Right-leaning ply segment
      drawYarnStrand(xStart, yStart, xStart + step * 0.72, yStart + step * 0.72, seg % 2 === 0);
      // Left-leaning interlocking ply segment
      const lx = row + seg * step + step * 0.5;
      const ly = seg * step;
      drawYarnStrand(lx, ly, lx - step * 0.72, ly + step * 0.72, (seg + 1) % 2 === 0);
    }
  }

  // Subtle organic cotton fiber slub noise
  for (let n = 0; n < 1400; n++) {
    const nx = (n * 4999) % width;
    const ny = (n * 3571) % height;
    ctx.fillStyle = n % 2 === 0 ? 'rgba(255, 252, 242, 0.12)' : 'rgba(65, 55, 42, 0.1)';
    ctx.fillRect(nx, ny, 3 + (n % 5), 1.5);
  }

  const configureTex = (canvas: HTMLCanvasElement, isColor: boolean) => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 2);
    tex.anisotropy = Math.min(8, maxAnisotropy);
    tex.needsUpdate = true;
    return tex;
  };

  return {
    map: configureTex(colorCanvas, true),
    bumpMap: configureTex(bumpCanvas, false),
    roughnessMap: configureTex(roughCanvas, false),
  };
}

function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    return () => {
      scene.environment = null;
      envTarget.dispose();
    };
  }, [gl, scene]);

  return null;
}

interface ChainRuntimeState {
  xs: Float64Array;
  slideVel: Float64Array;
  rolls: Float64Array;
  rollVel: Float64Array;
  wasColliding: boolean;
  tiltX: number;
  tiltY: number;
  swayX: number;
  angleRad: number;
  targetAngleRad: number;
  cordDirty: boolean;
}

interface BeadAssemblyProps {
  spec: BeadSpec;
  isActive: boolean;
  isFocused: boolean;
  isVertical: boolean;
  isSoftwareGl: boolean;
  sharedSphereGeo: THREE.SphereGeometry;
  sharedBoreHoleGeo: THREE.CylinderGeometry;
  sharedBoreRimGeo: THREE.TorusGeometry;
  sharedInnerCordGeo: THREE.CylinderGeometry;
  cordMaps: FabricCordMaps;
  maxAnisotropy: number;
  registerOuterGroup: (idx: number, g: THREE.Group | null) => void;
  registerRollGroup: (idx: number, g: THREE.Group | null) => void;
  onBeadPointerDown: (idx: number, clientX: number, clientY: number) => void;
  onTapBead: (idx: number, isAlreadyActive: boolean) => void;
}

function BeadAssembly({
  spec,
  isActive,
  isFocused,
  isVertical,
  isSoftwareGl,
  sharedSphereGeo,
  sharedBoreHoleGeo,
  sharedBoreRimGeo,
  sharedInnerCordGeo,
  cordMaps,
  maxAnisotropy,
  registerOuterGroup,
  registerRollGroup,
  onBeadPointerDown,
  onTapBead,
}: BeadAssemblyProps) {
  const [hovered, setHovered] = useState(false);
  const style = getStageStyle(spec.volume);

  const initialTransform = useMemo(() => {
    const pt = cordWorldPointAndTangent(spec.restX, 0);
    const tangent = new THREE.Vector3(pt.tx, pt.ty, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(_xAxis, tangent);
    return {
      position: [pt.x, pt.y, 0] as [number, number, number],
      quaternion: [quat.x, quat.y, quat.z, quat.w] as [number, number, number, number],
    };
  }, [spec.restX]);

  const oakMaps = useMemo(
    () =>
      createOakBeadMaps(
        spec.volume,
        style.hex,
        style.hexHighlight,
        style.hexDark,
        maxAnisotropy,
        isVertical
      ),
    [spec.volume, style.hex, style.hexHighlight, style.hexDark, maxAnisotropy, isVertical]
  );

  useEffect(() => {
    return () => {
      oakMaps.map.dispose();
      oakMaps.bumpMap.dispose();
    };
  }, [oakMaps]);

  useEffect(() => {
    if (hovered) document.body.style.cursor = 'grab';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  const boreRadius = 1.02;
  const isHiddenInFocus = isFocused && !isActive;

  return (
    <group
      ref={(g) => registerOuterGroup(spec.idx, g)}
      position={initialTransform.position}
      quaternion={initialTransform.quaternion}
      visible={!isHiddenInFocus}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
      onPointerDown={(e) => {
        // Record which bead was grabbed before DOM event bubbles to container
        onBeadPointerDown(spec.idx, e.clientX, e.clientY);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onTapBead(spec.idx, isActive);
      }}
    >
      {/* Stationary internal woven fabric cord axle passing dead-center through both bore holes */}
      {!isFocused && (
        <mesh
          geometry={sharedInnerCordGeo}
          rotation={[0, 0, Math.PI / 2]}
          scale={[1, spec.poleOffset * 2, 1]}
        >
          <meshPhysicalMaterial
            map={cordMaps.map}
            bumpMap={cordMaps.bumpMap}
            bumpScale={0.25}
            roughnessMap={cordMaps.roughnessMap}
            roughness={0.94}
            metalness={0}
            sheen={1.0}
            sheenRoughness={0.86}
            sheenColor="#faf5e8"
            envMapIntensity={0.45}
          />
        </mesh>
      )}

      {/* Rolling group: rotates in-place around longitudinal cord axis (local X) */}
      <group ref={(g) => registerRollGroup(spec.idx, g)}>
        {/* Satin-Varnished Oak Wood Prolate Ellipsoid (Exact 1:1 mm scale) */}
        <mesh
          geometry={sharedSphereGeo}
          scale={[spec.lengthMm, spec.widthMm, spec.widthMm]}
          castShadow={!isSoftwareGl}
          receiveShadow={!isSoftwareGl}
        >
          <meshPhysicalMaterial
            map={oakMaps.map}
            bumpMap={oakMaps.bumpMap}
            bumpScale={0.09}
            roughness={0.56}
            metalness={0.0}
            reflectivity={0.42}
            clearcoat={0.15}
            clearcoatRoughness={0.46}
            envMapIntensity={0.42}
            emissive={hovered && !isFocused ? style.hex : '#000000'}
            emissiveIntensity={hovered && !isFocused ? 0.035 : 0}
          />
        </mesh>

        {/* Flush Drilled Bore Holes seated inside left/right pole coordinates */}
        <mesh
          geometry={sharedBoreHoleGeo}
          position={[-(spec.poleOffset - 0.25), 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          scale={[boreRadius, 0.9, boreRadius]}
        >
          <meshStandardMaterial color="#07090c" roughness={0.94} metalness={0.05} />
        </mesh>
        <mesh
          geometry={sharedBoreHoleGeo}
          position={[spec.poleOffset - 0.25, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          scale={[boreRadius, 0.9, boreRadius]}
        >
          <meshStandardMaterial color="#07090c" roughness={0.94} metalness={0.05} />
        </mesh>

        {/* Flush Chamfered Wood Bore Rims */}
        <mesh
          geometry={sharedBoreRimGeo}
          position={[-spec.poleOffset, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[boreRadius, boreRadius, 0.4]}
        >
          <meshStandardMaterial color={style.hexDark} roughness={0.65} metalness={0.05} />
        </mesh>
        <mesh
          geometry={sharedBoreRimGeo}
          position={[spec.poleOffset, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[boreRadius, boreRadius, 0.4]}
        >
          <meshStandardMaterial color={style.hexDark} roughness={0.65} metalness={0.05} />
        </mesh>
      </group>
    </group>
  );
}

interface ChainSceneProps {
  chainConfig: InitialChainConfig;
  chainStateRef: React.MutableRefObject<ChainRuntimeState>;
  currentVolumeIdx: number;
  pixelsPerMm: number;
  isFocused: boolean;
  isVertical: boolean;
  isSoftwareGl: boolean;
  theme: ThemeMode;
  soundEnabled: boolean;
  compareEnabled: boolean;
  pinnedIdx: number;
  camDragOffsetMmRef: React.MutableRefObject<number>;
  dragModeRef: React.MutableRefObject<'none' | 'pan' | 'bead' | 'roll-active'>;
  wasDraggedRef: React.MutableRefObject<boolean>;
  onBeadPointerDown: (idx: number, clientX: number, clientY: number) => void;
  onSelectBead: (idx: number, isAlreadyActive: boolean) => void;
  onBackgroundClick: () => void;
}

function ChainScene({
  chainConfig,
  chainStateRef,
  currentVolumeIdx,
  pixelsPerMm,
  isFocused,
  isVertical,
  isSoftwareGl,
  theme,
  soundEnabled,
  compareEnabled,
  pinnedIdx,
  camDragOffsetMmRef,
  dragModeRef,
  wasDraggedRef,
  onBeadPointerDown,
  onSelectBead,
  onBackgroundClick,
}: ChainSceneProps) {
  const { gl, camera } = useThree();
  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);

  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);
  const startKnotRef = useRef<THREE.Group>(null);
  const endKnotRef = useRef<THREE.Group>(null);
  const pinnedGroupRef = useRef<THREE.Group>(null);
  const pinnedRollRef = useRef<THREE.Group>(null);
  const outerGroupRefs = useRef<(THREE.Group | null)[]>(
    new Array(chainConfig.specs.length).fill(null)
  );
  const rollGroupRefs = useRef<(THREE.Group | null)[]>(
    new Array(chainConfig.specs.length).fill(null)
  );

  const registerOuterGroup = useCallback((idx: number, g: THREE.Group | null) => {
    outerGroupRefs.current[idx] = g;
  }, []);

  const registerRollGroup = useCallback((idx: number, g: THREE.Group | null) => {
    rollGroupRefs.current[idx] = g;
  }, []);

  useEffect(() => {
    const ortho = camera as THREE.OrthographicCamera;
    if (ortho.isOrthographicCamera) {
      ortho.zoom = pixelsPerMm;
      ortho.updateProjectionMatrix();
    }
  }, [camera, pixelsPerMm]);

  const sharedGeos = useMemo(() => {
    const sphere = new THREE.SphereGeometry(0.5, 56, 38, -Math.PI / 2, Math.PI * 2);
    const boreHole = new THREE.CylinderGeometry(1, 1, 1, 24);
    const boreRim = new THREE.TorusGeometry(1, 0.18, 12, 28);
    const innerCord = new THREE.CylinderGeometry(CORD_RADIUS_MM, CORD_RADIUS_MM, 1, 12);
    return { sphere, boreHole, boreRim, innerCord };
  }, []);

  useEffect(() => {
    return () => {
      sharedGeos.sphere.dispose();
      sharedGeos.boreHole.dispose();
      sharedGeos.boreRim.dispose();
      sharedGeos.innerCord.dispose();
    };
  }, [sharedGeos]);

  const cordResources = useMemo(() => {
    const spanCount = chainConfig.specs.length + 1; // 13 spans: start tail + 11 gaps + end tail
    const spanGeos = Array.from({ length: spanCount }, () => createCordSpanGeometry());
    const cordMaps = createWovenFabricCordMaps(maxAnisotropy);
    return { spanGeos, cordMaps };
  }, [chainConfig.specs.length, maxAnisotropy]);

  useEffect(() => {
    return () => {
      cordResources.spanGeos.forEach((g) => g.dispose());
      cordResources.cordMaps.map.dispose();
      cordResources.cordMaps.bumpMap.dispose();
      cordResources.cordMaps.roughnessMap.dispose();
    };
  }, [cordResources]);

  const refreshCordSpans = useCallback(() => {
    const state = chainStateRef.current;
    const xs = state.xs;
    const specs = chainConfig.specs;
    const n = specs.length;
    const { startS, endS } = chainConfig;
    const spanGeos = cordResources.spanGeos;
    const swayX = state.swayX;
    const angleRad = state.angleRad;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    const absCosA = Math.abs(cosA);
    const absSinA = Math.abs(sinA);

    // Downward perpendicular gravity drape vector: (sinA * cosA, -cos^2(A))
    // Equals (0, -1) when horizontal, vanishes cleanly to (0, 0) when vertical (straight cord!).
    const dropUnitX = sinA * cosA;
    const dropUnitY = -(cosA * cosA);

    const startFreeSway = absCosA + (sinA > 0 ? absSinA * 1.15 : absSinA * 0.2);
    const endFreeSway = absCosA + (sinA < 0 ? absSinA * 1.15 : absSinA * 0.2);

    // 0. Start tail -> bead 0 entry pole
    {
      const pt0 = cordWorldPointAndTangent(xs[0], angleRad);
      const lpX = pt0.x - pt0.tx * specs[0].poleOffset;
      const lpY = pt0.y - pt0.ty * specs[0].poleOffset;

      const startBase = cordWorldPointAndTangent(startS, angleRad);
      const startEndX = startBase.x + dropUnitX * 18 + swayX * 1.4 * startFreeSway;
      const startEndY = startBase.y + dropUnitY * 18;

      const tailSpan = Math.hypot(lpX - startEndX, lpY - startEndY);
      const tailSag = Math.min(8.5, 3.2 + tailSpan * 0.085);

      const c1x =
        startEndX + swayX * 0.7 * startFreeSway + cosA * (tailSpan * 0.18) - dropUnitX * (tailSpan * 0.22);
      const c1y =
        startEndY + sinA * (tailSpan * 0.18) - dropUnitY * (tailSpan * 0.22);

      updateCordSpanGeometry(
        spanGeos[0],
        startEndX,
        startEndY,
        c1x,
        c1y,
        lpX - pt0.tx * Math.min(18, tailSpan * 0.36),
        lpY - pt0.ty * Math.min(18, tailSpan * 0.36),
        lpX,
        lpY,
        tailSag * dropUnitX + swayX * 0.65 * absCosA,
        tailSag * dropUnitY,
        CORD_RADIUS_MM
      );

      if (startKnotRef.current) {
        startKnotRef.current.position.set(startEndX, startEndY, 0);
        startKnotRef.current.rotation.set(0, 0, Math.atan2(startEndY - c1y, startEndX - c1x));
      }
    }

    // 1..n-1. Intermediate spans: sag follows perpendicular component of world gravity (straight when vertical)
    for (let i = 0; i < n - 1; i++) {
      const ptI = cordWorldPointAndTangent(xs[i], angleRad);
      const pSx = ptI.x + ptI.tx * specs[i].poleOffset;
      const pSy = ptI.y + ptI.ty * specs[i].poleOffset;

      const ptNext = cordWorldPointAndTangent(xs[i + 1], angleRad);
      const pEx = ptNext.x - ptNext.tx * specs[i + 1].poleOffset;
      const pEy = ptNext.y - ptNext.ty * specs[i + 1].poleOffset;

      const spanDx = pEx - pSx;
      const spanDy = pEy - pSy;
      const spanLen = Math.hypot(spanDx, spanDy) || 1;
      const ex = spanDx / spanLen;
      const ey = spanDy / spanLen;
      const handleLen = spanLen * 0.38;

      const slackRest = GAP_REST_MM + 2.8;
      const catenaryBase =
        spanLen <= slackRest
          ? 2.6 + Math.sqrt(Math.max(0, slackRest - spanLen)) * 1.05
          : 2.6 * Math.exp(-(spanLen - slackRest) * 0.095) + 0.35;

      // Projection of world gravity (0, -1) perpendicular to span direction (ex, ey): (ex*ey, -ex^2)
      const gravPerpX = ex * ey;
      const gravPerpY = -(ex * ex);

      updateCordSpanGeometry(
        spanGeos[i + 1],
        pSx,
        pSy,
        pSx + ptI.tx * handleLen,
        pSy + ptI.ty * handleLen,
        pEx - ptNext.tx * handleLen,
        pEy - ptNext.ty * handleLen,
        pEx,
        pEy,
        catenaryBase * gravPerpX + swayX * (catenaryBase * 0.22 * Math.abs(ex)),
        catenaryBase * gravPerpY,
        CORD_RADIUS_MM
      );
    }

    // n. Last bead exit pole -> end tail
    {
      const last = n - 1;
      const ptLast = cordWorldPointAndTangent(xs[last], angleRad);
      const rpX = ptLast.x + ptLast.tx * specs[last].poleOffset;
      const rpY = ptLast.y + ptLast.ty * specs[last].poleOffset;

      const endBase = cordWorldPointAndTangent(endS, angleRad);
      const endEndX = endBase.x + dropUnitX * 19 + swayX * 1.4 * endFreeSway;
      const endEndY = endBase.y + dropUnitY * 19;

      const tailSpan = Math.hypot(endEndX - rpX, endEndY - rpY);
      const tailSag = Math.min(9.0, 3.4 + tailSpan * 0.085);

      const c2x =
        endEndX + swayX * 0.7 * endFreeSway - cosA * (tailSpan * 0.18) - dropUnitX * (tailSpan * 0.22);
      const c2y =
        endEndY - sinA * (tailSpan * 0.18) - dropUnitY * (tailSpan * 0.22);

      updateCordSpanGeometry(
        spanGeos[n],
        rpX,
        rpY,
        rpX + ptLast.tx * Math.min(18, tailSpan * 0.36),
        rpY + ptLast.ty * Math.min(18, tailSpan * 0.36),
        c2x,
        c2y,
        endEndX,
        endEndY,
        tailSag * dropUnitX + swayX * 0.65 * absCosA,
        tailSag * dropUnitY,
        CORD_RADIUS_MM
      );

      if (endKnotRef.current) {
        endKnotRef.current.position.set(endEndX, endEndY, 0);
        endKnotRef.current.rotation.set(0, 0, Math.atan2(endEndY - c2y, endEndX - c2x));
      }
    }
  }, [chainConfig, chainStateRef, cordResources.spanGeos]);

  // Populate initial cord spans immediately on mount
  useEffect(() => {
    refreshCordSpans();
  }, [refreshCordSpans]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const ortho = camera as THREE.OrthographicCamera;
    if (ortho.isOrthographicCamera && Math.abs(ortho.zoom - pixelsPerMm) > 0.001) {
      ortho.zoom = pixelsPerMm;
      ortho.updateProjectionMatrix();
    }

    const state = chainStateRef.current;
    const specs = chainConfig.specs;
    const n = specs.length;

    // Smoothly transition chain orientation between Horizontal (0) and Vertical (-pi/2)
    const angleDiff = state.targetAngleRad - state.angleRad;
    if (Math.abs(angleDiff) > 0.0005) {
      state.angleRad += angleDiff * (1 - Math.exp(-12 * delta));
      state.cordDirty = true;
    } else if (state.angleRad !== state.targetAngleRad) {
      state.angleRad = state.targetAngleRad;
      state.cordDirty = true;
    }

    // 1. Dynamic lighting from DeviceOrientation tilt (smoothly damped)
    if (keyLightRef.current) {
      const targetLx = -75 + state.tiltX * 58;
      const targetLy = 105 - state.tiltY * 48;
      const targetLz = 130 - (Math.abs(state.tiltX) + Math.abs(state.tiltY)) * 12;
      keyLightRef.current.position.x = THREE.MathUtils.damp(
        keyLightRef.current.position.x,
        targetLx,
        8,
        delta
      );
      keyLightRef.current.position.y = THREE.MathUtils.damp(
        keyLightRef.current.position.y,
        targetLy,
        8,
        delta
      );
      keyLightRef.current.position.z = THREE.MathUtils.damp(
        keyLightRef.current.position.z,
        targetLz,
        8,
        delta
      );
    }
    if (rimLightRef.current) {
      rimLightRef.current.position.x = THREE.MathUtils.damp(
        rimLightRef.current.position.x,
        90 - state.tiltX * 36,
        6,
        delta
      );
      rimLightRef.current.position.y = THREE.MathUtils.damp(
        rimLightRef.current.position.y,
        -55 + state.tiltY * 28,
        6,
        delta
      );
    }

    // 2. Bead inertial slide & in-place longitudinal roll
    const isActivelyDraggingBead = dragModeRef.current === 'bead';
    for (let i = 0; i < n; i++) {
      if (!isActivelyDraggingBead && Math.abs(state.slideVel[i]) > 0.05) {
        const hitNeighbor = solveChainSlide(
          state.xs,
          specs,
          chainConfig.startS,
          chainConfig.endS,
          i,
          state.xs[i] + state.slideVel[i] * delta
        );
        if (hitNeighbor && !state.wasColliding) {
          if (soundEnabled) playWoodClack(Math.min(1, Math.abs(state.slideVel[i]) / 45));
          triggerHaptic(12);
        }
        state.wasColliding = hitNeighbor;
        state.slideVel[i] *= Math.exp(-12 * delta);
        state.cordDirty = true;
      } else if (!isActivelyDraggingBead) {
        state.slideVel[i] = 0;
      }

      if (Math.abs(state.rollVel[i]) > 0.002) {
        state.rolls[i] += state.rollVel[i] * delta;
        state.rollVel[i] *= Math.exp(-5.8 * delta);
      } else {
        state.rollVel[i] = 0;
      }

      // Apply world transforms along tilted/vertical/horizontal cord (Zero GC)
      const outer = outerGroupRefs.current[i];
      if (outer) {
        const pt = cordWorldPointAndTangent(state.xs[i], state.angleRad);
        outer.position.set(pt.x, pt.y, 0);
        _tmpTangent.set(pt.tx, pt.ty, 0);
        outer.quaternion.setFromUnitVectors(_xAxis, _tmpTangent);
      }
      const roller = rollGroupRefs.current[i];
      if (roller) {
        roller.rotation.x = state.rolls[i];
      }
    }

    // 3. Gently sway cord gravity sag with device tilt, and recompute cord spans if shifted
    const targetSwayX = state.tiltX * 2.4;
    if (Math.abs(state.swayX - targetSwayX) > 0.005) {
      state.swayX = THREE.MathUtils.damp(state.swayX, targetSwayX, 6, delta);
      state.cordDirty = true;
    }

    if (state.cordDirty) {
      refreshCordSpans();
      state.cordDirty = false;
    }

    // 4. Camera framing & optional Pinned Reference Compare Bead positioning (1:1 mm)
    const activeS = state.xs[currentVolumeIdx] ?? 0;
    const isPanning = dragModeRef.current === 'pan';

    const nx = -Math.sin(state.angleRad);
    const ny = Math.cos(state.angleRad);
    // Horizontal: place pinned bead -30mm below chain (clear of top HUD). Vertical: +30mm to the right.
    const compareOffsetMm = 30 * (isVertical ? 1 : -1);

    if (compareEnabled && !isFocused && pinnedGroupRef.current) {
      const activePt = cordWorldPointAndTangent(activeS, state.angleRad);
      pinnedGroupRef.current.position.set(
        activePt.x + nx * compareOffsetMm,
        activePt.y + ny * compareOffsetMm,
        0
      );
      _tmpTangent.set(activePt.tx, activePt.ty, 0);
      pinnedGroupRef.current.quaternion.setFromUnitVectors(_xAxis, _tmpTangent);
      if (pinnedRollRef.current) {
        pinnedRollRef.current.rotation.x = THREE.MathUtils.damp(
          pinnedRollRef.current.rotation.x,
          0,
          12,
          delta
        );
      }
    }

    if (dragModeRef.current !== 'bead') {
      const targetS = activeS + (isPanning ? camDragOffsetMmRef.current : 0);
      const camPt = cordWorldPointAndTangent(targetS, state.angleRad);
      const centerShift = compareEnabled && !isFocused ? 0.45 * compareOffsetMm : 0;
      const targetCamX = camPt.x + nx * centerShift;
      const targetCamY = camPt.y + ny * centerShift;
      const dampSpeed = isPanning ? 26 : 10;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, dampSpeed, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, dampSpeed, delta);
      camera.position.z = 200;

      _tmpVec.set(camera.position.x, camera.position.y, 0);
      camera.lookAt(_tmpVec);
    }
  });

  const handleTapBead = (idx: number, isAlreadyActive: boolean) => {
    if (wasDraggedRef.current) return;
    onSelectBead(idx, isAlreadyActive);
  };

  const isLight = theme === 'light';
  const bgHex = isFocused ? '#000000' : isLight ? '#B8C6D6' : '#090B0E';

  const lightTrayTexture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Cool surgical slate-blue clinical examination mat so ivory cord + oak beads + cast shadows pop sharply
    ctx.fillStyle = '#B8C6D6';
    ctx.fillRect(0, 0, size, size);

    const rad = ctx.createRadialGradient(size * 0.5, size * 0.5, 40, size * 0.5, size * 0.5, size * 0.54);
    rad.addColorStop(0, '#CBD6E4');
    rad.addColorStop(0.65, '#BECAD9');
    rad.addColorStop(1, '#B3C1D2');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, size, size);

    // Ultra-subtle fine clinical drape linen texture (anti-glare tactile look)
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.045)';
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    for (let j = 0; j < size; j += 4) {
      ctx.beginPath();
      ctx.moveTo(j, 0);
      ctx.lineTo(j, size);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.anisotropy = Math.min(4, maxAnisotropy);
    tex.needsUpdate = true;
    return tex;
  }, [maxAnisotropy]);

  useEffect(() => {
    return () => {
      lightTrayTexture.dispose();
    };
  }, [lightTrayTexture]);

  return (
    <>
      <color attach="background" args={[bgHex]} />

      <StudioEnvironment />

      <hemisphereLight args={isLight ? ['#f1f5f9', '#475569', 0.48] : ['#dbeafe', '#0b101b', 0.5]} />
      <directionalLight
        ref={keyLightRef}
        position={[-75, 105, 130]}
        intensity={isLight ? 1.52 : 1.68}
        color="#fff8ec"
        castShadow={!isSoftwareGl}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={10}
        shadow-camera-far={340}
        shadow-camera-left={-340}
        shadow-camera-right={340}
        shadow-camera-top={340}
        shadow-camera-bottom={-340}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight
        ref={rimLightRef}
        position={[90, -55, -35]}
        intensity={isLight ? 0.68 : 0.84}
        color={isLight ? '#e2e8f0' : '#93c5fd'}
      />

      {/* Flexible 13-Span Woven Braided Cotton Fabric Cord with Physical Gravity Physics */}
      {!isFocused && (
        <group>
          {cordResources.spanGeos.map((spanGeo, idx) => (
            <mesh
              key={idx}
              geometry={spanGeo}
              frustumCulled={false}
              castShadow={!isSoftwareGl}
            >
              <meshPhysicalMaterial
                map={cordResources.cordMaps.map}
                bumpMap={cordResources.cordMaps.bumpMap}
                bumpScale={0.28}
                roughnessMap={cordResources.cordMaps.roughnessMap}
                roughness={0.94}
                metalness={0}
                sheen={1.0}
                sheenRoughness={0.86}
                sheenColor="#faf5e8"
                envMapIntensity={0.45}
              />
            </mesh>
          ))}
          {/* Woven Fabric Stopper Knots (left/top & right/bottom cord ends) */}
          <group ref={startKnotRef}>
            <mesh castShadow={!isSoftwareGl} rotation={[0.62, 0.38, -0.35]} scale={[1.25, 1.05, 1.05]}>
              <torusGeometry args={[1.0, 0.56, 10, 18]} />
              <meshPhysicalMaterial
                map={cordResources.cordMaps.map}
                bumpMap={cordResources.cordMaps.bumpMap}
                bumpScale={0.28}
                roughness={0.95}
                metalness={0}
                sheen={0.95}
                sheenRoughness={0.88}
                sheenColor="#faf5e8"
              />
            </mesh>
            <mesh castShadow={!isSoftwareGl} rotation={[-0.55, -0.45, 0.4]} scale={[1.15, 0.98, 0.98]}>
              <torusGeometry args={[0.92, 0.5, 10, 16]} />
              <meshPhysicalMaterial
                map={cordResources.cordMaps.map}
                bumpMap={cordResources.cordMaps.bumpMap}
                bumpScale={0.28}
                roughness={0.95}
                metalness={0}
                sheen={0.95}
                sheenRoughness={0.88}
                sheenColor="#faf5e8"
              />
            </mesh>
            <mesh position={[1.35, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow={!isSoftwareGl}>
              <cylinderGeometry args={[0.52, 0.72, 2.4, 10]} />
              <meshPhysicalMaterial
                map={cordResources.cordMaps.map}
                roughness={0.96}
                metalness={0}
                sheen={0.9}
                sheenColor="#faf5e8"
              />
            </mesh>
          </group>
          <group ref={endKnotRef}>
            <mesh castShadow={!isSoftwareGl} rotation={[0.62, -0.38, 0.35]} scale={[1.25, 1.05, 1.05]}>
              <torusGeometry args={[1.0, 0.56, 10, 18]} />
              <meshPhysicalMaterial
                map={cordResources.cordMaps.map}
                bumpMap={cordResources.cordMaps.bumpMap}
                bumpScale={0.28}
                roughness={0.95}
                metalness={0}
                sheen={0.95}
                sheenRoughness={0.88}
                sheenColor="#faf5e8"
              />
            </mesh>
            <mesh castShadow={!isSoftwareGl} rotation={[-0.55, 0.45, -0.4]} scale={[1.15, 0.98, 0.98]}>
              <torusGeometry args={[0.92, 0.5, 10, 16]} />
              <meshPhysicalMaterial
                map={cordResources.cordMaps.map}
                bumpMap={cordResources.cordMaps.bumpMap}
                bumpScale={0.28}
                roughness={0.95}
                metalness={0}
                sheen={0.95}
                sheenRoughness={0.88}
                sheenColor="#faf5e8"
              />
            </mesh>
            <mesh position={[1.35, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow={!isSoftwareGl}>
              <cylinderGeometry args={[0.52, 0.72, 2.4, 10]} />
              <meshPhysicalMaterial
                map={cordResources.cordMaps.map}
                roughness={0.96}
                metalness={0}
                sheen={0.9}
                sheenColor="#faf5e8"
              />
            </mesh>
          </group>
        </group>
      )}

      {/* 12 Oak Wood Prolate Ellipsoid Beads (slide along cord + roll in-place on cord axis) */}
      {chainConfig.specs.map((spec) => (
        <BeadAssembly
          key={spec.volume}
          spec={spec}
          isActive={spec.idx === currentVolumeIdx}
          isFocused={isFocused}
          isVertical={isVertical}
          isSoftwareGl={isSoftwareGl}
          sharedSphereGeo={sharedGeos.sphere}
          sharedBoreHoleGeo={sharedGeos.boreHole}
          sharedBoreRimGeo={sharedGeos.boreRim}
          sharedInnerCordGeo={sharedGeos.innerCord}
          cordMaps={cordResources.cordMaps}
          maxAnisotropy={maxAnisotropy}
          registerOuterGroup={registerOuterGroup}
          registerRollGroup={registerRollGroup}
          onBeadPointerDown={onBeadPointerDown}
          onTapBead={handleTapBead}
        />
      ))}

      {/* Pinned Reference Bead for 1:1 mm Side-by-Side Comparison */}
      {compareEnabled && !isFocused && (
        <BeadAssembly
          key={`pinned-${chainConfig.specs[pinnedIdx].volume}`}
          spec={chainConfig.specs[pinnedIdx]}
          isActive={false}
          isFocused={false}
          isVertical={isVertical}
          isSoftwareGl={isSoftwareGl}
          sharedSphereGeo={sharedGeos.sphere}
          sharedBoreHoleGeo={sharedGeos.boreHole}
          sharedBoreRimGeo={sharedGeos.boreRim}
          sharedInnerCordGeo={sharedGeos.innerCord}
          cordMaps={cordResources.cordMaps}
          maxAnisotropy={maxAnisotropy}
          registerOuterGroup={(_, g) => {
            pinnedGroupRef.current = g;
          }}
          registerRollGroup={(_, g) => {
            pinnedRollRef.current = g;
          }}
          onBeadPointerDown={() => {}}
          onTapBead={() => {}}
        />
      )}

      {/* Matte Clinical Tray Plane */}
      {!isFocused && (
        <mesh
          position={[0, 0, -20]}
          receiveShadow={!isSoftwareGl}
          onClick={() => {
            if (!wasDraggedRef.current) onBackgroundClick();
          }}
        >
          <planeGeometry args={[1800, 1800]} />
          <meshStandardMaterial
            key={isLight ? 'tray-light' : 'tray-dark'}
            map={isLight ? lightTrayTexture : null}
            color={isLight ? '#ffffff' : '#090B0E'}
            roughness={0.95}
            metalness={0.01}
          />
        </mesh>
      )}
    </>
  );
}

export interface Orchidometer3DBeadsProps {
  currentVolumeIdx: number;
  onChangeVolumeIdx: (idx: number) => void;
  pixelsPerMm: number;
  focusedId: string | null;
  onToggleFocus: (id: string | null) => void;
  lang: Language;
  theme?: ThemeMode;
  controlsCollapsed: boolean;
}

export function Orchidometer3DBeads({
  currentVolumeIdx,
  onChangeVolumeIdx,
  pixelsPerMm,
  focusedId,
  onToggleFocus,
  lang,
  theme = 'light',
  controlsCollapsed,
}: Orchidometer3DBeadsProps) {
  const [{ supported, isSoftwareGl }] = useState(() => detectSoftwareWebGL());
  const [contextLost, setContextLost] = useState(false);

  const chainConfig = useMemo(() => computeInitialChainConfig(), []);
  const chainStateRef = useRef<ChainRuntimeState>({
    xs: Float64Array.from(chainConfig.specs.map((s) => s.restX)),
    slideVel: new Float64Array(chainConfig.specs.length),
    rolls: new Float64Array(chainConfig.specs.length),
    rollVel: new Float64Array(chainConfig.specs.length),
    wasColliding: false,
    tiltX: 0,
    tiltY: 0,
    swayX: 0,
    angleRad: 0,
    targetAngleRad: 0,
    cordDirty: false,
  });

  const [isVertical, setIsVertical] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('orchidometer_sound');
    return saved === null ? true : saved === 'true';
  });
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [pinnedIdx, setPinnedIdx] = useState(3); // Default 4 mL pubertal onset landmark

  const isFocused = focusedId !== null;
  const activeVol = VOLUMES[currentVolumeIdx];
  const [activeLen, activeWidth] = ORCHIDOMETER_DATA[activeVol];
  const stageStyle = getStageStyle(activeVol);

  const selectOrientation = useCallback((vertical: boolean) => {
    triggerHaptic(25);
    setIsVertical(vertical);
    chainStateRef.current.targetAngleRad = vertical ? -Math.PI / 2 : 0;
  }, []);

  // DeviceOrientation API tilt listener for dynamic lighting (with iOS 13+ permission support)
  const baselineBetaRef = useRef<number | null>(null);
  const orientationActiveRef = useRef(false);
  const iosPermissionRequestedRef = useRef(false);

  const attachOrientationListener = useCallback(() => {
    if (orientationActiveRef.current || typeof window === 'undefined') return;
    if (!('DeviceOrientationEvent' in window)) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;

      if (baselineBetaRef.current === null) {
        baselineBetaRef.current = Math.max(10, Math.min(75, event.beta));
      }

      const angle = window.screen?.orientation?.angle ?? 0;
      const rawGamma = event.gamma;
      const rawBeta = event.beta - baselineBetaRef.current;

      let tx = 0;
      let ty = 0;

      if (angle === 90) {
        tx = rawBeta / 38;
        ty = -rawGamma / 38;
      } else if (angle === 270 || angle === -90) {
        tx = -rawBeta / 38;
        ty = rawGamma / 38;
      } else if (angle === 180) {
        tx = -rawGamma / 38;
        ty = -rawBeta / 38;
      } else {
        tx = rawGamma / 38;
        ty = rawBeta / 38;
      }

      chainStateRef.current.tiltX = Math.max(-1, Math.min(1, tx));
      chainStateRef.current.tiltY = Math.max(-1, Math.min(1, ty));
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    orientationActiveRef.current = true;

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      orientationActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DOE.requestPermission === 'function') {
      return;
    }
    return attachOrientationListener();
  }, [attachOrientationListener]);

  const maybeRequestIosOrientationPermission = () => {
    if (iosPermissionRequestedRef.current || orientationActiveRef.current) return;
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;

    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DOE.requestPermission === 'function') {
      iosPermissionRequestedRef.current = true;
      DOE.requestPermission()
        .then((result) => {
          if (result === 'granted') {
            attachOrientationListener();
          }
        })
        .catch(() => {
          // Permission declined or unsupported inside iframe — keep studio default light
        });
    }
  };

  // Unified pointer interaction refs for bead sliding, in-place rolling, and chain panning
  const dragModeRef = useRef<'none' | 'pan' | 'bead' | 'roll-active'>('none');
  const touchedBeadRef = useRef<{ idx: number; clientX: number; clientY: number } | null>(null);
  const activeBeadIdxRef = useRef<number>(currentVolumeIdx);
  const dragStartPxRef = useRef<{ x: number; y: number } | null>(null);
  const lastMoveRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const dragStartBeadSRef = useRef<number>(0);
  const dragStartRollRef = useRef<number>(0);
  const camDragOffsetMmRef = useRef<number>(0);
  const wasDraggedRef = useRef<boolean>(false);
  const lastBumpHapticAtRef = useRef<number>(0);

  const handleBeadPointerDown = useCallback(
    (idx: number, clientX: number, clientY: number) => {
      touchedBeadRef.current = { idx, clientX, clientY };
    },
    []
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    ensureWoodAudioReady();
    maybeRequestIosOrientationPermission();

    const touchedBead = touchedBeadRef.current;
    touchedBeadRef.current = null;

    const now = performance.now();
    dragStartPxRef.current = { x: e.clientX, y: e.clientY };
    lastMoveRef.current = { x: e.clientX, y: e.clientY, time: now };
    camDragOffsetMmRef.current = 0;
    wasDraggedRef.current = false;

    const hitBead =
      touchedBead !== null &&
      Math.hypot(touchedBead.clientX - e.clientX, touchedBead.clientY - e.clientY) < 4;

    if (hitBead) {
      const idx = touchedBead.idx;
      dragModeRef.current = 'bead';
      activeBeadIdxRef.current = idx;
      dragStartBeadSRef.current = chainStateRef.current.xs[idx];
      dragStartRollRef.current = chainStateRef.current.rolls[idx];
      chainStateRef.current.slideVel[idx] = 0;
      chainStateRef.current.rollVel[idx] = 0;
      chainStateRef.current.wasColliding = false;
      if (idx !== currentVolumeIdx && !isFocused) {
        triggerHaptic(20);
        onChangeVolumeIdx(idx);
      }
    } else if (isFocused) {
      dragModeRef.current = 'roll-active';
      activeBeadIdxRef.current = currentVolumeIdx;
      dragStartRollRef.current = chainStateRef.current.rolls[currentVolumeIdx];
      chainStateRef.current.rollVel[currentVolumeIdx] = 0;
    } else {
      dragModeRef.current = 'pan';
      activeBeadIdxRef.current = currentVolumeIdx;
      dragStartRollRef.current = chainStateRef.current.rolls[currentVolumeIdx];
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragModeRef.current === 'none' || !dragStartPxRef.current) return;

    const dxPx = e.clientX - dragStartPxRef.current.x;
    const dyPx = e.clientY - dragStartPxRef.current.y;
    const dist = Math.hypot(dxPx, dyPx);

    if (dist > 6) {
      wasDraggedRef.current = true;
    }

    const now = performance.now();
    const prev = lastMoveRef.current;
    const dtSec = prev ? Math.max(0.008, (now - prev.time) / 1000) : 0.016;
    const stepDxPx = prev ? e.clientX - prev.x : 0;
    const stepDyPx = prev ? e.clientY - prev.y : 0;
    lastMoveRef.current = { x: e.clientX, y: e.clientY, time: now };

    const state = chainStateRef.current;
    const angle = state.angleRad;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const ppm = Math.max(1, pixelsPerMm);

    // Project pointer drag onto chain axis (u = (cosA, sinA)) and perpendicular roll axis (n = (-sinA, cosA))
    const dragAlongPx = dxPx * cosA + -dyPx * sinA;
    const dragAcrossPx = -(dxPx * -sinA + -dyPx * cosA);
    const stepAlongPx = stepDxPx * cosA + -stepDyPx * sinA;
    const stepAcrossPx = -(stepDxPx * -sinA + -stepDyPx * cosA);

    // Auto-detect perpendicular in-place roll when swiping across the cord on empty tray
    if (
      dragModeRef.current === 'pan' &&
      dist > 10 &&
      Math.abs(dragAcrossPx) > Math.abs(dragAlongPx) * 1.35
    ) {
      dragModeRef.current = 'roll-active';
      camDragOffsetMmRef.current = 0;
      dragStartRollRef.current = state.rolls[activeBeadIdxRef.current];
    }

    if (dragModeRef.current === 'bead') {
      const idx = activeBeadIdxRef.current;
      // 1. Slide bead along the vertical or horizontal cord following user's hand
      if (!isFocused) {
        const deltaSMm = dragAlongPx / ppm;
        const hitNeighbor = solveChainSlide(
          state.xs,
          chainConfig.specs,
          chainConfig.startS,
          chainConfig.endS,
          idx,
          dragStartBeadSRef.current + deltaSMm
        );
        state.slideVel[idx] = (stepAlongPx / ppm) / dtSec;
        state.cordDirty = true;

        if (hitNeighbor && !state.wasColliding) {
          if (soundEnabled) {
            playWoodClack(Math.min(1, Math.max(0.35, Math.abs(stepAlongPx) / 14)));
          }
          if (now - lastBumpHapticAtRef.current > 110) {
            lastBumpHapticAtRef.current = now;
            triggerHaptic(12);
          }
        }
        state.wasColliding = hitNeighbor;
      }

      // 2. Roll bead in-place around its longitudinal cord axis (local X) using perpendicular motion
      const rollRad = dragAcrossPx * 0.022;
      state.rolls[idx] = dragStartRollRef.current + rollRad;
      state.rollVel[idx] = (stepAcrossPx * 0.022) / dtSec;
    } else if (dragModeRef.current === 'roll-active') {
      const idx = activeBeadIdxRef.current;
      const rollDeltaPx = isFocused ? dyPx : dragAcrossPx;
      const stepRollPx = isFocused ? stepDyPx : stepAcrossPx;
      state.rolls[idx] = dragStartRollRef.current + rollDeltaPx * 0.024;
      state.rollVel[idx] = (stepRollPx * 0.024) / dtSec;
    } else if (dragModeRef.current === 'pan') {
      camDragOffsetMmRef.current = -dragAlongPx / ppm;
    }
  };

  const handlePointerUpOrCancelRef = useRef<() => void>(() => {});

  const handlePointerUpOrCancel = useCallback(() => {
    const mode = dragModeRef.current;
    if (mode === 'none') return;

    dragModeRef.current = 'none';
    dragStartPxRef.current = null;
    lastMoveRef.current = null;

    if (mode === 'bead') {
      const idx = activeBeadIdxRef.current;
      chainStateRef.current.slideVel[idx] = Math.max(
        -120,
        Math.min(120, chainStateRef.current.slideVel[idx] * 0.35)
      );
      chainStateRef.current.rollVel[idx] = Math.max(
        -14,
        Math.min(14, chainStateRef.current.rollVel[idx] * 0.55)
      );
      camDragOffsetMmRef.current = 0;
      return;
    }

    if (mode === 'roll-active') {
      const idx = activeBeadIdxRef.current;
      chainStateRef.current.rollVel[idx] = Math.max(
        -14,
        Math.min(14, chainStateRef.current.rollVel[idx] * 0.55)
      );
      camDragOffsetMmRef.current = 0;
      return;
    }

    // Pan release: snap camera to nearest bead along current cord axis
    const deltaMm = camDragOffsetMmRef.current;
    camDragOffsetMmRef.current = 0;
    if (!wasDraggedRef.current) return;

    const xs = chainStateRef.current.xs;
    const landedS = xs[currentVolumeIdx] + deltaMm;

    let nearestIdx = currentVolumeIdx;
    let nearestDist = Infinity;
    for (let i = 0; i < xs.length; i++) {
      const dist = Math.abs(xs[i] - landedS);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    if (nearestIdx === currentVolumeIdx) {
      if (deltaMm > 6 && currentVolumeIdx < VOLUMES.length - 1) {
        nearestIdx = currentVolumeIdx + 1;
      } else if (deltaMm < -6 && currentVolumeIdx > 0) {
        nearestIdx = currentVolumeIdx - 1;
      }
    }

    if (nearestIdx !== currentVolumeIdx) {
      triggerHaptic(35);
      onChangeVolumeIdx(nearestIdx);
    }
  }, [currentVolumeIdx, onChangeVolumeIdx]);

  handlePointerUpOrCancelRef.current = handlePointerUpOrCancel;

  useEffect(() => {
    const onWindowUp = () => handlePointerUpOrCancelRef.current();
    window.addEventListener('pointerup', onWindowUp);
    window.addEventListener('pointercancel', onWindowUp);
    return () => {
      window.removeEventListener('pointerup', onWindowUp);
      window.removeEventListener('pointercancel', onWindowUp);
    };
  }, []);

  const handleSelectBead = (idx: number, isAlreadyActive: boolean) => {
    if (isFocused) {
      onToggleFocus(null);
      return;
    }
    if (isAlreadyActive) {
      onToggleFocus(`beads3d-${VOLUMES[idx]}`);
    } else {
      triggerHaptic(35);
      onChangeVolumeIdx(idx);
    }
  };

  const isDark = theme === 'dark';

  if (!supported || contextLost) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
        <div
          className={`max-w-md border p-6 rounded-xl space-y-4 ${
            isDark ? 'border-white/10 bg-[#11151B]' : 'border-slate-200 bg-white shadow-sm'
          }`}
        >
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {t[lang].webglFallback}
          </p>
          <div
            style={{
              width: `${activeLen * pixelsPerMm}px`,
              height: `${activeWidth * pixelsPerMm}px`,
              background: stageStyle.radialBg,
            }}
            className={`mx-auto rounded-[100%] border ${
              isDark ? 'border-white/25' : 'border-slate-900/15'
            }`}
          />
          <div className={`tabular-nums text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {activeVol} mL · {activeWidth} × {activeLen} mm
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full flex-1 select-none overflow-hidden touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
    >
      <Canvas
        orthographic
        shadows={!isSoftwareGl}
        dpr={isSoftwareGl ? 1 : [1, 2]}
        camera={{ zoom: pixelsPerMm, near: 1, far: 1000, position: [0, 0, 200] }}
        gl={{
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.98,
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setContextLost(true);
          });
          canvas.addEventListener('webglcontextrestored', () => {
            setContextLost(false);
          });
        }}
        onPointerMissed={() => {
          if (!wasDraggedRef.current && isFocused) onToggleFocus(null);
        }}
        className="w-full h-full"
      >
        <ChainScene
          chainConfig={chainConfig}
          chainStateRef={chainStateRef}
          currentVolumeIdx={currentVolumeIdx}
          pixelsPerMm={pixelsPerMm}
          isFocused={isFocused}
          isVertical={isVertical}
          isSoftwareGl={isSoftwareGl}
          theme={theme}
          soundEnabled={soundEnabled}
          compareEnabled={compareEnabled}
          pinnedIdx={pinnedIdx}
          camDragOffsetMmRef={camDragOffsetMmRef}
          dragModeRef={dragModeRef}
          wasDraggedRef={wasDraggedRef}
          onBeadPointerDown={handleBeadPointerDown}
          onSelectBead={handleSelectBead}
          onBackgroundClick={() => {
            if (isFocused) onToggleFocus(null);
          }}
        />
      </Canvas>

      {/* Top HUD: Clinical Readout Box + 3D Action Controls + Horizontal/Vertical Switch */}
      {!isFocused && !controlsCollapsed && (
        <div
          className="pointer-events-none absolute top-2.5 sm:top-3 left-2.5 right-2.5 sm:left-3 sm:right-3 flex flex-wrap items-start justify-between gap-2 z-10"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-1.5 max-w-full">
            <div
              className={`pointer-events-auto border rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 flex items-center gap-2.5 sm:gap-3 max-w-full ${
                isDark
                  ? 'bg-[#11151B]/95 border-white/10'
                  : 'bg-white/95 border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-baseline gap-1 shrink-0 tabular-nums">
                <span
                  className={`text-xl sm:text-2xl font-bold leading-none ${
                    isDark ? stageStyle.textClass : stageStyle.textLightClass
                  }`}
                >
                  {activeVol}
                </span>
                <span className={`text-[11px] sm:text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  mL
                </span>
              </div>
              <div className={`h-5 w-px shrink-0 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} aria-hidden="true" />
              <div className="min-w-0">
                <div
                  className={`tabular-nums text-[11px] sm:text-xs font-medium whitespace-nowrap ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  {activeWidth} × {activeLen} mm
                </div>
                <div className={`text-[11px] flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-xs shrink-0 ${stageStyle.swatchClass}`} />
                  <span className="truncate">
                    {activeVol <= 3
                      ? t[lang].stagePrepubertal
                      : activeVol === 4
                      ? t[lang].stageOnset
                      : activeVol <= 12
                      ? t[lang].stagePubertal
                      : t[lang].stageAdult}
                  </span>
                </div>
              </div>
            </div>

            {compareEnabled && (
              <div
                className={`pointer-events-auto border rounded-xl px-2.5 py-1 flex items-center justify-between gap-2 text-[11px] ${
                  isDark
                    ? 'bg-[#11151B]/95 border-white/10 text-slate-200'
                    : 'bg-white/95 border-slate-200 text-slate-700 shadow-xs'
                }`}
              >
                <span className="tabular-nums whitespace-nowrap">
                  {t[lang].pinnedRefLabel}:{' '}
                  <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                    {VOLUMES[pinnedIdx]} mL
                  </strong>{' '}
                  ({ORCHIDOMETER_DATA[VOLUMES[pinnedIdx]][1]}×{ORCHIDOMETER_DATA[VOLUMES[pinnedIdx]][0]} mm)
                </span>
                {pinnedIdx !== currentVolumeIdx && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      setPinnedIdx(currentVolumeIdx);
                    }}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-colors whitespace-nowrap ${
                      isDark
                        ? 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/30'
                        : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                    }`}
                  >
                    {t[lang].pinUpdateHere} {activeVol} mL
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5 ml-auto">
            {/* Pin Side-by-Side Compare Toggle */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(25);
                setCompareEnabled((v) => !v);
              }}
              className={`min-h-[40px] px-2.5 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                compareEnabled
                  ? isDark
                    ? 'bg-white text-slate-950 border-white font-semibold'
                    : 'bg-slate-900 text-white border-slate-900 font-semibold'
                  : isDark
                  ? 'bg-[#11151B]/95 border-white/10 text-slate-200 hover:text-white'
                  : 'bg-white/95 border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
              }`}
            >
              {compareEnabled ? (
                <Pin className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Columns2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{t[lang].pinCompare}</span>
            </button>

            {/* Wood Clack Sound Toggle */}
            <button
              type="button"
              aria-label={t[lang].soundLabel}
              onClick={() => {
                ensureWoodAudioReady();
                setSoundEnabled((prev) => {
                  const next = !prev;
                  localStorage.setItem('orchidometer_sound', next ? 'true' : 'false');
                  if (next) playWoodClack(0.5);
                  return next;
                });
              }}
              className={`min-h-[40px] min-w-[40px] rounded-xl border flex items-center justify-center transition-colors shrink-0 ${
                isDark
                  ? 'bg-[#11151B]/95 border-white/10 text-slate-300 hover:text-white'
                  : 'bg-white/95 border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-60" />}
            </button>

            {/* Horizontal / Vertical Orientation Switch */}
            <div
              className={`border rounded-xl p-1 flex items-center gap-1 ${
                isDark
                  ? 'bg-[#11151B]/95 border-white/10'
                  : 'bg-white/95 border-slate-200 shadow-xs'
              }`}
            >
              <button
                type="button"
                onClick={() => selectOrientation(false)}
                className={`min-h-[32px] px-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  !isVertical
                    ? isDark
                      ? 'bg-white text-slate-950 font-semibold'
                      : 'bg-slate-900 text-white font-semibold'
                    : isDark
                    ? 'text-slate-300 hover:text-white hover:bg-white/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t[lang].horizontal}
              </button>
              <button
                type="button"
                onClick={() => selectOrientation(true)}
                className={`min-h-[32px] px-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isVertical
                    ? isDark
                      ? 'bg-white text-slate-950 font-semibold'
                      : 'bg-slate-900 text-white font-semibold'
                    : isDark
                    ? 'text-slate-300 hover:text-white hover:bg-white/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t[lang].vertical}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact Single-Line Gesture Hint Banner */}
      {!isFocused && !controlsCollapsed && (
        <div
          className={`pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[11px] font-medium px-3 truncate ${
            isDark ? 'text-slate-400/90' : 'text-slate-700'
          }`}
        >
          {t[lang].dragHint3D}
        </div>
      )}
    </div>
  );
}

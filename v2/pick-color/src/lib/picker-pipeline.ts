import {
  extractAllRegions,
  loadImageFromBrowser,
} from './palette';
import type { ExtractAllRegionsResult, PixelBuffer } from './palette';

const INTERNAL_HOST_RE = /(^|\.)music\.126\.net$/i;
const THUMB_PARAM_RE = /^\d+y\d+$/;
const LOCAL_CONTENT_KEY_PENDING = 'local-image:pending';
const EXTERNAL_URL_TIMEOUT_MS = 7000;
const IMAGE_CONTENT_TYPE_RE = /^image\//i;

export interface SwatchDto {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  population: number;
  populationRatio?: number;
}

export interface RegionPair {
  no_filter: SwatchDto | null;
  with_filter: SwatchDto | null;
}

export interface UnifiedResult {
  resultKey: string;
  source: string;
  method: 'browser_canvas_jni_palette_core';
  elapsedMs: number;
  image_size?: { w: number; h: number };
  thumbnail?: string;
  dominate: {
    no_filter: SwatchDto | null;
    with_filter: SwatchDto | null;
  };
  regions: {
    D: RegionPair;
    T: RegionPair;
    B: RegionPair;
    L: RegionPair;
    R: RegionPair;
  };
  palette_16: SwatchDto[];
  capabilities: string[];
  nmcl?: string;
}

export interface ExtractInput {
  file?: File | Blob;
  url?: string;
  base64?: string;
  sourceLabel?: string;
}

export interface ExtractProgress {
  text: string;
  kind?: 'loading' | 'success' | 'error' | '';
}

export interface ExtractOptions {
  onProgress?: (progress: ExtractProgress) => void;
}

export function normalizePaletteUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (!INTERNAL_HOST_RE.test(u.hostname.toLowerCase())) return raw;
    const param = u.searchParams.get('param') || '';
    if (THUMB_PARAM_RE.test(param)) {
      u.search = '';
      u.hash = '';
      return u.toString();
    }
    return raw;
  } catch {
    return raw;
  }
}

export function sanitizeUrl(text: string): string {
  const m = text.match(/^(https?:\/\/[^\s]*?)(?:https?:\/\/.*)?$/i);
  const first = m ? m[1] : text;
  return normalizePaletteUrl(first);
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rf) h = (gf - bf) / d + (gf < bf ? 6 : 0);
    else if (max === gf) h = (bf - rf) / d + 2;
    else h = (rf - gf) / d + 4;
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function swatchFromHex(hex: string, population = 0, ratio: number | null = null): SwatchDto {
  const clean = hex.replace(/^#/, '').toLowerCase().padStart(6, '0').slice(-6);
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const sw: SwatchDto = {
    hex: '#' + clean,
    rgb: { r, g, b },
    hsl: rgbToHsl(r, g, b),
    population,
  };
  if (ratio !== null && ratio !== undefined && Number.isFinite(ratio)) {
    sw.populationRatio = ratio;
  }
  return sw;
}

function makePreviewDataUrl(bitmap: ImageBitmap, maxSide = 760): string {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return '';
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL('image/png');
}

function hexByte(n: number): string {
  return n.toString(16).padStart(2, '0');
}

function fastPixelHash(buf: PixelBuffer): string {
  let h1 = (0xdeadbeef ^ buf.width) >>> 0;
  let h2 = (0x41c6ce57 ^ buf.height) >>> 0;
  for (let i = 0; i < buf.pixels.length; i += 1) {
    const value = buf.pixels[i] >>> 0;
    h1 = Math.imul(h1 ^ value, 0x85ebca6b) >>> 0;
    h2 = Math.imul(h2 ^ ((value >>> 16) | (value << 16)), 0xc2b2ae35) >>> 0;
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

async function localContentKeyFromPixelBuffer(buf: PixelBuffer): Promise<string> {
  const prefix = `local-image:${buf.width}x${buf.height}:`;
  if (window.crypto?.subtle) {
    try {
      const bytes = new Uint8Array(buf.pixels.buffer, buf.pixels.byteOffset, buf.pixels.byteLength);
      const digestInput = new Uint8Array(bytes).buffer as ArrayBuffer;
      const digest = await window.crypto.subtle.digest('SHA-256', digestInput);
      return prefix + Array.from(new Uint8Array(digest), hexByte).join('');
    } catch {
      /* fallback for insecure origins */
    }
  }
  return prefix + fastPixelHash(buf);
}

async function extractCore(buf: PixelBuffer, key: string): Promise<{ core: ExtractAllRegionsResult; resultKey: string; elapsedMs: number }> {
  const t0 = performance.now();
  const resolvedKey = key === LOCAL_CONTENT_KEY_PENDING ? await localContentKeyFromPixelBuffer(buf) : key;
  const core = extractAllRegions(buf);
  return {
    core,
    resultKey: resolvedKey,
    elapsedMs: Math.max(1, Math.round(performance.now() - t0)),
  };
}

async function blobToBitmap(blob: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      try {
        return await createImageBitmap(blob);
      } catch {
        /* fallback below */
      }
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('图片解码失败'));
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 上下文初始化失败');
    ctx.drawImage(img, 0, 0);
    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function extractLocal(bitmap: ImageBitmap, source: string, key: string): Promise<UnifiedResult> {
  const t0 = performance.now();
  const buf = await loadImageFromBrowser(bitmap);
  const imageSize = { w: bitmap.width, h: bitmap.height };
  const { core, resultKey: resolvedKey, elapsedMs: coreElapsedMs } = await extractCore(buf, key);
  const pair = (name: 'D' | 'T' | 'B' | 'L' | 'R'): RegionPair => ({
    no_filter: swatchFromHex(core.regions[name].noFilter.dominantColorHex),
    with_filter: swatchFromHex(core.regions[name].withFilter.dominantColorHex),
  });
  const regions = {
    D: pair('D'),
    T: pair('T'),
    B: pair('B'),
    L: pair('L'),
    R: pair('R'),
  };
  const populations = core.regions.D.noFilter.populations || [];
  const palette_16 = populations
    .slice(0, 16)
    .map((p) => swatchFromHex(p.hex, p.population, p.populationRatio));

  return {
    resultKey: resolvedKey,
    source,
    method: 'browser_canvas_jni_palette_core',
    elapsedMs: Math.max(coreElapsedMs, Math.round(performance.now() - t0)),
    image_size: imageSize,
    thumbnail: makePreviewDataUrl(bitmap),
    dominate: regions.D,
    regions,
    palette_16,
    capabilities: [
      'D.no_filter',
      'D.with_filter',
      'T.no_filter',
      'T.with_filter',
      'B.no_filter',
      'B.with_filter',
      'L.no_filter',
      'L.with_filter',
      'R.no_filter',
      'R.with_filter',
      'palette_16',
      'image_size',
      'thumbnail',
    ],
    nmcl: core.headerNmcl,
  };
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('请求超时');
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchUrlAsBitmap(url: string): Promise<ImageBitmap> {
  try {
    const resp = await fetchWithTimeout(url, { mode: 'cors', credentials: 'omit' }, EXTERNAL_URL_TIMEOUT_MS);
    const contentType = (resp.headers.get('content-type') || '').toLowerCase();
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    if (contentType && !IMAGE_CONTENT_TYPE_RE.test(contentType) && !contentType.includes('octet-stream')) {
      throw new Error(`非图片类型 (${contentType})`);
    }
    const blob = await resp.blob();
    return await blobToBitmap(blob);
  } catch {
    return await new Promise<ImageBitmap>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = window.setTimeout(() => reject(new Error('跨域加载超时')), EXTERNAL_URL_TIMEOUT_MS);
      img.onload = async () => {
        window.clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) throw new Error('Canvas 上下文失败');
          ctx.drawImage(img, 0, 0);
          ctx.getImageData(0, 0, 1, 1);
          resolve(await createImageBitmap(canvas));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error('目标服务器未开放跨域读取'));
      };
      img.src = url;
    });
  }
}

export async function extract(input: ExtractInput, options: ExtractOptions = {}): Promise<UnifiedResult> {
  await new Promise((r) => window.setTimeout(r, 0));
  if (input.file) {
    const source = input.sourceLabel || (input.file as File).name || 'pasted-image';
    const bitmap = await blobToBitmap(input.file);
    return await extractLocal(bitmap, source, LOCAL_CONTENT_KEY_PENDING);
  }
  if (input.base64) {
    const resp = await fetch(input.base64);
    const blob = await resp.blob();
    const bitmap = await blobToBitmap(blob);
    return await extractLocal(bitmap, input.sourceLabel || 'base64-image', LOCAL_CONTENT_KEY_PENDING);
  }
  if (input.url) {
    const cleaned = sanitizeUrl(input.url);
    options.onProgress?.({ text: '正在通过浏览器直连读取公开图片…', kind: 'loading' });
    try {
      const bitmap = await fetchUrlAsBitmap(cleaned);
      return await extractLocal(bitmap, cleaned, `url:${cleaned}`);
    } catch {
      throw new Error('该图片链接受跨域或内网限制无法直连，请复制图片本体后 Cmd+V 粘贴，或下载后拖入本地文件。');
    }
  }
  throw new Error('未提供图片输入');
}

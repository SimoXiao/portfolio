import type { PixelBuffer } from './types';

export interface LoadImageOpts {
  resizeArea?: number;
}

export async function loadImageFromBrowser(
  src: ImageBitmap | Blob,
  opts: LoadImageOpts = {},
): Promise<PixelBuffer> {
  const bitmap = await toImageBitmap(src);
  let w = bitmap.width;
  let h = bitmap.height;
  if (opts.resizeArea && opts.resizeArea > 0 && w * h > opts.resizeArea) {
    const scale = Math.sqrt(opts.resizeArea / (w * h));
    w = Math.ceil(w * scale);
    h = Math.ceil(h * scale);
  }
  const canvas: OffscreenCanvas | HTMLCanvasElement =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error('loadImageFromBrowser: failed to get 2d context');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  return rgbaImageDataToPixelBuffer(imageData.data, w, h);
}

async function toImageBitmap(src: ImageBitmap | Blob): Promise<ImageBitmap> {
  if (typeof ImageBitmap !== 'undefined' && src instanceof ImageBitmap) return src;
  if (src instanceof Blob) return await createImageBitmap(src);
  return src as ImageBitmap;
}

export function rgbaImageDataToPixelBuffer(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): PixelBuffer {
  const n = width * height;
  const pixels = new Int32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const r = rgba[j];
    const g = rgba[j + 1];
    const b = rgba[j + 2];
    const a = rgba[j + 3];
    if (a === 255) {
      pixels[i] = (255 << 24) | (r << 16) | (g << 8) | b;
    } else {
      const inv = 1 - a / 255;
      const rr = Math.round(r * (a / 255) + 255 * inv);
      const gg = Math.round(g * (a / 255) + 255 * inv);
      const bb = Math.round(b * (a / 255) + 255 * inv);
      pixels[i] = (255 << 24) | (rr << 16) | (gg << 8) | bb;
    }
  }
  return { pixels, width, height };
}

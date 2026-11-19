import { extractColor } from './extractor';
import type { ExtractAllRegionsResult, ExtractColorParam, PixelBuffer } from './types';

export function cropPixels(src: PixelBuffer, x: number, y: number, w: number, h: number): PixelBuffer {
  if (x < 0 || y < 0 || x + w > src.width || y + h > src.height) {
    throw new RangeError(`cropPixels out of bounds: ${x},${y} ${w}x${h} on ${src.width}x${src.height}`);
  }
  const out = new Int32Array(w * h);
  for (let row = 0; row < h; row++) {
    const srcStart = (y + row) * src.width + x;
    const dstStart = row * w;
    out.set(src.pixels.subarray(srcStart, srcStart + w), dstStart);
  }
  return { pixels: out, width: w, height: h };
}

export function extractAllRegions(buf: PixelBuffer, param: ExtractColorParam = {}): ExtractAllRegionsResult {
  const { width, height } = buf;
  const main = extractColor(buf, param, false, true);
  const mainWithoutBW = extractColor(buf, param, true, false);
  const top20 = Math.floor(height / 5);
  const bottom20 = Math.floor(height / 5);
  const left20 = Math.floor(width / 5);
  const right20 = Math.floor(width / 5);
  const topBuf = cropPixels(buf, 0, 0, width, top20);
  const top = extractColor(topBuf, param, false, false);
  const topBW = extractColor(topBuf, param, true, false);
  const bottomBuf = cropPixels(buf, 0, height - bottom20, width, bottom20);
  const bottom = extractColor(bottomBuf, param, false, false);
  const bottomBW = extractColor(bottomBuf, param, true, false);
  const leftBuf = cropPixels(buf, 0, 0, left20, height);
  const left = extractColor(leftBuf, param, false, false);
  const leftBW = extractColor(leftBuf, param, true, false);
  const rightBuf = cropPixels(buf, width - right20, 0, right20, height);
  const right = extractColor(rightBuf, param, false, false);
  const rightBW = extractColor(rightBuf, param, true, false);
  const regions = {
    D: { noFilter: main, withFilter: mainWithoutBW },
    T: { noFilter: top, withFilter: topBW },
    B: { noFilter: bottom, withFilter: bottomBW },
    L: { noFilter: left, withFilter: leftBW },
    R: { noFilter: right, withFilter: rightBW },
  };
  const headerNmcl =
    `V:0.3|M:${main.dominantColorHex};${mainWithoutBW.dominantColorHex}` +
    `|T:${top.dominantColorHex};${topBW.dominantColorHex}` +
    `|B:${bottom.dominantColorHex};${bottomBW.dominantColorHex}` +
    `|L:${left.dominantColorHex};${leftBW.dominantColorHex}` +
    `|R:${right.dominantColorHex};${rightBW.dominantColorHex}`;
  return { version: '0.3', width, height, regions, headerNmcl };
}

import { blue, green, red, rgb } from './color';
import { rgbToHsl } from './color-utils';
import { HIST_SIZE, QUANTIZE_WORD_MASK, QUANTIZE_WORD_WIDTH } from './histogram';
import { PriorityQueue } from './priority-queue';
import { makeSwatch } from './swatch';
import type { ColorFilter, Swatch } from './types';

const COMPONENT_RED = -3;
const COMPONENT_GREEN = -2;
const COMPONENT_BLUE = -1;

export interface QuantizeResult {
  swatches: Swatch[];
}

export function quantize(
  pixels: Int32Array,
  maxColors: number,
  filters: readonly ColorFilter[] | null,
): QuantizeResult {
  const hist = new Int32Array(HIST_SIZE);
  for (let i = 0; i < pixels.length; i++) {
    const q = quantizeFromRgb888(pixels[i]);
    pixels[i] = q;
    hist[q]++;
  }
  let distinctCount = 0;
  for (let c = 0; c < HIST_SIZE; c++) {
    if (hist[c] > 0 && shouldIgnoreBin(c, filters)) {
      hist[c] = 0;
    }
    if (hist[c] > 0) distinctCount++;
  }
  const colors = new Int32Array(distinctCount);
  {
    let idx = 0;
    for (let c = 0; c < HIST_SIZE; c++) {
      if (hist[c] > 0) colors[idx++] = c;
    }
  }
  let swatches: Swatch[];
  if (distinctCount <= maxColors) {
    swatches = [];
    for (let i = 0; i < colors.length; i++) {
      const bin = colors[i];
      swatches.push(makeSwatch(approximateBinToRgb888(bin), hist[bin]));
    }
  } else {
    swatches = quantizePixels(colors, hist, maxColors, filters);
  }
  return { swatches };
}

function quantizePixels(
  colors: Int32Array,
  hist: Int32Array,
  maxColors: number,
  filters: readonly ColorFilter[] | null,
): Swatch[] {
  const pq = new PriorityQueue<Vbox>((a, b) => b.volume - a.volume);
  pq.offer(new Vbox(0, colors.length - 1, colors, hist));
  splitBoxes(pq, maxColors);
  const result: Swatch[] = [];
  for (const vbox of pq) {
    const sw = vbox.averageSwatch();
    if (!shouldIgnoreRgb(sw.rgb, sw.hsl[0], sw.hsl[1], sw.hsl[2], filters)) {
      result.push(sw);
    }
  }
  return result;
}

function splitBoxes(pq: PriorityQueue<Vbox>, maxSize: number): void {
  while (pq.size < maxSize) {
    const vbox = pq.poll();
    if (vbox && vbox.canSplit()) {
      pq.offer(vbox.splitBox());
      pq.offer(vbox);
    } else {
      return;
    }
  }
}

class Vbox {
  private population = 0;
  private minR = 0;
  private maxR = 0;
  private minG = 0;
  private maxG = 0;
  private minB = 0;
  private maxB = 0;

  constructor(
    private lower: number,
    private upper: number,
    private readonly colors: Int32Array,
    private readonly hist: Int32Array,
  ) {
    this.fitBox();
  }

  /**
   * AIO production output matches the historical MMCQ volume without the
   * inclusive `+1` term. Keeping this aligned to AIO takes priority over the
   * older offline palette-cli golden data for the browser-only site.
   */
  get volume(): number {
    return (this.maxR - this.minR) * (this.maxG - this.minG) * (this.maxB - this.minB);
  }

  canSplit(): boolean {
    return this.upper - this.lower + 1 > 1;
  }

  private fitBox(): void {
    const { colors, hist } = this;
    let minR = Number.POSITIVE_INFINITY;
    let minG = Number.POSITIVE_INFINITY;
    let minB = Number.POSITIVE_INFINITY;
    let maxR = Number.NEGATIVE_INFINITY;
    let maxG = Number.NEGATIVE_INFINITY;
    let maxB = Number.NEGATIVE_INFINITY;
    let pop = 0;
    for (let i = this.lower; i <= this.upper; i++) {
      const c = colors[i];
      pop += hist[c];
      const r = qRed(c);
      const g = qGreen(c);
      const b = qBlue(c);
      if (r > maxR) maxR = r;
      if (r < minR) minR = r;
      if (g > maxG) maxG = g;
      if (g < minG) minG = g;
      if (b > maxB) maxB = b;
      if (b < minB) minB = b;
    }
    this.minR = minR;
    this.maxR = maxR;
    this.minG = minG;
    this.maxG = maxG;
    this.minB = minB;
    this.maxB = maxB;
    this.population = pop;
  }

  splitBox(): Vbox {
    if (!this.canSplit()) throw new Error('Cannot split Vbox of size 1');
    const splitPoint = this.findSplitPoint();
    const newBox = new Vbox(splitPoint + 1, this.upper, this.colors, this.hist);
    this.upper = splitPoint;
    this.fitBox();
    return newBox;
  }

  private longestDimension(): number {
    const rL = this.maxR - this.minR;
    const gL = this.maxG - this.minG;
    const bL = this.maxB - this.minB;
    if (rL >= gL && rL >= bL) return COMPONENT_RED;
    if (gL >= rL && gL >= bL) return COMPONENT_GREEN;
    return COMPONENT_BLUE;
  }

  private findSplitPoint(): number {
    const dim = this.longestDimension();
    const { colors, hist, lower, upper, population } = this;
    modifySignificantOctet(colors, dim, lower, upper);
    sortIntSubarray(colors, lower, upper + 1);
    modifySignificantOctet(colors, dim, lower, upper);
    const mid = Math.floor(population / 2);
    let count = 0;
    for (let i = lower; i <= upper; i++) {
      count += hist[colors[i]];
      if (count >= mid) {
        return Math.min(upper - 1, i);
      }
    }
    return lower;
  }

  averageSwatch(): Swatch {
    const { colors, hist } = this;
    let redSum = 0;
    let greenSum = 0;
    let blueSum = 0;
    let total = 0;
    for (let i = this.lower; i <= this.upper; i++) {
      const c = colors[i];
      const pop = hist[c];
      total += pop;
      redSum += pop * qRed(c);
      greenSum += pop * qGreen(c);
      blueSum += pop * qBlue(c);
    }
    const rMean = javaRoundFloat(redSum, total);
    const gMean = javaRoundFloat(greenSum, total);
    const bMean = javaRoundFloat(blueSum, total);
    return makeSwatch(approximateToRgb888(rMean, gMean, bMean), total);
  }
}

function modifySignificantOctet(a: Int32Array, dimension: number, lower: number, upper: number): void {
  switch (dimension) {
    case COMPONENT_RED:
      break;
    case COMPONENT_GREEN:
      for (let i = lower; i <= upper; i++) {
        const c = a[i];
        a[i] = (qGreen(c) << (QUANTIZE_WORD_WIDTH + QUANTIZE_WORD_WIDTH)) | (qRed(c) << QUANTIZE_WORD_WIDTH) | qBlue(c);
      }
      break;
    case COMPONENT_BLUE:
      for (let i = lower; i <= upper; i++) {
        const c = a[i];
        a[i] = (qBlue(c) << (QUANTIZE_WORD_WIDTH + QUANTIZE_WORD_WIDTH)) | (qGreen(c) << QUANTIZE_WORD_WIDTH) | qRed(c);
      }
      break;
  }
}

function sortIntSubarray(a: Int32Array, from: number, to: number): void {
  if (to - from <= 1) return;
  const slice = Array.from(a.subarray(from, to));
  slice.sort((x, y) => x - y);
  a.set(slice, from);
}

function shouldIgnoreBin(bin: number, filters: readonly ColorFilter[] | null): boolean {
  if (!filters || filters.length === 0) return false;
  const rgbInt = approximateBinToRgb888(bin);
  const hsl = rgbToHsl(red(rgbInt), green(rgbInt), blue(rgbInt));
  return shouldIgnoreRgb(rgbInt, hsl[0], hsl[1], hsl[2], filters);
}

function shouldIgnoreRgb(
  rgbInt: number,
  h: number,
  s: number,
  l: number,
  filters: readonly ColorFilter[] | null,
): boolean {
  if (!filters || filters.length === 0) return false;
  for (let i = 0; i < filters.length; i++) {
    if (!filters[i](rgbInt, [h, s, l])) return true;
  }
  return false;
}

function quantizeFromRgb888(color: number): number {
  const r = modifyWordWidth(red(color), 8, QUANTIZE_WORD_WIDTH);
  const g = modifyWordWidth(green(color), 8, QUANTIZE_WORD_WIDTH);
  const b = modifyWordWidth(blue(color), 8, QUANTIZE_WORD_WIDTH);
  return (r << (QUANTIZE_WORD_WIDTH + QUANTIZE_WORD_WIDTH)) | (g << QUANTIZE_WORD_WIDTH) | b;
}

function approximateToRgb888(r: number, g: number, b: number): number {
  return rgb(
    modifyWordWidth(r, QUANTIZE_WORD_WIDTH, 8),
    modifyWordWidth(g, QUANTIZE_WORD_WIDTH, 8),
    modifyWordWidth(b, QUANTIZE_WORD_WIDTH, 8),
  );
}

function approximateBinToRgb888(bin: number): number {
  return approximateToRgb888(qRed(bin), qGreen(bin), qBlue(bin));
}

function qRed(color: number): number {
  return (color >> (QUANTIZE_WORD_WIDTH + QUANTIZE_WORD_WIDTH)) & QUANTIZE_WORD_MASK;
}

function qGreen(color: number): number {
  return (color >> QUANTIZE_WORD_WIDTH) & QUANTIZE_WORD_MASK;
}

function qBlue(color: number): number {
  return color & QUANTIZE_WORD_MASK;
}

function modifyWordWidth(value: number, currentWidth: number, targetWidth: number): number {
  let newValue: number;
  if (targetWidth > currentWidth) {
    newValue = value << (targetWidth - currentWidth);
  } else {
    newValue = value >> (currentWidth - targetWidth);
  }
  return newValue & ((1 << targetWidth) - 1);
}

function javaRoundFloat(num: number, den: number): number {
  const q = Math.fround(Math.fround(num) / Math.fround(den));
  return Math.floor(Math.fround(q + 0.5));
}

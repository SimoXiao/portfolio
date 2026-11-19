import { isHslInRange } from './filters';
import { quantize } from './mmcq';
import { DEFAULT_TARGETS, VIBRANT } from './target';
import type { Target } from './target';
import type { ColorFilter, PixelBuffer, PopulationEntry, Swatch } from './types';

export class Palette {
  readonly swatches: Swatch[];
  readonly targets: Target[];
  readonly selected: Map<Target, Swatch | null> = new Map();
  private readonly usedColors: Set<number> = new Set();
  readonly dominantSwatch: Swatch | null;

  constructor(swatches: Swatch[], targets: Target[] = DEFAULT_TARGETS) {
    this.swatches = swatches;
    this.targets = targets;
    this.dominantSwatch = findDominant(swatches);
    this.runTargetSelection();
  }

  swatchForTarget(target: Target): Swatch | null {
    return this.selected.get(target) ?? null;
  }

  get vibrantSwatch(): Swatch | null {
    return this.swatchForTarget(VIBRANT);
  }

  dominantColor(defaultColor: number): number {
    return this.dominantSwatch ? this.dominantSwatch.rgb : defaultColor;
  }

  private runTargetSelection(): void {
    for (const target of this.targets) {
      const pick = this.selectForTarget(target);
      this.selected.set(target, pick);
      if (pick && target.isExclusive) this.usedColors.add(pick.rgb);
    }
    this.usedColors.clear();
  }

  private selectForTarget(target: Target): Swatch | null {
    let maxScore = 0;
    let maxSwatch: Swatch | null = null;
    for (const swatch of this.swatches) {
      if (!this.shouldScore(swatch, target)) continue;
      const score = this.generateScore(swatch, target);
      if (maxSwatch === null || score > maxScore) {
        maxSwatch = swatch;
        maxScore = score;
      }
    }
    return maxSwatch;
  }

  private shouldScore(swatch: Swatch, target: Target): boolean {
    const [, s, l] = swatch.hsl;
    return (
      s >= target.minimumSaturation &&
      s <= target.maximumSaturation &&
      l >= target.minimumLightness &&
      l <= target.maximumLightness &&
      !this.usedColors.has(swatch.rgb)
    );
  }

  private generateScore(swatch: Swatch, target: Target): number {
    const [, s, l] = swatch.hsl;
    const maxPop = this.dominantSwatch ? this.dominantSwatch.population : 1;
    let satScore = 0;
    let lumScore = 0;
    let popScore = 0;
    if (target.saturationWeight > 0) {
      satScore = target.saturationWeight * (1 - Math.abs(s - target.targetSaturation));
    }
    if (target.lightnessWeight > 0) {
      lumScore = target.lightnessWeight * (1 - Math.abs(l - target.targetLightness));
    }
    if (target.populationWeight > 0) {
      popScore = target.populationWeight * (swatch.population / maxPop);
    }
    return satScore + lumScore + popScore;
  }
}

export function findDominant(swatches: Swatch[]): Swatch | null {
  let maxPop = Number.NEGATIVE_INFINITY;
  let maxSw: Swatch | null = null;
  for (const sw of swatches) {
    if (sw.population > maxPop) {
      maxSw = sw;
      maxPop = sw.population;
    }
  }
  return maxSw;
}

export function createPaletteFromPixels(
  buf: PixelBuffer,
  opts: { maxColors?: number; filters?: readonly ColorFilter[] | null } = {},
): Palette {
  const maxColors = opts.maxColors ?? 16;
  const filters = opts.filters === undefined ? null : opts.filters;
  const pixelsCopy = new Int32Array(buf.pixels);
  const { swatches } = quantize(pixelsCopy, maxColors, filters);
  return new Palette(swatches);
}

export const DEFAULT_RESIZE_AREA = 112 * 112;

export function scaleBitmapDown(src: PixelBuffer, targetArea: number): PixelBuffer {
  if (!targetArea || targetArea <= 0) return src;
  const area = src.width * src.height;
  if (area <= targetArea) return src;
  const scaleRatio = Math.sqrt(targetArea / area);
  const dstW = Math.ceil(src.width * scaleRatio);
  const dstH = Math.ceil(src.height * scaleRatio);
  return nearestNeighborResize(src, dstW, dstH);
}

export function nearestNeighborResize(src: PixelBuffer, dstW: number, dstH: number): PixelBuffer {
  const { width: srcW, height: srcH, pixels: srcPx } = src;
  if (dstW === srcW && dstH === srcH) return src;
  const xScale = dstW / srcW;
  const yScale = dstH / srcH;
  const srcCenterX = srcW / 2;
  const srcCenterY = srcH / 2;
  const dstCenterX = dstW / 2;
  const dstCenterY = dstH / 2;
  const dst = new Int32Array(dstW * dstH);
  for (let y = 0; y < dstH; y++) {
    const ys = (y - dstCenterY) / yScale + srcCenterY;
    const rowSrc = Math.floor(ys);
    const srcRowStart = rowSrc * srcW;
    const dstRowStart = y * dstW;
    for (let x = 0; x < dstW; x++) {
      const xs = (x - dstCenterX) / xScale + srcCenterX;
      const colSrc = Math.floor(xs);
      dst[dstRowStart + x] = srcPx[srcRowStart + colSrc];
    }
  }
  return { pixels: dst, width: dstW, height: dstH };
}

export function getColorForBlackWhite(palette: Palette): number {
  const sorted = [...palette.swatches].sort((a, b) => b.population - a.population);
  for (const sw of sorted) {
    if (isHslInRange(sw.hsl[1], sw.hsl[2])) return sw.rgb;
  }
  return sorted[0]?.rgb ?? 0;
}

export function sortedPopulations(palette: Palette): PopulationEntry[] {
  const sorted = [...palette.swatches].sort((a, b) => b.population - a.population);
  const total = sorted.reduce((s, sw) => s + sw.population, 0);
  return sorted.map((sw) => ({
    hex: sw.hex,
    rgb: sw.rgb & 16777215,
    population: sw.population,
    populationRatio: total > 0 ? sw.population / total : 0,
  }));
}

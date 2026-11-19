import { BLACK, rgbIntToHex } from './color';
import { colorToHsl } from './color-utils';
import { BLACK_WHITE_POLYGON_CONTAINS, isHslInRange } from './filters';
import {
  createPaletteFromPixels,
  DEFAULT_RESIZE_AREA,
  getColorForBlackWhite,
  Palette,
  scaleBitmapDown,
  sortedPopulations,
} from './palette';
import type { ExtractColorParam, ExtractColorResult, PixelBuffer, Swatch } from './types';

export function extractColor(
  buf: PixelBuffer,
  param: ExtractColorParam = {},
  excludeBlackWhiteColor = false,
  withPopulation = false,
): ExtractColorResult {
  const resizeArea = param.resize === undefined || param.resize === null ? DEFAULT_RESIZE_AREA : param.resize;
  const working = scaleBitmapDown(buf, resizeArea);
  const palette = createPaletteFromPixels(working, {
    maxColors: param.maxColorCount ?? 16,
    // The server-side path does `clearFilters()`, so no filter is applied.
    filters: null,
  });
  const googleDominant = palette.dominantColor(BLACK) & 16777215;
  let dominantColor: number;
  if (param.selector === 'picker') {
    const picked = selectPrimaryColor(palette.swatches);
    dominantColor = picked.swatch?.rgb ?? palette.dominantSwatch?.rgb ?? 0;
  } else {
    dominantColor = getDomainColor(palette);
    if (excludeBlackWhiteColor) {
      const hsl = colorToHsl(dominantColor);
      if (!isHslInRange(hsl[1], hsl[2])) {
        dominantColor = getColorForBlackWhite(palette);
      }
    }
  }
  const result: ExtractColorResult = {
    googleDominantColor: googleDominant,
    googleDominantColorHex: rgbIntToHex(googleDominant),
    dominantColor: dominantColor & 16777215,
    dominantColorHex: rgbIntToHex(dominantColor),
  };
  if (withPopulation) {
    result.populations = sortedPopulations(palette);
    result.dominants = dominantsRatio(palette);
  }
  return result;
}

export function getDomainColor(palette: Palette): number {
  const swatches = [...palette.swatches].sort((a, b) => b.population - a.population);
  const total = swatches.reduce((s, sw) => s + sw.population, 0);
  if (total === 0) return palette.dominantSwatch?.rgb ?? 0;
  const vibrant = palette.vibrantSwatch;
  if (vibrant && vibrant.population / total >= 0.4) {
    return vibrant.rgb;
  }
  const dominant = palette.dominantSwatch;
  if (!dominant) return 0;
  if (dominant.population / total >= 0.9) {
    return dominant.rgb;
  }
  const dHsl = dominant.hsl;
  const d2 = swatches.length > 1 ? swatches[1] : null;
  if (!d2) return dominant.rgb;
  const d1_1Pop = calculatePopulation(swatches, dominant);
  const d2_1Pop = calculatePopulation(swatches, d2);
  const d1_1Ratio = d1_1Pop / total;
  const d2_1Ratio = d2_1Pop / total;
  const d3 = swatches.length > 2 ? swatches[2] : null;
  if (!d3) {
    if (isHslInRange(dHsl[1], dHsl[2]) && d2_1Pop <= d1_1Pop) {
      return dominant.rgb;
    } else {
      if (isHslInRange(d2.hsl[1], d2.hsl[2]) && d2_1Pop >= 0.5 * d1_1Pop) {
        return d2.rgb;
      } else {
        return dominant.rgb;
      }
    }
  }
  const d3_1Pop = calculatePopulation(swatches, d3);
  const d3_1Ratio = d3_1Pop / total;
  if (isHslInRange(dHsl[1], dHsl[2]) && d2_1Pop <= d1_1Pop && d3_1Pop <= d1_1Pop) {
    return nearlyPopulationOr(d1_1Ratio, dominant, d2_1Ratio, d2, d3_1Ratio, d3, dominant);
  }
  if (isHslInRange(d2.hsl[1], d2.hsl[2]) && d2_1Pop >= 0.5 * d1_1Pop && d2_1Pop >= d3_1Pop) {
    return nearlyPopulationOr(d2_1Ratio, d2, d1_1Ratio, dominant, d3_1Ratio, d3, d2);
  }
  if (isHslInRange(d3.hsl[1], d3.hsl[2]) && d3_1Pop >= 0.5 * d1_1Pop) {
    return nearlyPopulationOr(d3_1Ratio, d3, d1_1Ratio, dominant, d2_1Ratio, d2, d3);
  }
  if (isHslInRange(d2.hsl[1], d2.hsl[2]) && d2_1Pop >= 0.5 * d1_1Pop) {
    return nearlyPopulationOr(d2_1Ratio, d2, d1_1Ratio, dominant, d3_1Ratio, d3, d2);
  }
  if (isNearbyDominant(d1_1Ratio, d2_1Ratio, d3_1Ratio)) {
    const diff1 = Math.abs(1 - dHsl[1]) + Math.abs(dHsl[2] - 0.5);
    const diff2 = Math.abs(1 - d2.hsl[1]) + Math.abs(d2.hsl[2] - 0.5);
    // NOTE: Bundle uses d2.hsl[2] in diff3 too — preserved verbatim for AIO parity.
    const diff3 = Math.abs(1 - d3.hsl[1]) + Math.abs(d2.hsl[2] - 0.5);
    if (diff1 < diff2 && diff1 < diff3) return dominant.rgb;
    if (diff2 < diff1 && diff2 < diff3) return d2.rgb;
    return d3.rgb;
  }
  const d2Cond = d2_1Pop >= 0.4 * d1_1Pop && isHslInRange(d2.hsl[1], d2.hsl[2]);
  const d3Cond = d3_1Pop >= 0.4 * d1_1Pop && isHslInRange(d3.hsl[1], d3.hsl[2]);
  if (d2Cond && d3Cond) {
    return d2_1Pop > d3_1Pop ? d2.rgb : d3.rgb;
  }
  if (d2Cond) return d2.rgb;
  if (d3Cond) return d3.rgb;
  const pool = [
    { sw: dominant, pop: d1_1Pop },
    { sw: d2, pop: d2_1Pop },
    { sw: d3, pop: d3_1Pop },
  ].sort((a, b) => b.pop - a.pop);
  const [first, second, third] = pool;
  if (first.pop === second.pop && first.pop === third.pop) {
    const d1f = offsetSL(first.sw.hsl);
    const d2f = offsetSL(second.sw.hsl);
    const d3f = offsetSL(third.sw.hsl);
    if (d1f < d2f && d1f < d3f) return first.sw.rgb;
    if (d2f < d1f && d2f < d3f) return second.sw.rgb;
    return third.sw.rgb;
  }
  if (first.pop === second.pop) {
    const d1f = offsetSL(first.sw.hsl);
    const d2f = offsetSL(second.sw.hsl);
    return d1f < d2f ? first.sw.rgb : second.sw.rgb;
  }
  return first.sw.rgb;
}

function nearlyPopulationOr(
  r1: number,
  sw1: Swatch,
  r2: number,
  sw2: Swatch,
  r3: number,
  sw3: Swatch,
  fallback: Swatch,
): number {
  const minR = r1 * 0.95;
  const maxR = r1 * 1.05;
  const candidates: { diff: number; rgb: number }[] = [];
  if (r2 >= minR && r2 <= maxR) {
    candidates.push({ diff: offsetSL(sw2.hsl), rgb: sw2.rgb });
  }
  if (r3 >= minR && r3 <= maxR) {
    candidates.push({ diff: offsetSL(sw3.hsl), rgb: sw3.rgb });
  }
  if (candidates.length === 0) return fallback.rgb;
  candidates.push({ diff: offsetSL(sw1.hsl), rgb: sw1.rgb });
  return candidates.reduce((best, cur) => (cur.diff < best.diff ? cur : best)).rgb;
}

function offsetSL(hsl: readonly [number, number, number]): number {
  return Math.abs(1 - hsl[1]) + Math.abs(hsl[2] - 0.5);
}

function isNearbyDominant(r1: number, r2: number, r3: number): boolean {
  const minR = Math.min(r1, r2, r3);
  const maxR = Math.max(r1, r2, r3);
  return maxR - minR <= 0.1;
}

function calculatePopulation(swatches: Swatch[], target: Swatch): number {
  let total = 0;
  for (const sw of swatches) {
    if (colorMatch(target, sw)) total += sw.population;
  }
  return total;
}

function colorMatch(target: Swatch, current: Swatch): boolean {
  const tH = Math.round(target.hsl[0]);
  const tS = Math.round(target.hsl[1] * 100);
  const tL = Math.round(target.hsl[2] * 100);
  const cH = Math.round(current.hsl[0]);
  const cS = Math.round(current.hsl[1] * 100);
  const cL = Math.round(current.hsl[2] * 100);
  return hslMatch(tH, cH, 360, 15) && hslMatch(tS, cS, 100, 40) && hslMatch(tL, cL, 100, 30);
}

function hslMatch(targetValue: number, currentValue: number, totalRange: number, range: number): boolean {
  if (targetValue >= 0 && targetValue < range) {
    return (
      (currentValue >= 0 && currentValue <= targetValue + range) ||
      (currentValue >= targetValue + totalRange - range && currentValue <= totalRange)
    );
  } else if (targetValue >= range && targetValue <= totalRange - range) {
    return currentValue >= targetValue - range && currentValue <= targetValue + range;
  } else if (targetValue > totalRange - range && targetValue <= totalRange) {
    return (
      (currentValue >= targetValue - range && currentValue <= totalRange) ||
      (currentValue >= 0 && currentValue <= targetValue - totalRange + range)
    );
  }
  return false;
}

function dominantsRatio(palette: Palette): [number, number, number] {
  const sorted = [...palette.swatches].sort((a, b) => b.population - a.population);
  const total = sorted.reduce((s, sw) => s + sw.population, 0);
  if (total === 0) return [0, 0, 0];
  let r1 = 0;
  if (palette.dominantSwatch) {
    r1 = calculatePopulation(sorted, palette.dominantSwatch) / total;
  }
  const d2 = sorted[1] ?? null;
  const r2 = d2 ? calculatePopulation(sorted, d2) / total : 0;
  const d3 = sorted[2] ?? null;
  const r3 = d3 ? calculatePopulation(sorted, d3) / total : 0;
  return [r1, r2, r3];
}

const POPULATION_THRESHOLD = 0.05;
const HIGH_POPULATION_THRESHOLD = 0.15;
const MIN_SATURATION = 0.1;
const MIN_LIGHTNESS = 0.12;
const MAX_LIGHTNESS = 0.88;

function isInValidRegion(s01: number, l01: number): boolean {
  return !BLACK_WHITE_POLYGON_CONTAINS(s01 * 100, l01 * 100);
}

function getScore(sw: Swatch, totalPop: number): number {
  const s100 = sw.hsl[1] * 100;
  const l100 = sw.hsl[2] * 100;
  const popRatio = totalPop > 0 ? sw.population / totalPop : 0;
  const lightnessScore = 1 - Math.abs(l100 - 50) / 50;
  return s100 * 0.4 + lightnessScore * 100 * 0.3 + popRatio * 100 * 0.3;
}

export interface PickerResult {
  swatch: Swatch | null;
  source:
    | 'noinput'
    | 'allneutral_fallback'
    | 'step3_top15'
    | 'step5_score'
    | 'step6_validfallback'
    | 'step7_popfallback';
}

export function selectPrimaryColor(swatches: Swatch[]): PickerResult {
  if (swatches.length === 0) return { swatch: null, source: 'noinput' };
  const totalPop = swatches.reduce((s, sw) => s + sw.population, 0);
  if (totalPop === 0) return { swatch: null, source: 'noinput' };
  const validColors = swatches.filter((c) => isInValidRegion(c.hsl[1], c.hsl[2]));
  if (validColors.length === 0) {
    const winner = selectByPopulationOnly(swatches);
    return { swatch: winner, source: 'allneutral_fallback' };
  }
  const sortedValid = [...validColors].sort((a, b) => b.population - a.population);
  const top = sortedValid[0];
  const topRatio = top.population / totalPop;
  if (topRatio >= HIGH_POPULATION_THRESHOLD) {
    const topS = top.hsl[1] * 100;
    const topL = top.hsl[2] * 100;
    if (topS >= MIN_SATURATION * 100 && topL >= MIN_LIGHTNESS * 100 && topL <= MAX_LIGHTNESS * 100) {
      return { swatch: top, source: 'step3_top15' };
    }
  }
  let significant = sortedValid.filter((c) => c.population / totalPop >= POPULATION_THRESHOLD);
  if (significant.length === 0) significant = sortedValid;
  let bestColor: Swatch | null = null;
  let bestScore = -1;
  for (const c of significant) {
    const cS = c.hsl[1] * 100;
    const cL = c.hsl[2] * 100;
    if (cL < MIN_LIGHTNESS * 100 || cL > MAX_LIGHTNESS * 100) continue;
    if (cS < MIN_SATURATION * 100) continue;
    const sc = getScore(c, totalPop);
    if (sc > bestScore) {
      bestScore = sc;
      bestColor = c;
    }
  }
  if (bestColor !== null) return { swatch: bestColor, source: 'step5_score' };
  if (sortedValid.length > 0) return { swatch: sortedValid[0], source: 'step6_validfallback' };
  return { swatch: selectByPopulationOnly(swatches), source: 'step7_popfallback' };
}

function selectByPopulationOnly(swatches: Swatch[]): Swatch | null {
  if (swatches.length === 0) return null;
  let best = swatches[0];
  for (let i = 1; i < swatches.length; i++) {
    if (swatches[i].population > best.population) best = swatches[i];
  }
  return best;
}

export interface Target {
  minimumSaturation: number;
  targetSaturation: number;
  maximumSaturation: number;
  minimumLightness: number;
  targetLightness: number;
  maximumLightness: number;
  saturationWeight: number;
  lightnessWeight: number;
  populationWeight: number;
  isExclusive: boolean;
}

const TARGET_DARK_LUMA = 0.26;
const MAX_DARK_LUMA = 0.45;
const MIN_LIGHT_LUMA = 0.55;
const TARGET_LIGHT_LUMA = 0.74;
const MIN_NORMAL_LUMA = 0.3;
const TARGET_NORMAL_LUMA = 0.5;
const MAX_NORMAL_LUMA = 0.7;
const TARGET_MUTED_SATURATION = 0.3;
const MAX_MUTED_SATURATION = 0.4;
const TARGET_VIBRANT_SATURATION = 1;
const MIN_VIBRANT_SATURATION = 0.35;
const WEIGHT_SATURATION = 0.24;
const WEIGHT_LUMA = 0.52;
const WEIGHT_POPULATION = 0.24;

export function normalizeWeights(w1: number, w2: number, w3: number): [number, number, number] {
  const sum = (w1 > 0 ? w1 : 0) + (w2 > 0 ? w2 : 0) + (w3 > 0 ? w3 : 0);
  if (sum === 0) return [w1, w2, w3];
  return [w1 > 0 ? w1 / sum : w1, w2 > 0 ? w2 / sum : w2, w3 > 0 ? w3 / sum : w3];
}

export function make(
  satMin: number,
  satTarget: number,
  satMax: number,
  lumMin: number,
  lumTarget: number,
  lumMax: number,
): Target {
  const [ws, wl, wp] = normalizeWeights(WEIGHT_SATURATION, WEIGHT_LUMA, WEIGHT_POPULATION);
  return {
    minimumSaturation: satMin,
    targetSaturation: satTarget,
    maximumSaturation: satMax,
    minimumLightness: lumMin,
    targetLightness: lumTarget,
    maximumLightness: lumMax,
    saturationWeight: ws,
    lightnessWeight: wl,
    populationWeight: wp,
    isExclusive: true,
  };
}

export const LIGHT_VIBRANT = make(MIN_VIBRANT_SATURATION, TARGET_VIBRANT_SATURATION, 1, MIN_LIGHT_LUMA, TARGET_LIGHT_LUMA, 1);
export const VIBRANT = make(MIN_VIBRANT_SATURATION, TARGET_VIBRANT_SATURATION, 1, MIN_NORMAL_LUMA, TARGET_NORMAL_LUMA, MAX_NORMAL_LUMA);
export const DARK_VIBRANT = make(MIN_VIBRANT_SATURATION, TARGET_VIBRANT_SATURATION, 1, 0, TARGET_DARK_LUMA, MAX_DARK_LUMA);
export const LIGHT_MUTED = make(0, TARGET_MUTED_SATURATION, MAX_MUTED_SATURATION, MIN_LIGHT_LUMA, TARGET_LIGHT_LUMA, 1);
export const MUTED = make(0, TARGET_MUTED_SATURATION, MAX_MUTED_SATURATION, MIN_NORMAL_LUMA, TARGET_NORMAL_LUMA, MAX_NORMAL_LUMA);
export const DARK_MUTED = make(0, TARGET_MUTED_SATURATION, MAX_MUTED_SATURATION, 0, TARGET_DARK_LUMA, MAX_DARK_LUMA);

export const DEFAULT_TARGETS: Target[] = [
  LIGHT_VIBRANT,
  VIBRANT,
  DARK_VIBRANT,
  LIGHT_MUTED,
  MUTED,
  DARK_MUTED,
];

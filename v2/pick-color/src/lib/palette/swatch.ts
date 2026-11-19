import { blue, green, red } from './color';
import { rgbToHsl } from './color-utils';
import type { Swatch } from './types';

export function makeSwatch(rgbInt: number, population: number): Swatch {
  const r = red(rgbInt);
  const g = green(rgbInt);
  const b = blue(rgbInt);
  const hsl = rgbToHsl(r, g, b);
  return {
    rgb: rgbInt,
    hex: (rgbInt & 16777215).toString(16).padStart(6, '0'),
    hsl,
    population,
  };
}

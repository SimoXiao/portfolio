import { blue, constrainFloat, green, red } from './color';
import type { Hsl } from './types';

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rf = Math.fround(r / 255);
  const gf = Math.fround(g / 255);
  const bf = Math.fround(b / 255);
  const max = Math.fround(Math.max(rf, Math.max(gf, bf)));
  const min = Math.fround(Math.min(rf, Math.min(gf, bf)));
  const deltaMaxMin = Math.fround(max - min);
  let h: number;
  let s: number;
  const l = Math.fround((max + min) / 2);
  if (max === min) {
    h = 0;
    s = 0;
  } else {
    if (max === rf) {
      h = Math.fround(Math.fround((gf - bf) / deltaMaxMin) % 6);
    } else if (max === gf) {
      h = Math.fround(Math.fround((bf - rf) / deltaMaxMin) + 2);
    } else {
      h = Math.fround(Math.fround((rf - gf) / deltaMaxMin) + 4);
    }
    s = Math.fround(deltaMaxMin / Math.fround(1 - Math.abs(Math.fround(2 * l - 1))));
  }
  h = Math.fround(Math.fround(h * 60) % 360);
  if (h < 0) {
    h = Math.fround(h + 360);
  }
  return [constrainFloat(h, 0, 360), constrainFloat(s, 0, 1), constrainFloat(l, 0, 1)];
}

export function colorToHsl(color: number): Hsl {
  return rgbToHsl(red(color), green(color), blue(color));
}

export const BLACK = 4278190080 | 0;
export const WHITE = 4294967295 | 0;

export function red(color: number): number {
  return (color >>> 16) & 255;
}

export function green(color: number): number {
  return (color >>> 8) & 255;
}

export function blue(color: number): number {
  return color & 255;
}

export function rgb(r: number, g: number, b: number): number {
  return ((255 << 24) | ((r & 255) << 16) | ((g & 255) << 8) | (b & 255)) | 0;
}

export function constrainFloat(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export function rgbIntToHex(color: number): string {
  const v = color & 16777215;
  return v.toString(16).padStart(6, '0');
}

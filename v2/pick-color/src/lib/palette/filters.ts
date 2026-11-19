/**
 * Black/white classification polygon, mirroring the line-up used by the production
 * AIO service. Coordinates are (S%, L%) and the test is "point in polygon".
 */
const POLY_S = [0, 100, 100, 10, 10, 100, 100, 0];
const POLY_L = [0, 0, 5, 12, 88, 98, 100, 100];

export function BLACK_WHITE_POLYGON_CONTAINS(x: number, y: number): boolean {
  const nvert = POLY_S.length;
  let inside = false;
  for (let i = 0, j = nvert - 1; i < nvert; j = i++) {
    const xi = POLY_S[i];
    const yi = POLY_L[i];
    const xj = POLY_S[j];
    const yj = POLY_L[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Predicate "this saturation/lightness pair is a meaningful colored pixel (not B/W)". */
export function isHslInRange(s: number, l: number): boolean {
  if (l > 0.98 || l < 0.05 || s <= 0.1) return false;
  return !BLACK_WHITE_POLYGON_CONTAINS(s * 100, l * 100);
}

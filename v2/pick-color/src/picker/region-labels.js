export const REGION_ORDER = ['D', 'T', 'B', 'L', 'R'];

export const REGION_LABELS = {
  D: 'D(主色)',
  T: 'T(顶20%)',
  B: 'B(底20%)',
  L: 'L(左20%)',
  R: 'R(右20%)',
};

export function formatRegionLabel(region) {
  return REGION_LABELS[region] || region;
}

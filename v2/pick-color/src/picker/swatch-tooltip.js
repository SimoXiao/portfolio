export function totalPopulation(list) {
  return list.reduce((sum, sw) => sum + (Number(sw?.population) || 0), 0);
}

export function formatPct(sw, total = 0) {
  let ratio = Number(sw?.populationRatio);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    ratio = total > 0 ? (Number(sw?.population) || 0) / total : 0;
  }
  return ratio > 0 ? `${(ratio * 100).toFixed(1)}%` : '';
}

export function formatSwatchTooltip(sw, label = '', total = 0) {
  if (!sw?.hex) return label || '';
  const upperHex = sw.hex.toUpperCase();
  const pop = Number(sw.population) || 0;
  const pct = formatPct(sw, total);
  const parts = [];
  if (label) parts.push(label);
  parts.push(upperHex);
  if (pop > 0 || pct) parts.push(`pop=${pop}${pct ? ` · ${pct}` : ''}`);
  if (sw.rgb) parts.push(`RGB ${sw.rgb.r},${sw.rgb.g},${sw.rgb.b}`);
  if (sw.hsl) parts.push(`HSL ${sw.hsl.h}/${sw.hsl.s}/${sw.hsl.l}`);
  return parts.join(' · ');
}

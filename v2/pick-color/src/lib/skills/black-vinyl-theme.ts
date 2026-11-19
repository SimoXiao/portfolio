import type { SwatchDto, UnifiedResult } from '../picker-pipeline';

export type BlackVinylSource = 'D.no_filter' | 'D.with_filter' | 'palette_16[0]';

export interface BlackVinylThemeOptions {
  source?: BlackVinylSource;
}

export interface BlackVinylHslInput {
  h: number;
  s: number;
  l: number;
  hex?: string;
  source?: string;
}

export interface VinylColorToken {
  hex: string;
  hsl: string;
  h: number;
  s: number;
  l: number;
}

export interface BlackVinylTheme {
  skillCode: 'BLACK_VINYL_PAGE_THEME';
  version: '0.2.0';
  source: string;
  range: string;
  base: {
    hex: string;
    h: number;
    s: number;
    l: number;
  };
  adjusted: {
    s: number;
    topL: number;
    bottomL: number;
    saturationDivisor: number;
    saturationFormula: string;
    topLightnessFormula: string;
    bottomLightnessFormula: string;
  };
  gradient: {
    angle: '180deg';
    top: VinylColorToken;
    bottom: VinylColorToken;
    css: string;
  };
  tokens: {
    bgTop: string;
    bgBottom: string;
    bgTopHsl: string;
    bgBottomHsl: string;
    backgroundGradient: string;
    accent: string;
    buttonFill: string;
    buttonFillHsl: string;
    buttonText: string;
    textPrimary: string;
    textSecondary: string;
  };
  css: string;
  explanation: string[];
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round(n: number): number {
  return Math.round(n);
}

function hslCss(h: number, s: number, l: number): string {
  return `hsl(${round(h)} ${round(s)}% ${round(l)}%)`;
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = (((h % 360) + 360) % 360) / 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;

  if (sat === 0) {
    const v = round(light * 255);
    return `#${v.toString(16).padStart(2, '0').repeat(3)}`;
  }

  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  const channel = (t0: number) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const r = round(channel(hue + 1 / 3) * 255);
  const g = round(channel(hue) * 255);
  const b = round(channel(hue - 1 / 3) * 255);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function colorToken(h: number, s: number, l: number): VinylColorToken {
  const hh = round(h);
  const ss = clamp(round(s), 0, 100);
  const ll = clamp(round(l), 0, 100);
  return {
    hex: hslToHex(hh, ss, ll),
    hsl: hslCss(hh, ss, ll),
    h: hh,
    s: ss,
    l: ll,
  };
}

function swatchSource(
  result: UnifiedResult,
  preferred: BlackVinylSource = 'D.no_filter',
): { label: string; swatch: SwatchDto | null | undefined } {
  const candidates: Array<{ label: BlackVinylSource; swatch: SwatchDto | null | undefined }> = [
    { label: 'D.no_filter', swatch: result.dominate?.no_filter },
    { label: 'D.with_filter', swatch: result.dominate?.with_filter },
    { label: 'palette_16[0]', swatch: result.palette_16?.[0] },
  ];
  candidates.sort((a, b) => {
    if (a.label === preferred) return -1;
    if (b.label === preferred) return 1;
    return 0;
  });
  return candidates.find((item) => item.swatch?.hsl) || candidates[0];
}

function saturationRule(l: number): { divisor: number; range: string; formula: string; note: string } {
  if (l <= 0) {
    return { divisor: 0, range: 'L=0', formula: '新S = 0', note: 'L=0 时按规则将 S 归零。' };
  }
  if (l <= 4) {
    return {
      divisor: ((100 - l) / l) * 0.5,
      range: '1<=L<=4',
      formula: '新S = 原S ÷ ((100 - 原L) ÷ 原L × 0.5)',
      note: '极暗色按表格倍数降低 S，避免暗部颜色过脏。',
    };
  }
  if (l <= 14) {
    return {
      divisor: ((Math.abs(l - 50) * Math.abs(l - 50)) / 800) * 1 - l / 100,
      range: '5<=L<=14',
      formula: '新S = 原S ÷ (|原L - 50| × |原L - 50| ÷ 800 × 1 - 原L / 100)',
      note: '暗色区按二次曲线倍数调整 S；这里按正常运算优先级执行，不额外加括号。',
    };
  }
  if (l <= 19) {
    return {
      divisor: (Math.abs(l - 50) * Math.abs(l - 50)) / 800,
      range: '15<=L<=19',
      formula: '新S = 原S ÷ (|原L - 50| × |原L - 50| ÷ 800 × 1)',
      note: '低亮度区继续按二次曲线倍数调整 S。',
    };
  }
  if (l <= 70) {
    return {
      divisor: 1,
      range: '20<=L<=70',
      formula: '新S = 原S ÷ 1',
      note: '中间亮度区 S 保持不变，主要调整背景明度。',
    };
  }
  if (l <= 95) {
    return {
      divisor: ((Math.abs(l - 50) * Math.abs(l - 50)) / 800) * 2,
      range: '71<=L<=95',
      formula: '新S = 原S ÷ (|原L - 50| × |原L - 50| ÷ 800 × 2)',
      note: '高亮区按表格倍数降低 S，把浅色封面压回黑胶页可用范围。',
    };
  }
  if (l < 100) {
    return {
      divisor: (l / (100 - l)) * 0.5,
      range: '96<=L<=99',
      formula: '新S = 原S ÷ (原L ÷ (100 - 原L) × 0.5)',
      note: '接近白色时继续降低 S，避免白场偏色过强。',
    };
  }
  return { divisor: 0, range: 'L=100', formula: '新S = 0', note: 'L=100 时按规则将 S 归零。' };
}

function adjustedS(rawS: number, rule: ReturnType<typeof saturationRule>): number {
  if (rule.divisor === 0) return 0;
  return clamp(round(rawS / rule.divisor), 0, 100);
}

function backgroundLightnessRule(
  l: number,
): { topL: number; bottomL: number; topFormula: string; bottomFormula: string; note: string } {
  if (l <= 19) {
    let topL = 0.2 * l + 18 + l / 100;
    if (topL > 20) topL -= 1;
    return {
      topL,
      bottomL: 0.1 * l + 8 + l / 100,
      topFormula: '顶点新L = 0.2 × 原L + 18 + 原L ÷ 100；若新L > 20，则新L - 1',
      bottomFormula: '底点新L = 0.1 × 原L + 8 + 原L ÷ 100',
      note: '低亮度区使用暗部公式，顶部略亮、底部更暗，保证黑胶页层次。',
    };
  }
  if (l <= 70) {
    let topL = 0.1 * l + 30;
    if (topL > 35) topL -= 1;
    if (topL > l) topL = l;
    return {
      topL,
      bottomL: 0.1 * l + 10,
      topFormula: '顶点新L = 0.1 × 原L + 30；若新L > 35，则新L - 1；若新L > 原L，则取原L',
      bottomFormula: '底点新L = 0.1 × 原L + 10',
      note: '中间亮度区顶部 L 受原始 L 限制，避免背景比主色更亮。',
    };
  }
  return {
    topL: 0.2 * l + 20 + l / 100,
    bottomL: 0.1 * l + 10 + l / 100,
    topFormula: '顶点新L = 0.2 × 原L + 20 + 原L ÷ 100',
    bottomFormula: '底点新L = 0.1 × 原L + 10 + 原L ÷ 100',
    note: '高亮区使用高亮公式，把浅色封面压回黑胶页可用的深色渐变。',
  };
}

function cssText(theme: Omit<BlackVinylTheme, 'css'>): string {
  return [
    ':root {',
    `  --vinyl-bg-top: ${theme.tokens.bgTop};`,
    `  --vinyl-bg-bottom: ${theme.tokens.bgBottom};`,
    `  --vinyl-bg-top-hsl: ${theme.tokens.bgTopHsl};`,
    `  --vinyl-bg-bottom-hsl: ${theme.tokens.bgBottomHsl};`,
    `  --vinyl-accent: ${theme.tokens.accent};`,
    `  --vinyl-button-fill: ${theme.tokens.buttonFill};`,
    `  --vinyl-button-text: ${theme.tokens.buttonText};`,
    `  --vinyl-text-primary: ${theme.tokens.textPrimary};`,
    `  --vinyl-text-secondary: ${theme.tokens.textSecondary};`,
    '}',
    '',
    '.vinyl-page {',
    `  background: ${theme.tokens.backgroundGradient};`,
    '  color: var(--vinyl-text-primary);',
    '}',
  ].join('\n');
}

export function createBlackVinylThemeFromHsl(input: BlackVinylHslInput): BlackVinylTheme | null {
  if (![input.h, input.s, input.l].every(Number.isFinite)) return null;

  const h = round(input.h);
  const rawS = clamp(round(input.s), 0, 100);
  const rawL = clamp(round(input.l), 0, 100);
  const baseHex = input.hex || colorToken(h, rawS, rawL).hex;
  const sat = saturationRule(rawL);
  const bg = backgroundLightnessRule(rawL);
  const nextS = adjustedS(rawS, sat);
  const topL = clamp(round(bg.topL), 0, 100);
  const bottomL = clamp(round(bg.bottomL), 0, 100);
  const buttonL = clamp(round(Math.max(topL, bottomL) + 42), 70, 92);
  const top = colorToken(h, nextS, topL);
  const bottom = colorToken(h, nextS, bottomL);
  const button = colorToken(h, clamp(nextS + 8, 0, 100), buttonL);
  const gradientCss = `linear-gradient(180deg, ${top.hex} 0%, ${bottom.hex} 100%)`;

  const themeWithoutCss = {
    skillCode: 'BLACK_VINYL_PAGE_THEME' as const,
    version: '0.2.0' as const,
    source: input.source || 'HSL input',
    range: sat.range,
    base: {
      hex: baseHex,
      h,
      s: rawS,
      l: rawL,
    },
    adjusted: {
      s: nextS,
      topL,
      bottomL,
      saturationDivisor: Number(sat.divisor.toFixed(3)),
      saturationFormula: sat.formula,
      topLightnessFormula: bg.topFormula,
      bottomLightnessFormula: bg.bottomFormula,
    },
    gradient: {
      angle: '180deg' as const,
      top,
      bottom,
      css: gradientCss,
    },
    tokens: {
      bgTop: top.hex,
      bgBottom: bottom.hex,
      bgTopHsl: top.hsl,
      bgBottomHsl: bottom.hsl,
      backgroundGradient: gradientCss,
      accent: baseHex,
      buttonFill: button.hex,
      buttonFillHsl: button.hsl,
      buttonText: 'hsla(10, 74%, 49%, 1)',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.68)',
    },
    explanation: [
      `基准色取自 ${input.source || 'HSL input'}：${baseHex}，H=${h}、S=${rawS}、L=${rawL}。`,
      `H 保持不变，命中 ${sat.range} 区间，S 倍数=${Number(sat.divisor.toFixed(3))}，${sat.formula}，新 S=${nextS}。${sat.note}`,
      `${bg.note} ${bg.topFormula}；${bg.bottomFormula}。新顶部 L=${topL}，新底部 L=${bottomL}。`,
      'S 与 L 均已四舍五入，并限制在 0-100 范围内，方便直接落到 CSS / Figma token。',
    ],
  };

  return {
    ...themeWithoutCss,
    css: cssText(themeWithoutCss),
  };
}

export function createBlackVinylTheme(
  result: UnifiedResult,
  options: BlackVinylThemeOptions = {},
): BlackVinylTheme | null {
  const picked = swatchSource(result, options.source || 'D.no_filter');
  const swatch = picked.swatch;
  if (!swatch?.hsl) return null;

  return createBlackVinylThemeFromHsl({
    hex: swatch.hex,
    h: swatch.hsl.h,
    s: swatch.hsl.s,
    l: swatch.hsl.l,
    source: picked.label,
  });
}

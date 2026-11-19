/**
 * Bin width / sizes used by the MMCQ quantizer. Ported from JniPalette's
 * `ColorHistogram` constants. Each component is encoded into 5 bits, so the
 * histogram has 32^3 buckets.
 */
export const QUANTIZE_WORD_WIDTH = 5;
export const QUANTIZE_WORD_MASK = (1 << QUANTIZE_WORD_WIDTH) - 1;
export const HIST_SIZE = 1 << (QUANTIZE_WORD_WIDTH * 3);

export type Hsl = readonly [number, number, number];

export interface Swatch {
  rgb: number;
  hex: string;
  hsl: Hsl;
  population: number;
}

export interface PixelBuffer {
  pixels: Int32Array;
  width: number;
  height: number;
}

export type ColorFilter = (rgbInt: number, hsl: Hsl) => boolean;

export interface ExtractColorParam {
  resize?: number | null;
  maxColorCount?: number;
  selector?: 'picker' | 'default';
}

export interface PopulationEntry {
  hex: string;
  rgb: number;
  population: number;
  populationRatio: number;
}

export interface ExtractColorResult {
  googleDominantColor: number;
  googleDominantColorHex: string;
  dominantColor: number;
  dominantColorHex: string;
  populations?: PopulationEntry[];
  dominants?: [number, number, number];
}

export interface RegionPair {
  noFilter: ExtractColorResult;
  withFilter: ExtractColorResult;
}

export interface ExtractAllRegionsResult {
  version: '0.3';
  width: number;
  height: number;
  regions: {
    D: RegionPair;
    T: RegionPair;
    B: RegionPair;
    L: RegionPair;
    R: RegionPair;
  };
  headerNmcl: string;
}

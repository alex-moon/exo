import { Cartographic } from './cartographic.ts';

export class Config {
  static readonly RADIUS = 500;
  static readonly DEFAULT_LNG = -1.60834;
  static readonly DEFAULT_LAT = 55.01207;
  static cartographic = new Cartographic(
    Config.DEFAULT_LNG,
    Config.DEFAULT_LAT
  );
}

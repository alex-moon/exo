import { Terrain } from '../terrain.ts';
import { GeoUtils } from '../utils/geo.ts';

export class TerrainProvider {
  private static instance: TerrainProvider;
  private cache: Map<string, Float32Array> = new Map();
  private fetching: Map<string, Promise<Float32Array>> = new Map();

  private constructor() {}

  public static getInstance(): TerrainProvider {
    if (!TerrainProvider.instance) {
      TerrainProvider.instance = new TerrainProvider();
    }
    return TerrainProvider.instance;
  }

  public async getAlt(lng: number, lat: number): Promise<number> {
    const zoom = Terrain.ZOOM;
    const { x, y } = GeoUtils.lngLatToTile(lng, lat, zoom);

    // We need 4 pixels for interpolation, possibly spanning multiple tiles.
    // For simplicity, let's start with single tile sampling and then improve if needed.
    // Actually, linear interpolation within a tile is usually enough if we don't cross boundaries.
    // To handle boundaries properly, we'd need to fetch adjacent tiles.

    const tileData = await this.getTileData(x, y, zoom);

    const nwLng = GeoUtils.tile2lng(x, zoom);
    const nwLat = GeoUtils.tile2lat(y, zoom);
    const seLng = GeoUtils.tile2lng(x + 1, zoom);
    const seLat = GeoUtils.tile2lat(y + 1, zoom);

    const percentX = (lng - nwLng) / (seLng - nwLng);
    const percentY =
      (GeoUtils.lat2y(lat) - GeoUtils.lat2y(nwLat)) /
      (GeoUtils.lat2y(seLat) - GeoUtils.lat2y(nwLat));

    return this.sampleInterpolated(tileData, percentX, percentY);
  }

  private sampleInterpolated(
    data: Float32Array,
    percentX: number,
    percentY: number
  ): number {
    const res = 256;
    const x = percentX * (res - 1);
    const y = percentY * (res - 1);

    const x0 = Math.floor(x);
    const x1 = Math.min(x0 + 1, res - 1);
    const y0 = Math.floor(y);
    const y1 = Math.min(y0 + 1, res - 1);

    const dx = x - x0;
    const dy = y - y0;

    const v00 = data[y0 * res + x0];
    const v10 = data[y0 * res + x1];
    const v01 = data[y1 * res + x0];
    const v11 = data[y1 * res + x1];

    const v0 = v00 * (1 - dx) + v10 * dx;
    const v1 = v01 * (1 - dx) + v11 * dx;

    return v0 * (1 - dy) + v1 * dy;
  }

  private async getTileData(
    x: number,
    y: number,
    z: number
  ): Promise<Float32Array> {
    const key = `${z}/${x}/${y}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    if (this.fetching.has(key)) return this.fetching.get(key)!;

    const promise = this.fetchTile(x, y, z);
    this.fetching.set(key, promise);
    const data = await promise;
    this.cache.set(key, data);
    this.fetching.delete(key);
    return data;
  }

  private async fetchTile(
    x: number,
    y: number,
    z: number
  ): Promise<Float32Array> {
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const rgba = ctx.getImageData(0, 0, 256, 256).data;

    const alts = new Float32Array(256 * 256);
    for (let i = 0; i < 256 * 256; i++) {
      const r = rgba[i * 4];
      const g = rgba[i * 4 + 1];
      const b = rgba[i * 4 + 2];
      alts[i] = r * 256 + g + b / 256 - 32768;
    }
    return alts;
  }
}

import { GeoUtils } from '../utils/geo.ts';

export interface OsmElement {
  type: string;
  id: number;
  lat: number;
  lon: number;
  nodes: number[];
  tags: { [key: string]: string };
}

export interface OsmData {
  elements: OsmElement[];
}

export class OsmProvider {
  private static instance: OsmProvider;

  private constructor() {}

  public static getInstance(): OsmProvider {
    if (!OsmProvider.instance) {
      OsmProvider.instance = new OsmProvider();
    }
    return OsmProvider.instance;
  }

  public async getRoads(x: number, y: number, z: number): Promise<OsmData> {
    const bbox = GeoUtils.tileToBBox(x, y, z);
    const query = `[out:json][timeout:25];(way["highway"](${bbox}););out body;>;out skel qt;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Overpass API error');
    }
    return response.json();
  }
}

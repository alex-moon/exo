import { Ground } from './ground.ts';
import * as THREE from 'three';
import { Config } from './config.ts';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { TerrainProvider } from './provider/terrain.ts';
import { type OsmData, type OsmElement, OsmProvider } from './provider/osm.ts';
import { GeoUtils } from './utils/geo.ts';

export class Osm extends Ground {
  static readonly ZOOM = 15;

  private x?: number;
  private y?: number;
  private z?: number;
  private lastLng?: number;
  private lastLat?: number;

  private roadMaterial: LineMaterial;

  public constructor() {
    super();
    // We use a Group to hold many individual building meshes
    this.mesh = new THREE.Group();

    this.roadMaterial = new LineMaterial({
      color: 0x00ff00,
      linewidth: 5,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      opacity: 0.5,
      transparent: true,
    });

    window.addEventListener('resize', () => {
      this.roadMaterial.resolution.set(window.innerWidth, window.innerHeight);
    });
  }

  public update(): void {
    const lng = Config.cartographic.getLng();
    const lat = Config.cartographic.getLat();
    const z = Osm.ZOOM;

    const { x, y } = GeoUtils.lngLatToTile(lng, lat, z);
    if (
      x === this.x &&
      y === this.y &&
      z === this.z &&
      this.lastLng !== undefined &&
      Math.abs(this.lastLng - lng) < 0.0001 &&
      this.lastLat !== undefined &&
      Math.abs(this.lastLat - lat) < 0.0001
    ) {
      return;
    }

    this.x = x;
    this.y = y;
    this.z = z;
    this.lastLng = lng;
    this.lastLat = lat;

    // Clear previous roads
    (this.mesh as THREE.Group).clear();

    OsmProvider.getInstance()
      .getRoads(x, y, z)
      .then((data) => {
        this.renderRoads(data, lat, lng);
      })
      .catch((err) => console.error('OSM Fetch Error:', err));
  }

  private async renderRoads(
    data: OsmData,
    centerLat: number,
    centerLng: number
  ) {
    const nodes = new Map();
    const roadGroups = new Map<string, { lng: number; lat: number }[]>();
    const tileSize = GeoUtils.width(centerLat, Osm.ZOOM);

    // 1. Map nodes
    data.elements.forEach((el: OsmElement) => {
      if (el.type === 'node') nodes.set(el.id, [el.lon, el.lat]);
    });

    // 2. Group points by road name
    data.elements.forEach((el: OsmElement) => {
      if (el.type === 'way' && el.nodes && el.tags?.name) {
        const name = el.tags.name;
        if (!roadGroups.has(name)) {
          roadGroups.set(name, []);
        }

        el.nodes.forEach((nodeId: number) => {
          const node = nodes.get(nodeId);
          if (node) {
            roadGroups.get(name)!.push({ lng: node[0], lat: node[1] });
          }
        });
      }
    });

    // 3. Draw and Label
    const provider = TerrainProvider.getInstance();
    const playerAlt = await provider.getAlt(centerLng, centerLat);

    for (const [name, path] of roadGroups) {
      const points: number[] = [];
      const vectorPoints: THREE.Vector3[] = [];
      for (const p of path) {
        const local = this.lngLatToLocal(
          p.lng,
          p.lat,
          centerLng,
          centerLat,
          tileSize
        );
        const alt = await provider.getAlt(p.lng, p.lat);
        const pos = new THREE.Vector3(-local.x, alt - playerAlt + 0.2, local.y);
        points.push(pos.x, pos.y, pos.z);
        vectorPoints.push(pos);
      }

      // Draw the road geometry
      const geometry = new LineGeometry();
      geometry.setPositions(points);

      const line = new Line2(geometry, this.roadMaterial);
      line.computeLineDistances();
      this.mesh.add(line);

      // Find the "Nearest Point" to the user (0,0,0)
      const nearestPoint = this.findNearestPointOnPath(
        new THREE.Vector3(0, 0, 0),
        vectorPoints
      );

      // Create one single label for the whole road
      const label = this.createRoadLabel(name);
      label.position.copy(nearestPoint);
      this.mesh.add(label);
    }
  }

  private findNearestPointOnPath(
    target: THREE.Vector3,
    path: THREE.Vector3[]
  ): THREE.Vector3 {
    let minData = { distSq: Infinity, point: path[0] };
    const line = new THREE.Line3();
    const closest = new THREE.Vector3();

    for (let i = 0; i < path.length - 1; i++) {
      line.set(path[i], path[i + 1]);
      line.closestPointToPoint(target, true, closest);

      const d2 = target.distanceToSquared(closest);
      if (d2 < minData.distSq) {
        minData = { distSq: d2, point: closest.clone() };
      }
    }
    return minData.point;
  }

  private createRoadLabel(text: string): CSS2DObject {
    const div = document.createElement('div');
    div.className = 'road-label';
    div.textContent = text;
    return new CSS2DObject(div);
  }

  private lngLatToLocal(
    lng: number,
    lat: number,
    centerLng: number,
    centerLat: number,
    tileSize: number
  ) {
    // Calculate the distance in meters from the center of our diorama
    const x = (lng - centerLng) * (tileSize / (360 / Math.pow(2, Osm.ZOOM)));

    // Latitude is non-linear, but at this zoom level (1 mile), linear approximation is fine
    const latScale = (Math.PI * 6378137) / 180;
    const y = (lat - centerLat) * latScale;

    return { x, y };
  }
}

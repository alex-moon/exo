import {Ground} from "./ground.ts";
import * as THREE from "three";
import {Config} from "./config.ts";
import {CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';
import {TerrainProvider} from "./provider/terrain.ts";
import {OsmProvider} from "./provider/osm.ts";
import {GeoUtils} from "./utils/geo.ts";

export class Osm extends Ground {
    static readonly ZOOM = 15;
    static readonly BASEMENT_DEPTH = 1;

    private x?: number;
    private y?: number;
    private z?: number;

    public constructor() {
        super();
        // We use a Group to hold many individual building meshes
        this.mesh = new THREE.Group();
    }

    public update(): void {
        const lng = Config.cartographic.getLng();
        const lat = Config.cartographic.getLat();
        const z = Osm.ZOOM;

        const {x, y} = GeoUtils.lngLatToTile(lng, lat, z);
        if (x === this.x && y === this.y && z === this.z) {
            return;
        }

        this.x = x;
        this.y = y;
        this.z = z;

        // Clear previous roads
        (this.mesh as THREE.Group).clear();

        OsmProvider.getInstance().getRoads(x, y, z).then(data => {
            this.renderRoads(data, lat, lng);
        }).catch(err => console.error("OSM Fetch Error:", err));
    }

    private async renderRoads(data: any, centerLat: number, centerLng: number) {
        const nodes = new Map();
        const roadGroups = new Map<string, {lng: number, lat: number}[]>();
        const tileSize = GeoUtils.width(centerLat, Osm.ZOOM);

        // 1. Map nodes
        data.elements.forEach((el: any) => {
            if (el.type === 'node') nodes.set(el.id, [el.lon, el.lat]);
        });

        // 2. Group points by road name
        data.elements.forEach((el: any) => {
            if (el.type === 'way' && el.nodes && el.tags?.name) {
                const name = el.tags.name;
                if (!roadGroups.has(name)) roadGroups.set(name, []);

                el.nodes.forEach((nodeId: number) => {
                    const node = nodes.get(nodeId);
                    if (node) {
                        roadGroups.get(name)!.push({lng: node[0], lat: node[1]});
                    }
                });
            }
        });

        // 3. Draw and Label
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00, opacity: 0.5, transparent: true });

        const provider = TerrainProvider.getInstance();
        const playerAlt = await provider.getAlt(centerLng, centerLat);

        for (const [name, path] of roadGroups) {
            const points: THREE.Vector3[] = [];
            for (const p of path) {
                const local = this.lngLatToLocal(p.lng, p.lat, centerLng, centerLat, tileSize);
                const alt = await provider.getAlt(p.lng, p.lat);
                points.push(new THREE.Vector3(local.x, alt - playerAlt + 0.2, -local.y));
            }

            // Draw the road geometry
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            this.mesh.add(line);

            // Find the "Nearest Point" to the user (0,0,0)
            const nearestPoint = this.findNearestPointOnPath(new THREE.Vector3(0, 0, 0), points);

            // Create one single label for the whole road
            const label = this.createRoadLabel(name);
            label.position.copy(nearestPoint);
            this.mesh.add(label);
        }
    }

    private findNearestPointOnPath(target: THREE.Vector3, path: THREE.Vector3[]): THREE.Vector3 {
        let minData = { distSq: Infinity, point: path[0] };
        const line = new THREE.Line3();
        const closest = new THREE.Vector3();

        for (let i = 0; i < path.length - 1; i++) {
            line.set(path[i], path[i+1]);
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

    private lngLatToLocal(lng: number, lat: number, centerLng: number, centerLat: number, tileSize: number) {
        // Calculate the distance in meters from the center of our diorama
        const x = (lng - centerLng) * (tileSize / (360 / Math.pow(2, Osm.ZOOM)));

        // Latitude is non-linear, but at this zoom level (1 mile), linear approximation is fine
        const latScale = (Math.PI * 6378137) / 180;
        const y = (lat - centerLat) * latScale;

        return { x, y };
    }
}
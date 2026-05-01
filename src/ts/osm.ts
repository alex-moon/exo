import {Ground} from "./ground.ts";
import * as THREE from "three";
import {Config} from "./config.ts";
import {CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';

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

        const {x, y, z} = this.lngLatToTile(lng, lat);
        if (x === this.x && y === this.y && z === this.z) {
            return;
        }

        this.x = x;
        this.y = y;
        this.z = z;

        // Clear previous roads
        (this.mesh as THREE.Group).clear();

        const bbox = this.tileToBBox(x, y, z);
        this.fetchRoads(bbox).then(data => {
            this.renderRoads(data, lat, lng);
        }).catch(err => console.error("OSM Fetch Error:", err));
    }

    private async fetchRoads(bbox: string) {
        const query = `[out:json][timeout:25];(way["highway"](${bbox}););out body;>;out skel qt;`;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Overpass API error");
        return response.json();
    }
    private renderRoads(data: any, centerLat: number, centerLng: number) {
        const nodes = new Map();
        const roadGroups = new Map<string, THREE.Vector3[]>();
        const tileSize = this.width(centerLat);

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
                        const local = this.lngLatToLocal(node[0], node[1], centerLng, centerLat, tileSize);
                        roadGroups.get(name)!.push(new THREE.Vector3(local.x, 0.2, -local.y));
                    }
                });
            }
        });

        // 3. Draw and Label
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00, opacity: 0.5, transparent: true });

        roadGroups.forEach((points, name) => {
            // Draw the road geometry (simplified)
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            this.mesh.add(line);

            // Find the "Nearest Point" to the user (0,0,0)
            const nearestPoint = this.findNearestPointOnPath(new THREE.Vector3(0, 0, 0), points);

            // Create one single label for the whole road
            const label = this.createRoadLabel(name);
            label.position.copy(nearestPoint);
            this.mesh.add(label);
        });
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

    private tileToBBox(x: number, y: number, z: number) {
        const e = this.tile2lng(x + 1, z);
        const w = this.tile2lng(x, z);
        const s = this.tile2lat(y + 1, z);
        const n = this.tile2lat(y, z);
        return `${s},${w},${n},${e}`;
    }

    private tile2lng(x: number, z: number) {
        return (x / Math.pow(2, z) * 360 - 180);
    }

    private tile2lat(y: number, z: number) {
        const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
        return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
    }

    private lngLatToTile(lng: number, lat: number) {
        const n = Math.pow(2, Osm.ZOOM);
        const x = Math.floor(((lng + 180) / 360) * n);
        const latRad = (lat * Math.PI) / 180;
        const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
        return { x, y, z: Osm.ZOOM };
    }

    private width(lat: number): number {
        const equatorCircumference = 40075016.686;
        const latRad = lat * (Math.PI / 180);
        return (equatorCircumference * Math.cos(latRad)) / Math.pow(2, Osm.ZOOM);
    }
}
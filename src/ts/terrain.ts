import {Ground} from "./ground.ts";
import * as THREE from "three";
import {Config} from "./config.ts";

export class Terrain extends Ground {
    static readonly ZOOM = 15;
    static readonly SEGMENTS = 127;
    static readonly RESOLUTION = 256;

    private readonly geometry: THREE.BufferGeometry;
    private readonly material: THREE.Material;

    private x?: number;
    private y?: number;
    private z?: number;

    public constructor() {
        super();
        this.geometry = new THREE.PlaneGeometry(
            1,
            1,
            Terrain.SEGMENTS,
            Terrain.SEGMENTS
        );
        this.material = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            linewidth: 2,
        });
        this.mesh = new THREE.LineSegments(this.geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
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

        const width = this.width(lat);
        this.geometry.scale(width, width, 1);
        this.fetchTile(x, y, z).then(data => {
            const positions = this.geometry.attributes.position;

            let maxAlt = 0;
            const mins = {
                vx: 0,
                vy: 0,
                px: 0,
                py: 0,
                pi: 0,
            };
            const maxes = {
                vx: 0,
                vy: 0,
                px: 0,
                py: 0,
                pi: 0,
            }
            const vertices = Terrain.SEGMENTS + 1;
            const multiple = Math.floor(Terrain.RESOLUTION / vertices);
            for (let i = 0; i < positions.count; i++) {
                const vx = i % vertices;
                const vy = Math.floor(i / vertices);

                mins.vx = Math.min(mins.vx, vx);
                mins.vy = Math.min(mins.vy, vy);
                maxes.vx = Math.max(maxes.vx, vx);
                maxes.vy = Math.max(maxes.vy, vy);

                const px = Math.floor(vx * multiple);
                const py = Math.floor(vy * multiple);
                const pi = (py * Terrain.RESOLUTION + px) * 4;

                mins.px = Math.min(mins.px, px);
                mins.py = Math.min(mins.py, py);
                mins.pi = Math.min(mins.pi, pi);
                maxes.px = Math.max(maxes.px, px);
                maxes.py = Math.max(maxes.py, py);
                maxes.pi = Math.max(maxes.pi, pi);

                const r = data[pi];
                const g = data[pi + 1];
                const b = data[pi + 2];
                const alt = (r * 256 + g + b / 256) - 32768;
                positions.setZ(i, alt);
                maxAlt = Math.max(maxAlt, alt);
            }
            console.log(mins, maxes);
            for (let i = 0; i < positions.count; i++) {
                positions.setZ(i, positions.getZ(i) - maxAlt);
            }
            positions.needsUpdate = true;
            this.geometry.computeVertexNormals();
        }).catch(error => {
            console.error('Failed to fetch tile:', error);
        });
    }

    private fetchTile(x: number, y: number, z: number) {
        const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        return img.decode().then(() => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 256;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Failed to get 2D context for canvas');
            }
            ctx.drawImage(img, 0, 0);
            return ctx.getImageData(0, 0, 256, 256).data;
        });
    }

    private lngLatToTile(lng: number, lat: number) {
        const n = Math.pow(2, Terrain.ZOOM);
        const x = Math.floor(((lng + 180) / 360) * n);
        const latRad = (lat * Math.PI) / 180;
        const y = Math.floor(
            ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
        );
        return { x, y, z: Terrain.ZOOM };
    }

    private width(lat: number): number {
        const equatorCircumference = 40075016.686;
        const latRad = lat * (Math.PI / 180);
        return (equatorCircumference * Math.cos(latRad)) / Math.pow(2, Terrain.ZOOM);
    }
}

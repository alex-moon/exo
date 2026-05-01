import {Ground} from "./ground.ts";
import * as THREE from "three";
import {Config} from "./config.ts";

export class Terrain extends Ground {
    static readonly ZOOM = 15;
    static readonly SEGMENTS = 127;
    static readonly RESOLUTION = 256;

    private readonly geometry: THREE.BufferGeometry;
    private readonly material: THREE.PointsMaterial;

    private x?: number;
    private y?: number;

    public constructor() {
        super();
        this.geometry = new THREE.PlaneGeometry(1, 1, Terrain.SEGMENTS, Terrain.SEGMENTS);
        this.material = new THREE.PointsMaterial({
            color: 0x00ff00,
            size: 2,
            sizeAttenuation: false,
        });
        this.mesh = new THREE.Points(this.geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
    }

    public update(): void {
        const lng = Config.cartographic.getLng();
        const lat = Config.cartographic.getLat();

        const {x, y, z} = this.lngLatToTile(lng, lat);

        const tileSizeMeters = this.width(lat);

        const tileNW_Lng = this.tile2lng(x, z);
        const tileNW_Lat = this.tile2lat(y, z);
        const tileSE_Lng = this.tile2lng(x + 1, z);
        const tileSE_Lat = this.tile2lat(y + 1, z);

        const percentX = (lng - tileNW_Lng) / (tileSE_Lng - tileNW_Lng);
        const percentY = (this.lat2y(lat) - this.lat2y(tileNW_Lat)) / (this.lat2y(tileSE_Lat) - this.lat2y(tileNW_Lat));

        this.mesh.position.set(
            -(percentX - 0.5) * tileSizeMeters,
            0,
            (percentY - 0.5) * tileSizeMeters
        );

        if (x === this.x && y === this.y) return;

        this.x = x;
        this.y = y;

        this.mesh.scale.set(tileSizeMeters, tileSizeMeters, 1);

        this.fetchTile(x, y, z).then(data => {
            const positions = this.geometry.attributes.position;
            const vertices = Terrain.SEGMENTS + 1;
            const stride = Terrain.RESOLUTION / vertices;

                const px = Math.floor(percentX * (Terrain.RESOLUTION - 1));
            const py = Math.floor(percentY * (Terrain.RESOLUTION - 1));
            const pi = (py * Terrain.RESOLUTION + px) * 4;
            const playerAlt = (data[pi] * 256 + data[pi + 1] + data[pi + 2] / 256) - 32768;

            for (let i = 0; i < positions.count; i++) {
                const vx = i % vertices;
                const vy = Math.floor(i / vertices);

                const imgX = Math.floor(vx * stride);
                const imgY = Math.floor(vy * stride);
                const imgI = (imgY * Terrain.RESOLUTION + imgX) * 4;

                const r = data[imgI], g = data[imgI + 1], b = data[imgI + 2];
                const rawAlt = (r * 256 + g + b / 256) - 32768;

                        positions.setZ(i, rawAlt - playerAlt);
            }
            positions.needsUpdate = true;
        });
    }

    // Helper: Mercator projection Y coordinate
    private lat2y(lat: number) {
        return Math.log(Math.tan(lat * Math.PI / 360 + Math.PI / 4));
    }

    private tile2lng(x: number, z: number) {
        return x / Math.pow(2, z) * 360 - 180;
    }

    private tile2lat(y: number, z: number) {
        const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
        return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    }

    private fetchTile(x: number, y: number, z: number) {
        const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        return img.decode().then(() => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 256;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            return ctx.getImageData(0, 0, 256, 256).data;
        });
    }

    private lngLatToTile(lng: number, lat: number) {
        const n = Math.pow(2, Terrain.ZOOM);
        const x = Math.floor(((lng + 180) / 360) * n);
        const latRad = (lat * Math.PI) / 180;
        const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
        return { x, y, z: Terrain.ZOOM };
    }

    private width(lat: number): number {
        const equatorCircumference = 40075016.686;
        return (equatorCircumference * Math.cos(lat * Math.PI / 180)) / Math.pow(2, Terrain.ZOOM);
    }
}
import {Ground} from "./ground.ts";
import * as THREE from "three";
import {Config} from "./config.ts";
import {TerrainProvider} from "./provider/terrain.ts";
import {GeoUtils} from "./utils/geo.ts";

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
        const z = Terrain.ZOOM;

        const {x, y} = GeoUtils.lngLatToTile(lng, lat, z);

        const tileSizeMeters = GeoUtils.width(lat, z);

        const tileNW_Lng = GeoUtils.tile2lng(x, z);
        const tileNW_Lat = GeoUtils.tile2lat(y, z);
        const tileSE_Lng = GeoUtils.tile2lng(x + 1, z);
        const tileSE_Lat = GeoUtils.tile2lat(y + 1, z);

        const percentX = (lng - tileNW_Lng) / (tileSE_Lng - tileNW_Lng);
        const percentY = (GeoUtils.lat2y(lat) - GeoUtils.lat2y(tileNW_Lat)) / (GeoUtils.lat2y(tileSE_Lat) - GeoUtils.lat2y(tileNW_Lat));

        this.mesh.position.set(
            -(percentX - 0.5) * tileSizeMeters,
            0,
            (percentY - 0.5) * tileSizeMeters
        );

        if (x === this.x && y === this.y) return;

        this.x = x;
        this.y = y;

        this.mesh.scale.set(tileSizeMeters, tileSizeMeters, 1);

        const provider = TerrainProvider.getInstance();
        provider.getAlt(lng, lat).then(playerAlt => {
            const positions = this.geometry.attributes.position;
            const vertices = Terrain.SEGMENTS + 1;
            
            const promises: Promise<number>[] = [];
            for (let i = 0; i < positions.count; i++) {
                const vx = i % vertices;
                const vy = Math.floor(i / vertices);
                
                // Convert vertex local coordinates to lng/lat
                const vPercentX = vx / (vertices - 1);
                const vPercentY = vy / (vertices - 1);
                
                const vLng = tileNW_Lng + vPercentX * (tileSE_Lng - tileNW_Lng);
                const vLat = GeoUtils.y2lat(GeoUtils.lat2y(tileNW_Lat) + vPercentY * (GeoUtils.lat2y(tileSE_Lat) - GeoUtils.lat2y(tileNW_Lat)));
                
                promises.push(provider.getAlt(vLng, vLat));
            }

            Promise.all(promises).then(alts => {
                for (let i = 0; i < positions.count; i++) {
                    positions.setZ(i, alts[i] - playerAlt);
                }
                positions.needsUpdate = true;
            });
        });
    }
}
import {Ground} from "./ground.ts";
import * as THREE from "three";
import {Config} from "./config.ts";
import {TerrainProvider} from "./provider/terrain.ts";
import {GeoUtils} from "./utils/geo.ts";

export class Terrain extends Ground {
    static readonly ZOOM = 15;
    static readonly RINGS = 64;
    static readonly SPOKES = 64;

    private readonly geometry: THREE.BufferGeometry;
    private readonly material: THREE.LineBasicMaterial;

    private lastUpdate = 0;
    private isUpdating = false;

    public constructor() {
        super();
        
        const vertices = [];
        const indices = [];
        // Center point (index 0)
        vertices.push(0, 0, 0);

        const power = 2.0; // Power law for radius distribution

        for (let r = 1; r <= Terrain.RINGS; r++) {
            const radius = Math.pow(r / Terrain.RINGS, power);
            for (let s = 0; s < Terrain.SPOKES; s++) {
                const theta = (s / Terrain.SPOKES) * Math.PI * 2;
                const x = Math.cos(theta) * radius;
                const y = Math.sin(theta) * radius;
                vertices.push(x, y, 0);

                const currentIndex = 1 + (r - 1) * Terrain.SPOKES + s;

                // 1. Radial spokes
                if (r === 1) {
                    // Connect to center
                    indices.push(0, currentIndex);
                } else {
                    // Connect to previous ring
                    const prevIndex = 1 + (r - 2) * Terrain.SPOKES + s;
                    indices.push(prevIndex, currentIndex);
                }

                // 2. Concentric rings
                const nextSpokeIndex = 1 + (r - 1) * Terrain.SPOKES + ((s + 1) % Terrain.SPOKES);
                indices.push(currentIndex, nextSpokeIndex);
            }
        }

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.geometry.setIndex(indices);

        this.material = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            opacity: 0.5,
            transparent: true
        });
        this.mesh = new THREE.LineSegments(this.geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
    }

    public update(): void {
        const now = Date.now();
        if (this.isUpdating || now - this.lastUpdate < 500) return;

        const lng = Config.cartographic.getLng();
        const lat = Config.cartographic.getLat();
        const z = Terrain.ZOOM;

        const tileSizeMeters = GeoUtils.width(lat, z);
        const viewDistance = tileSizeMeters * 0.5; // Let's say we show half a tile radius

        // In polar layout, the mesh is always centered on the player
        this.mesh.position.set(0, 0, 0);
        this.mesh.scale.set(viewDistance, viewDistance, 1);

        this.isUpdating = true;
        this.lastUpdate = now;

        const provider = TerrainProvider.getInstance();
        provider.getAlt(lng, lat).then(async playerAlt => {
            try {
                const positions = this.geometry.attributes.position;
                
                const alts = new Float32Array(positions.count);
                
                // Helper to get lng/lat from local polar coords
                const getLngLat = (x: number, y: number) => {
                    const metersX = x * viewDistance;
                    const metersY = y * viewDistance;

                    // Approximations for small distances
                    const vLng = lng + (metersX / (GeoUtils.EQUATOR_CIRCUMFERENCE * Math.cos(lat * Math.PI / 180) / 360));
                    const vLat = lat + (metersY / (GeoUtils.EQUATOR_CIRCUMFERENCE / 360));
                    return { vLng, vLat };
                };

                const fetchPromises = [];
                for (let i = 0; i < positions.count; i++) {
                    const px = positions.getX(i);
                    const py = positions.getY(i);
                    
                    const { vLng, vLat } = getLngLat(px, py);
                    fetchPromises.push(provider.getAlt(vLng, vLat).then(alt => {
                        alts[i] = alt;
                    }));
                }
                await Promise.all(fetchPromises);

                for (let i = 0; i < positions.count; i++) {
                    positions.setZ(i, alts[i] - playerAlt);
                }
                positions.needsUpdate = true;
            } finally {
                this.isUpdating = false;
            }
        });
    }
}
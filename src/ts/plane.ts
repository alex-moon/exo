import * as THREE from 'three';
import {Ground} from "./ground.ts";
import {Config} from "./config.ts";

export class Plane extends Ground {
    protected geometry: THREE.CircleGeometry;
    protected material: THREE.MeshBasicMaterial;
    protected grid: THREE.GridHelper;

    public constructor() {
        super();
        this.geometry = new THREE.CircleGeometry(Config.RADIUS, 32);
        this.material = new THREE.MeshBasicMaterial({
            color: 0x222233,
            side: THREE.DoubleSide,
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;

        this.grid = new THREE.GridHelper(Config.RADIUS * 2, 128);
        this.grid.rotation.x = -Math.PI / 2;
        this.mesh.add(this.grid);
    }

    public update(): void {
        // don't need to do anything
    }
}

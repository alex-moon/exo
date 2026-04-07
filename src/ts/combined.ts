import * as THREE from 'three';
import {Ground} from "./ground.ts";

export class Combined extends Ground {
    public constructor(private readonly grounds: Ground[]) {
        super();
        this.mesh = new THREE.Mesh();
        this.grounds.forEach(g => this.mesh.add(g.mesh));
    }

    public update(): void {
        this.grounds.forEach(g => g.update());
    }
}

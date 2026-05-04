import * as THREE from 'three';

export abstract class Ground {
  public mesh!: THREE.Object3D;
  abstract update(): void;
}

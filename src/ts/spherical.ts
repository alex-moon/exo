import * as THREE from 'three';
// @ts-ignore
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

import {Sky} from "./sky.ts";
import type {Star} from "./data.ts";
import {Config} from "./config.ts";
import type {Ground} from "./ground.ts";
import {Plane} from "./plane.ts";

export class Spherical extends Sky {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private ground: Ground;
    private group: THREE.Group;

    constructor() {
        super();
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 2, -0.1); // facing toward positive Z = facing north

        const controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.rotateSpeed = -0.25;
        controls.target = new THREE.Vector3(0, 2, 0);
        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            const sensitivity = 0.05;
            this.camera.fov += event.deltaY * sensitivity;
            this.camera.fov = Math.max(1, Math.min(this.camera.fov, 120));
            this.camera.updateProjectionMatrix();
            controls.rotateSpeed = -0.25 * (this.camera.fov / 120);
        });
        this.camera.lookAt(0, 2, 0);

        this.ground = new Plane();
        this.scene = new THREE.Scene();
        this.scene.add(this.ground.mesh);

        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.animate();
    }

    animate() {
        const lst = Config.cartographic.getLst();
        const lat = Config.cartographic.getLat();
        const y = THREE.MathUtils.degToRad(-lst);
        const x = THREE.MathUtils.degToRad(90 - lat);
        this.group.rotation.set(x, y, 0);

        this.renderer.render(this.scene, this.camera);

        requestAnimationFrame(() => this.animate());
    }

    protected geometry(stars: Star[]) {
        const geometry = new THREE.BufferGeometry();
        const positions: number[] = [];
        const colors: number[] = [];
        const sizes: number[] = [];

        const radius = Config.RADIUS;

        stars.forEach(star => {
            const phi = (star.ra * 15) * (Math.PI / 180);
            const theta = star.dec * (Math.PI / 180);

            const x = radius * Math.cos(theta) * Math.cos(phi);
            const y = radius * Math.sin(theta);
            const z = radius * Math.cos(theta) * Math.sin(phi);

            positions.push(x, y, z);

            const color = new THREE.Color(this.ciToHex(star.ci));
            colors.push(color.r, color.g, color.b);

            sizes.push(Math.max(1, (7 - star.mag) * 2));
        });

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        return geometry;
    }

    public hyg(stars: Star[]): void {
        const geometry = this.geometry(stars);
        const vertexShader = `
          attribute float size;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size * ( 300.0 / -mvPosition.z ); // This adds perspective scaling
            gl_Position = projectionMatrix * mvPosition;
          }
        `;
        const fragmentShader = `
          varying vec3 vColor;
          void main() {
            float d = distance(gl_PointCoord, vec2(0.5, 0.5));
            if (d > 0.5) discard;
            gl_FragColor = vec4(vColor, 1.0 - (d * 2.0));
          }
        `;
        const material = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { value: new THREE.TextureLoader().load('/star-sprite.png') }
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            vertexColors: true
        });

        const points = new THREE.Points(geometry, material);
        this.group.add(points);
    }

    public ps(stars: Star[]): void {
        const geometry = this.geometry(stars);
        const vertexShader = `
          uniform float pointSize;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = pointSize; 
            gl_Position = projectionMatrix * mvPosition;
          }
        `;

        const fragmentShader = `
          uniform vec3 uiColor;
          void main() {
            float dist = distance(gl_PointCoord, vec2(0.5, 0.5));

            float thickness = 0.1;
            float outer = 0.5;
            float inner = 0.5 - thickness;

            float alpha = smoothstep(inner, inner + 0.01, dist) - smoothstep(outer, outer + 0.01, dist);
        
            if (alpha <= 0.0) discard;
        
            gl_FragColor = vec4(uiColor, alpha);
          }
        `;

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uiColor: { value: new THREE.Color(0x4a9eff) },
                pointSize: { value: 16.0 }
            },
            vertexShader,
            fragmentShader,
            transparent: true,
            vertexColors: false,
            depthTest: true,
        });
        const points = new THREE.Points(geometry, material);
        this.group.add(points);
    }
}

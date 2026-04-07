import type {Star} from "./data.ts";
import {Sky} from "./sky.ts";

export class Equirectangular extends Sky {
    protected readonly ctx: CanvasRenderingContext2D;

    constructor() {
        super();
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        if (!this.ctx) {
            throw new Error('Failed to get canvas context');
        }
        window.addEventListener('resize', this.resize.bind(this));
        this.resize();
    }

    protected resize() {
        this.ctx.canvas.width = window.innerWidth;
        this.ctx.canvas.height = window.innerHeight;
        const { width, height } = this.ctx.canvas;
        this.ctx.clearRect(0, 0, width, height);
    };

    protected project(ra: number, dec: number) {
        const { width, height } = this.ctx.canvas;
        const x = width - (ra / 24) * width;
        const y = ((90 - dec) / 180) * height;
        return { x, y };
    }

    public hyg(stars: Star[]) {
        stars.forEach(star => {
            const pos = this.project(star.ra, star.dec);
            if (!pos) {
                return;
            }

            const size = Math.max(0.5, (7 - star.mag) * 0.5);
            this.ctx.beginPath();
            this.ctx.fillStyle = this.ciToHex(star.ci);
            this.ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            this.ctx.fill();
            if (star.mag < 1.0) {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '11px sans-serif';
                this.ctx.fillText(star.name, pos.x + 5, pos.y);
            }
        });
    }

    public ps(stars: Star[]) {
        stars.forEach(star => {
            if (!star.p) {
                return;
            }

            const pos = this.project(star.ra, star.dec);
            if (!pos) {
                return;
            }

            this.ctx.beginPath();
            this.ctx.strokeStyle = this.BLUE;
            this.ctx.lineWidth = 1.5;

            this.ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
            this.ctx.stroke();

            if (star.p.length > 1) {
                this.ctx.fillStyle = this.BLUE;
                this.ctx.font = '11px monospace';
                this.ctx.fillText(`${star.name} (${star.p.length})`, pos.x + 10, pos.y + 3);
            }
        });
    }
}

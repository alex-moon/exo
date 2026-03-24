import type {Star} from "./data.ts";

export class Sky {
    private readonly ctx: CanvasRenderingContext2D;

    constructor() {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        if (!this.ctx) {
            throw new Error('Failed to get canvas context');
        }
        window.addEventListener('resize', this.resize.bind(this));
        this.resize();
    }

    private resize() {
        this.ctx.canvas.width = window.innerWidth;
        this.ctx.canvas.height = window.innerHeight;
        const { width, height } = this.ctx.canvas;
        this.ctx.clearRect(0, 0, width, height);
    };

    private project(ra: number, dec: number) {
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
        const blue = '#4a9eff';
        stars.forEach(star => {
            if (!star.p) {
                return;
            }

            const pos = this.project(star.ra, star.dec);
            if (!pos) {
                return;
            }

            this.ctx.beginPath();
            this.ctx.strokeStyle = blue;
            this.ctx.lineWidth = 1.5;

            this.ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
            this.ctx.stroke();

            if (star.p.length > 1) {
                this.ctx.fillStyle = blue;
                this.ctx.font = '11px monospace';
                this.ctx.fillText(`${star.name} (${star.p.length})`, pos.x + 10, pos.y + 3);
            }
        });
    }

    private ciToHex(ci: number) {
        if (ci < -0.4) return "#9bb2ff"
        if (ci < 0.0) return "#bbccff"
        if (ci < 0.4) return "#f8f7ff"
        if (ci < 0.8) return "#fff4ea"
        if (ci < 1.2) return "#ffd2a1"
        if (ci < 1.6) return "#ffcc6f"
        return "#ffad44"
    }
}

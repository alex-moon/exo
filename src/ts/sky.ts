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
    };

    public hyg(stars: Star[]) {
        const { width, height } = this.ctx.canvas;
        this.ctx.clearRect(0, 0, width, height);

        stars.forEach(star => {
            const x = width - (star.ra / 24) * width;
            const y = ((90 - star.dec) / 180) * height;
            const size = Math.max(0.5, (7 - star.mag) * 0.5);
            this.ctx.beginPath();
            this.ctx.fillStyle = this.ciToHex(star.ci);
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
            if (star.mag < 1.0) {
                this.ctx.fillStyle = 'white';
                this.ctx.font = '10px Inter, sans-serif';
                this.ctx.fillText(star.name, x + 5, y);
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

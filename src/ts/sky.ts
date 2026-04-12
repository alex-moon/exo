import type {Star} from "./data.ts";
import type {Ground} from "./ground.ts";

export abstract class Sky {
    protected readonly BLUE = '#4a9eff';

    abstract hyg(stars: Star[]): void;

    abstract ps(stars: Star[]): void;

    abstract setGround(ground: Ground): void;

    protected ciToHex(ci: number) {
        if (ci < -0.4) return "#9bb2ff"
        if (ci < 0.0) return "#bbccff"
        if (ci < 0.4) return "#f8f7ff"
        if (ci < 0.8) return "#fff4ea"
        if (ci < 1.2) return "#ffd2a1"
        if (ci < 1.6) return "#ffcc6f"
        return "#ffad44"
    }
}

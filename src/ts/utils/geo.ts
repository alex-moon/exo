
export class GeoUtils {
    static readonly EQUATOR_CIRCUMFERENCE = 40075016.686;

    static tile2lng(x: number, z: number): number {
        return x / Math.pow(2, z) * 360 - 180;
    }

    static tile2lat(y: number, z: number): number {
        const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
        return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    }

    static lngLatToTile(lng: number, lat: number, z: number): { x: number, y: number, z: number } {
        const n = Math.pow(2, z);
        const x = Math.floor(((lng + 180) / 360) * n);
        const latRad = (lat * Math.PI) / 180;
        const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
        return { x, y, z };
    }

    static lat2y(lat: number): number {
        return Math.log(Math.tan(lat * Math.PI / 360 + Math.PI / 4));
    }

    static y2lat(y: number): number {
        return 360 / Math.PI * Math.atan(Math.exp(y)) - 90;
    }

    static width(lat: number, z: number): number {
        const latRad = lat * (Math.PI / 180);
        return (this.EQUATOR_CIRCUMFERENCE * Math.cos(latRad)) / Math.pow(2, z);
    }

    static tileToBBox(x: number, y: number, z: number): string {
        const e = this.tile2lng(x + 1, z);
        const w = this.tile2lng(x, z);
        const s = this.tile2lat(y + 1, z);
        const n = this.tile2lat(y, z);
        return `${s},${w},${n},${e}`;
    }
}

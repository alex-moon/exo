export interface Star {
    name: string;
    mag: number;
    ra: number;
    dec: number;
    ci: number;
    dist: number;
    con: string;
}

export class Data {
    async hyg() {
        const response = await fetch('/hyg.json');
        return await response.json();
    }
}

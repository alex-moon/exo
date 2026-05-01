import type {Star} from "./data.ts";

export class HostStarUi {
    private div: HTMLDivElement;

    constructor(private star: Star) {
        this.div = document.createElement('div');
        this.div.className = 'host-star';
        this.div.innerHTML = `
            <span class="star-name">${this.star.name}</span>
            <ul class="planets">
                ${(this.star.p || []).map(p => `<li>${p.name}</li>`).join('')}
            </ul>
        `;
    }
    public getDiv() {
        return this.div;
    }
}

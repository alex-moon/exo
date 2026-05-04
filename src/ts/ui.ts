import type { Star } from './data.ts';

export class HostStarUi {
  private div: HTMLDivElement;

  constructor(private star: Star) {
    this.div = document.createElement('div');
    const hasWiki = this.star.wiki || (this.star.p || []).some((p) => p.wiki);
    this.div.className = 'host-star' + (hasWiki ? ' has-wiki' : '');
    this.div.innerHTML = `
            <span class="star-name">${this.star.name}</span>
            <ul class="planets">
                ${(this.star.p || []).map((p) => `<li>${p.name}</li>`).join('')}
            </ul>
        `;

    if (hasWiki) {
      this.div.addEventListener('click', () => this.showWiki());
    }
  }

  private async showWiki(wikiUrl?: string, isPlanet: boolean = false) {
    const panel = document.getElementById('wiki-panel');
    if (!panel) return;

    panel.classList.remove('hidden');
    const content = panel.querySelector('.content');
    if (!content) return;

    content.innerHTML = '<div class="loading">loading...</div>';

    const url = wikiUrl || this.star.wiki;
    if (!url) {
      content.innerHTML = '<button class="close-btn">&times;</button>';
      this.renderPlanetList(content as HTMLElement);
      content.querySelector('.close-btn')?.addEventListener('click', () => {
        panel.classList.add('hidden');
      });
      return;
    }

    // Extract page title from URL
    const title = url.split('/').pop();
    if (!title) return;

    try {
      // Wikipedia Summary API
      const response = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`
      );
      const data = await response.json();

      content.innerHTML = `
                <button class="close-btn">&times;</button>
                ${isPlanet ? '<button class="back-btn">&larr; back</button>' : ''}
                <h2>${data.title}</h2>
                ${data.thumbnail ? `<img src="${data.thumbnail.source}" alt="${data.title}">` : ''}
                <p>${data.extract}</p>
                <a href="${url}" target="_blank" class="read-more">read more</a>
                ${!isPlanet ? '<div class="planet-list-container"></div>' : ''}
            `;

      if (!isPlanet) {
        const planetListContainer = content.querySelector(
          '.planet-list-container'
        ) as HTMLElement;
        this.renderPlanetList(planetListContainer);
      }

      content.querySelector('.close-btn')?.addEventListener('click', () => {
        panel.classList.add('hidden');
      });

      content.querySelector('.back-btn')?.addEventListener('click', () => {
        this.showWiki();
      });
    } catch (e) {
      console.error('Error fetching Wikipedia content:', e);
      content.innerHTML = `
          <button class="close-btn">&times;</button>
          ${isPlanet ? '<button class="back-btn">&larr; back</button>' : ''}
          <p>Error loading Wikipedia content.</p>
          <a href="${url}" target="_blank" class="read-more">read more on Wikipedia</a>
          ${!isPlanet ? '<div class="planet-list-container"></div>' : ''}
      `;

      if (!isPlanet) {
        const planetListContainer = content.querySelector(
          '.planet-list-container'
        ) as HTMLElement;
        this.renderPlanetList(planetListContainer);
      }

      content.querySelector('.close-btn')?.addEventListener('click', () => {
        panel.classList.add('hidden');
      });

      content.querySelector('.back-btn')?.addEventListener('click', () => {
        this.showWiki();
      });
    }
  }

  private renderPlanetList(container: HTMLElement) {
    const planetsWithWiki = (this.star.p || []).filter((p) => p.wiki);
    if (planetsWithWiki.length === 0) return;

    const listTitle = document.createElement('h3');
    listTitle.textContent = 'Planets';
    container.appendChild(listTitle);

    const ul = document.createElement('ul');
    ul.className = 'wiki-planet-list';
    planetsWithWiki.forEach((p) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = p.name;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.showWiki(p.wiki, true);
      });
      li.appendChild(a);
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }
  public getDiv() {
    return this.div;
  }
}

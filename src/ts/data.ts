export interface Planet {
  name: string;
  meth: string;
  year: number;
  fac: string;
  orbper: number;
  rade: number;
  masse: number;
  massj: number;
  dens: number;
  wiki?: string;
}

export interface Star {
  name: string;
  mag: number;
  ra: number;
  dec: number;
  ci: number;
  dist: number;
  con?: string;
  p?: Planet[];
  wiki?: string;
}

export class Data {
  async hyg() {
    const response = await fetch('/data/hyg.json');
    return await response.json();
  }

  async ps() {
    const response = await fetch('/data/ps.json');
    return await response.json();
  }
}

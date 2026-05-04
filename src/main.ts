import './style.scss';

import { Data } from './ts/data.ts';
import { Sky } from './ts/sky.ts';
import { Combined } from './ts/combined.ts';
// import {Plane} from "./ts/plane.ts";
import { Terrain } from './ts/terrain.ts';
import { Osm } from './ts/osm.ts';
import { UiControls } from './ts/ui_controls.ts';

const data = new Data();
const hyg = await data.hyg();
const ps = await data.ps();

const sky = new Sky();
new UiControls();
const ground = new Combined([
  // new Plane(),
  new Terrain(),
  new Osm(),
]);
sky.setGround(ground);
sky.hyg(hyg);
sky.ps(ps);

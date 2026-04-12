import './style.scss';

import {Data} from './ts/data.ts';
import {Spherical} from "./ts/spherical.ts";
import {Combined} from "./ts/combined.ts";
// import {Plane} from "./ts/plane.ts";
import {Terrain} from "./ts/terrain.ts";

const data = new Data();
const hyg = await data.hyg()
const ps = await data.ps()

const sky = new Spherical();
const ground = new Combined([
    // new Plane(),
    new Terrain(),
]);
sky.setGround(ground);
sky.hyg(hyg);
sky.ps(ps);

import './style.scss';

import {Data} from './ts/data.ts';
import {Spherical} from "./ts/spherical.ts";

const data = new Data();
const sky = new Spherical();
const hyg = await data.hyg()
const ps = await data.ps()
sky.hyg(hyg);
sky.ps(ps);

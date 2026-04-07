import './style.scss';

import {Data} from './ts/data.ts';
import {Sky} from './ts/sky.ts';

const data = new Data();
const sky = new Sky();
const hyg = await data.hyg()
const ps = await data.ps()
sky.hyg(hyg);
sky.ps(ps);

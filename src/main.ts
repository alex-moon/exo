import './style.scss';

import {Data} from './ts/data.ts';
import {Sky} from './ts/sky.ts';

const data = new Data();
const sky = new Sky();
const stars = await data.hyg()
sky.hyg(stars);

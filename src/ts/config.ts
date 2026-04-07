import {Cartographic} from "./cartographic.ts";

export class Config {
    static readonly RADIUS = 500;
    // static readonly DEFAULT_LNG = -1.427844;
    // static readonly DEFAULT_LAT = 54.946468;
    static readonly DEFAULT_LNG = -1.60805;
    static readonly DEFAULT_LAT = 55.0119625;
    static cartographic = new Cartographic(Config.DEFAULT_LNG, Config.DEFAULT_LAT);
}
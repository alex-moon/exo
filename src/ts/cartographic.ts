export class Cartographic {
    private time: number;

    public constructor(
        private lng: number,
        private lat: number,
        date: Date = new Date(),
    ) {
        this.time = date.getTime();

        window.setInterval(() => {
            this.time += 1000;
        }, 1000 / 60);
    }

    public getLat() {
        return this.lat;
    }
    public getLst() {
        // 1. Get Julian Date
        // Simple approximation for the J2000 epoch
        const jd = (this.time / 86400000) + 2440587.5;
        const d = jd - 2451545.0; // Days since J2000.0

        // 2. Calculate GMST (Greenwich Mean Sidereal Time) in Hours
        // This formula is the standard IAU approximation
        let gmst = 18.697374558 + 24.06570982441908 * d;
        gmst = gmst % 24;
        if (gmst < 0) gmst += 24;

        // 3. Convert GMST to Degrees and add Longitude
        const lSTDegrees = (gmst * 15) + this.lng;
        return lSTDegrees % 360;
    }
}

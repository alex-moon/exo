import { Config } from './config.ts';

export class UiControls {
  private latInput: HTMLInputElement;
  private lngInput: HTMLInputElement;
  private dateInput: HTMLInputElement;
  private timeInput: HTMLInputElement;

  constructor() {
    this.latInput = document.getElementById('lat') as HTMLInputElement;
    this.lngInput = document.getElementById('lng') as HTMLInputElement;
    this.dateInput = document.getElementById('date') as HTMLInputElement;
    this.timeInput = document.getElementById('time') as HTMLInputElement;

    this.initValues();
    this.setupEventListeners();
    this.tryGeolocation();
  }

  private initValues() {
    this.latInput.value = Config.cartographic.getLat().toFixed(4);
    this.lngInput.value = Config.cartographic.getLng().toFixed(4);

    const now = new Date();
    this.dateInput.value = now.toISOString().split('T')[0];
    this.timeInput.value = now.toTimeString().split(' ')[0].substring(0, 5);

    this.updateCartographic();
  }

  private setupEventListeners() {
    const inputs = [
      this.latInput,
      this.lngInput,
      this.dateInput,
      this.timeInput,
    ];
    inputs.forEach((input) => {
      input.addEventListener('input', () => this.updateCartographic());
    });
  }

  private updateCartographic() {
    const lat = parseFloat(this.latInput.value);
    const lng = parseFloat(this.lngInput.value);
    const dateStr = this.dateInput.value;
    const timeStr = this.timeInput.value;

    if (!isNaN(lat)) Config.cartographic.setLat(lat);
    if (!isNaN(lng)) Config.cartographic.setLng(lng);

    if (dateStr && timeStr) {
      const date = new Date(`${dateStr}T${timeStr}`);
      if (!isNaN(date.getTime())) {
        Config.cartographic.setTime(date.getTime());
      }
    }
  }

  private tryGeolocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.latInput.value = position.coords.latitude.toFixed(4);
          this.lngInput.value = position.coords.longitude.toFixed(4);
          this.updateCartographic();
        },
        (error) => {
          console.warn('Geolocation failed:', error.message);
        }
      );
    }
  }
}

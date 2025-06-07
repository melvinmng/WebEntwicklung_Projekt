import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import * as L from 'leaflet';
import countriesData from './data/countries.geo.json';
import { FeatureCollection } from 'geojson';
import { HttpClient } from '@angular/common/http';

const countries: FeatureCollection = countriesData as FeatureCollection;

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [CommonModule],
})
export class AppComponent implements AfterViewInit {
  private map!: L.Map;
  private countries = countries;

  public selectedLocations: { city: string; country: string; lat: number; lon: number }[] = [];
  public recommendations: string = '';
  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map').setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // GeoJSON Länder anzeigen
    L.geoJSON(this.countries, {
      style: {
        color: 'blue',
        weight: 1,
        fillOpacity: 0.1,
      },
      onEachFeature: (feature: any, layer: L.Layer) => {
        const countryName = feature.properties.name;
        const wikiUrl = `https://de.wikipedia.org/wiki/${encodeURIComponent(countryName)}`;

        layer.on('click', () => {
          layer.bindPopup(`<a href="${wikiUrl}" target="_blank">Wikipedia zu ${countryName}</a>`).openPopup();
        });

        layer.bindTooltip(countryName);
      }
    }).addTo(this.map);

    // Klick auf Karte → Marker + Geolocation
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      this.addMarker(lat, lon);
      this.getLocationDetails(lat, lon);
    });
  }

  private addMarker(lat: number, lon: number): void {
    L.marker([lat, lon]).addTo(this.map);
  }

  private getLocationDetails(lat: number, lon: number): void {
    const url = `http://localhost:5001/api/reverse-geocode?lat=${lat}&lon=${lon}`;
  
    this.http.get<any>(url).subscribe(data => {
      const city = data.city || 'Unbekannt';
      const country = data.country || 'Unbekannt';
  
      this.selectedLocations.push({ city, country, lat, lon });
      console.log('→ Ort hinzugefügt (via Flask):', city, country);
    });
  }
  generateRecommendations(): void {
    if (this.selectedLocations.length === 0) return;

    const locationsParam = this.selectedLocations
      .map(loc => `${loc.city}, ${loc.country}`)
      .join(',');

    const url = `http://localhost:5001/api/recommendations?locations=${encodeURIComponent(locationsParam)}`;

    this.http.get<any>(url).subscribe(data => {
      this.recommendations = data.recommendations || 'Keine Empfehlungen erhalten.';
      console.log('→ Empfehlungen erhalten:', this.recommendations);
    });
  }
}
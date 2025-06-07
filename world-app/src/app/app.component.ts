import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import * as L from 'leaflet';
import countriesData from './data/countries.geo.json';
import { FeatureCollection } from 'geojson';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';

const countries: FeatureCollection = countriesData as FeatureCollection;

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [CommonModule, HttpClientModule],
})
export class AppComponent implements AfterViewInit {
  private map!: L.Map;
  private countries = countries;
  public selectedLocations: { city: string; country: string; lat: number; lon: number }[] = [];
  public recommendations: string = '';

  private activeMarkers: { marker: L.Marker, type: 'user' | 'safe' | 'experimental' | 'hidden' }[] = [];
  private recommendationMarkers: L.Marker[] = [];
  private removedMarkersStack: { lat: number, lon: number, type: 'user' | 'safe' | 'experimental' | 'hidden', data: any }[] = [];
  public isLoading: boolean = false;
  private initialView = { lat: 20, lon: 0, zoom: 2 };

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    this.initMap();

    const mapContainer = document.querySelector('.leaflet-top.leaflet-left');
    if (mapContainer) {
      const controlGroup = document.createElement('div');
      controlGroup.className = 'leaflet-bar leaflet-control leaflet-custom-group';

      const undoBtn = document.createElement('a');
      undoBtn.href = '#';
      undoBtn.title = 'Letzten Marker wiederherstellen';
      undoBtn.className = 'leaflet-custom-button';
      undoBtn.innerHTML = '⮌';
      undoBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.restoreLastMarker();
      };

      const homeBtn = document.createElement('a');
      homeBtn.href = '#';
      homeBtn.title = 'Zur Karten-Startansicht';
      homeBtn.className = 'leaflet-custom-button';
      homeBtn.innerHTML = '🏠';
      homeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.goHome();
      };

      controlGroup.appendChild(undoBtn);
      controlGroup.appendChild(homeBtn);
      mapContainer.appendChild(controlGroup);
    }
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      maxBounds: [
        [-85, -180],  // Südwest-Ecke (fast Antarktis)
        [85, 180]     // Nordost-Ecke (fast Nordpol)
      ],
      maxBoundsViscosity: 1.0
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    L.geoJSON(this.countries, {
      style: {
        color: 'blue',
        weight: 1,
        fillOpacity: 0.1,
      }
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const target = e.originalEvent.target as HTMLElement;
      if (target.closest('.leaflet-custom-button')) return;

      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      this.addUserMarker(lat, lon);
      this.getLocationDetails(lat, lon);
    });
  }

  private getMarkerIconByType(type: 'user' | 'safe' | 'experimental' | 'hidden') {
    const urlMap = {
      user: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      safe: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
      experimental: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
      hidden: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    };

    return L.icon({
      iconUrl: urlMap[type],
      iconSize: [30, 50],
      iconAnchor: [15, 50],
      popupAnchor: [0, -50],
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      shadowSize: [40, 50],
    });
  }

  private addUserMarker(lat: number, lon: number): void {
    const marker = L.marker([lat, lon], {
      icon: this.getMarkerIconByType('user'),
      interactive: true
    }).addTo(this.map);

    marker.on('click', () => {
      this.map.removeLayer(marker);
      this.removedMarkersStack.push({ lat, lon, type: 'user', data: null });
      this.activeMarkers = this.activeMarkers.filter(m => m.marker !== marker);
    });

    this.activeMarkers.push({ marker, type: 'user' });
  }

  private addRecommendationMarker(lat: number, lon: number, city: string, country: string, type: 'safe' | 'experimental' | 'hidden'): void {
    const marker = L.marker([lat, lon], {
      icon: this.getMarkerIconByType(type),
      interactive: true
    }).addTo(this.map).bindPopup(`${type}: ${city}, ${country}`);

    marker.on('click', () => {
      this.map.removeLayer(marker);
      this.removedMarkersStack.push({ lat, lon, type, data: { city, country } });
      this.activeMarkers = this.activeMarkers.filter(m => m.marker !== marker);
    });

    this.activeMarkers.push({ marker, type });
  }

  private getLocationDetails(lat: number, lon: number): void {
    const url = `http://localhost:5001/api/reverse-geocode?lat=${lat}&lon=${lon}`;
    this.http.get<any>(url).subscribe(data => {
      const city = data.city || 'Unbekannt';
      const country = data.country || 'Unbekannt';

      const existing = this.selectedLocations.find(loc => loc.lat === lat && loc.lon === lon);
      if (existing) {
        this.selectedLocations = this.selectedLocations.filter(loc => loc !== existing);
      } else {
        this.selectedLocations.push({ city, country, lat, lon });
      }
    });
  }

  generateRecommendations(): void {
    if (this.selectedLocations.length === 0) return;
  
    this.isLoading = true;
    this.recommendations = '';
  
    const locationsParam = this.selectedLocations.map(loc => `${loc.city}, ${loc.country}`).join(',');
    const url = `http://localhost:5001/api/recommendations?locations=${encodeURIComponent(locationsParam)}`;
  
    this.http.get<any>(url).subscribe(response => {
      const recommendations = response.recommendations;
  
      if (!recommendations || recommendations.length === 0) {
        this.recommendations = 'Keine Empfehlungen erhalten.';
        this.isLoading = false;
        return;
      }
  
      this.recommendations = recommendations.map((r: any) =>
        `${r.type}: ${r.city}, ${r.country}`
      ).join('\n');
  
      // alte Empfehlungsmarker entfernen
      this.activeMarkers = this.activeMarkers.filter(m => {
        if (['safe', 'experimental', 'hidden'].includes(m.type)) {
          this.map.removeLayer(m.marker);
          return false;
        }
        return true;
      });
  
      for (const rec of recommendations) {
        if (rec.lat && rec.lon) {
          const type =
            rec.type.toLowerCase().includes('safe') ? 'safe' :
            rec.type.toLowerCase().includes('experiment') ? 'experimental' : 'hidden';
  
          this.addRecommendationMarker(rec.lat, rec.lon, rec.city, rec.country, type);
        }
      }
  
      this.isLoading = false;
    }, error => {
      console.error('Fehler beim Abrufen:', error);
      this.recommendations = 'Fehler beim Abrufen der Empfehlungen.';
      this.isLoading = false;
    });
  }

  restoreLastMarker(): void {
    const last = this.removedMarkersStack.pop();
    if (!last) return;

    const { lat, lon, type, data } = last;

    if (type === 'user') {
      this.addUserMarker(lat, lon);
    } else {
      this.addRecommendationMarker(lat, lon, data?.city || 'Unbekannt', data?.country || 'Unbekannt', type);
    }
  }

  goHome(): void {
    this.map.setView([this.initialView.lat, this.initialView.lon], this.initialView.zoom);
  }

  clearLocations(): void {
    this.selectedLocations = [];
    this.activeMarkers.forEach(m => this.map.removeLayer(m.marker));
    this.activeMarkers = [];
    this.removedMarkersStack = [];
    this.recommendations = '';
  }

  flyToLocation(event: any): void {
    const index = event.target.value;
    const loc = this.selectedLocations[index];
    if (loc) this.map.setView([loc.lat, loc.lon], 10);
  }

  navbarVisible = true;
  private navbarFadeTimeout: any = null;

  showNavbar(): void {
    this.navbarVisible = true;
    clearTimeout(this.navbarFadeTimeout);
  }

  startNavbarFadeTimer(): void {
    clearTimeout(this.navbarFadeTimeout);
    this.navbarFadeTimeout = setTimeout(() => {
      this.navbarVisible = false;
    }, 3000);
  }

  legendVisible = false;

  toggleLegend(): void {
    this.legendVisible = !this.legendVisible;
  }
}
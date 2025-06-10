import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import countriesData from '../../data/countries.geo.json';
import { FeatureCollection } from 'geojson';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { NavbarComponent } from '../navbar/navbar.component';

const countries: FeatureCollection = countriesData as FeatureCollection;
type MarkerType = 'user' | 'safe' | 'experimental' | 'hidden' | 'wishlist';

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  imports: [CommonModule, HttpClientModule, FormsModule, NavbarComponent]
})
export class MapComponent implements AfterViewInit, OnInit {
  private map!: L.Map;
  private countries = countries;
  public selectedLocations: { city: string; country: string; lat: number; lon: number }[] = [];
  public recommendations: string = '';

  private allMarkers: { marker: L.Marker, type: MarkerType }[] = [];
  private removedMarkersStack: { lat: number, lon: number, type: MarkerType, data: any }[] = [];
  public isLoading: boolean = false;
  private initialView = { lat: 20, lon: 0, zoom: 2 };

  public markerVisibility: Record<MarkerType, boolean> = {
    user: true,
    safe: true,
    experimental: true,
    hidden: true,
    wishlist: true
  };

  // AI-Toolbar Bindings
  searchQuery = '';
  dropdownOpen = false;
  recommendationsList: {
    city: string;
    country: string;
    lat: number;
    lon: number;
    type: string;
  }[] = [];
  legendVisible = false;

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    this.initMap();
    const mapContainer = document.querySelector('.leaflet-bottom.leaflet-left');
    if (mapContainer) {
      const controlGroup = document.createElement('div');
      controlGroup.className = 'leaflet-bar leaflet-control leaflet-custom-group';

      const undoBtn = document.createElement('a');
      undoBtn.href = '#';
      undoBtn.title = 'Letzten Marker wiederherstellen';
      undoBtn.className = 'leaflet-custom-button';
      undoBtn.innerHTML = '↩️';
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

      const resetBtn = document.createElement('a');
      resetBtn.href = '#';
      resetBtn.title = 'Alle Orte zurücksetzen';
      resetBtn.className = 'leaflet-custom-button';
      resetBtn.innerHTML = '🗑️';
      resetBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.clearLocations();
      };

      controlGroup.appendChild(resetBtn);
      controlGroup.appendChild(undoBtn);
      controlGroup.appendChild(homeBtn);
      mapContainer.appendChild(controlGroup);
    }
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [35, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 1.0,
	  zoomControl: false // Standard-Zoom-Control deaktivieren!
    });

	L.control.zoom({ position: 'bottomleft' }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    // Zoom-Control nach unten rechts
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.geoJSON(this.countries, {
      style: { color: 'blue', weight: 1, fillOpacity: 0.1 }
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const target = e.originalEvent.target as HTMLElement;
      if (target.closest('.leaflet-custom-button')) return;
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      this.addMarker(lat, lon, 'user');
      this.getLocationDetails(lat, lon);
    });

    this.map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      this.getWishlistLocationDetails(lat, lon);
    });
  }

  private getLocationDetails(lat: number, lon: number): void {
    const url = `http://localhost:5001/api/reverse-geocode?lat=${lat}&lon=${lon}`;
    this.http.get<any>(url).subscribe(data => {
      const city = data.city || 'Unbekannt';
      const country = data.country || 'Unbekannt';
      const exists = this.selectedLocations.some(loc => loc.lat === lat && loc.lon === lon);
      if (!exists) this.selectedLocations.push({ city, country, lat, lon });
    });
  }

  private getWishlistLocationDetails(lat: number, lon: number): void {
    const url = `http://localhost:5001/api/reverse-geocode?lat=${lat}&lon=${lon}`;
    this.http.get<any>(url).subscribe(data => {
      const city = data.city || 'Unbekannt';
      const country = data.country || 'Unbekannt';
      this.addMarker(lat, lon, 'wishlist', city, country);
    });
  }

  private getIcon(type: MarkerType): L.Icon {
    const colors: Record<MarkerType, string> = {
      user: 'red',
      safe: 'yellow',
      experimental: 'blue',
      hidden: 'green',
      wishlist: 'violet'
    };

    return L.icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${colors[type]}.png`,
      iconSize: [30, 50],
      iconAnchor: [15, 50],
      popupAnchor: [0, -50],
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      shadowSize: [40, 50]
    });
  }

  private addMarker(lat: number, lon: number, type: MarkerType, city = '', country = ''): void {
    const marker = L.marker([lat, lon], {
      icon: this.getIcon(type),
      interactive: true
    }).addTo(this.map);

    if (city && country) marker.bindPopup(`${type}: ${city}, ${country}`);

    marker.on('click', () => {
      this.map.removeLayer(marker);
      this.removedMarkersStack.push({ lat, lon, type, data: { city, country } });
      this.allMarkers = this.allMarkers.filter(m => m.marker !== marker);

      if (type === 'user' || type === 'wishlist') {
        this.selectedLocations = this.selectedLocations.filter(loc => loc.lat !== lat || loc.lon !== lon);
      }
    });

    this.allMarkers.push({ marker, type });
  }

  // --- AI-Toolbar Event-Handler ---
  onGenerateRecommendations(): void {
    if (this.selectedLocations.length === 0) return;
    this.isLoading = true;
    this.recommendationsList = [];
    this.dropdownOpen = false;

    const locationsParam = this.selectedLocations.map(loc => `${loc.city}, ${loc.country}`).join(',');
    const url = `http://localhost:5001/api/recommendations?locations=${encodeURIComponent(locationsParam)}`;

    this.http.get<any>(url).subscribe(response => {
      const recs = response.recommendations;
      if (!recs?.length) {
        this.isLoading = false;
        return;
      }

      this.allMarkers = this.allMarkers.filter(m => {
        if (['safe', 'experimental', 'hidden'].includes(m.type)) {
          this.map.removeLayer(m.marker);
          return false;
        }
        return true;
      });

      for (const rec of recs) {
        if (rec.lat && rec.lon) {
          const type = rec.type.includes('safe') ? 'safe' : rec.type.includes('experiment') ? 'experimental' : 'hidden';
          this.addMarker(rec.lat, rec.lon, type, rec.city, rec.country);
        }
      }

      this.recommendationsList = recs;
      this.dropdownOpen = true;
      this.isLoading = false;
    });
  }

  onToggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  onFlyToRecommendation(rec: any): void {
    this.map.setView([rec.lat, rec.lon], 10);
    this.dropdownOpen = false;
  }

  onFlyToLocation(index: number): void {
    const loc = this.selectedLocations[index];
    if (loc) this.map.setView([loc.lat, loc.lon], 10);
  }

  onSearchQueryChange(query: string): void {
    this.searchQuery = query;
  }

  onSearchAndAddMarker(): void {
    if (!this.searchQuery) return;
    const url = `http://localhost:5001/api/search?query=${encodeURIComponent(this.searchQuery)}`;
    this.http.get<any[]>(url).subscribe(results => {
      if (!results.length) {
        alert("Ort nicht gefunden.");
        return;
      }
      const { lat, lon } = results[0];
      this.addMarker(lat, lon, 'user');
      this.getLocationDetails(lat, lon);
      this.map.setView([lat, lon], 10);
    });
  }

  // --- Legende ---
  toggleLegend(): void {
    this.legendVisible = !this.legendVisible;
  }

  // --- Marker- und Karten-Controls ---
  toggleMarkerVisibility(type: MarkerType): void {
    this.markerVisibility[type] = !this.markerVisibility[type];
    this.allMarkers.forEach(({ marker, type: t }) => {
      if (t === type) {
        this.markerVisibility[t] ? marker.addTo(this.map) : this.map.removeLayer(marker);
      }
    });
  }

  restoreLastMarker(): void {
    const last = this.removedMarkersStack.pop();
    if (!last) return;
    const { lat, lon, type, data } = last;
    this.addMarker(lat, lon, type, data?.city, data?.country);
  }

  goHome(): void {
    this.map.setView([this.initialView.lat, this.initialView.lon], this.initialView.zoom);
  }

  clearLocations(): void {
    this.selectedLocations = [];
    this.allMarkers.forEach(m => this.map.removeLayer(m.marker));
    this.allMarkers = [];
    this.removedMarkersStack = [];
    this.recommendations = '';
  }

  ngOnInit(): void {
    document.addEventListener('click', () => {
      this.dropdownOpen = false;
    });
  }
}
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import countriesData from '../../data/countries.geo.json';
import { FeatureCollection } from 'geojson';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MarkerType } from '../../types/marker-type';

const countries: FeatureCollection = countriesData as FeatureCollection;

@Component({
  selector: 'app-ai-toolbar',
  standalone: true,
  templateUrl: './ai-toolbar.component.html',
  styleUrls: ['./ai-toolbar.component.css'],
  imports: [CommonModule, HttpClientModule, FormsModule]
})
export class AiToolbarComponent implements OnInit, OnDestroy {
  @Input() map!: L.Map;
  @Input() selectedLocations: { city: string; country: string; lat: number; lon: number }[] = [];
  @Input() allMarkers: { marker: L.Marker, type: MarkerType }[] = [];
  @Input() removedMarkersStack: { lat: number, lon: number, type: MarkerType, data: any }[] = [];
  @Input() mode: 'map' | 'flight' = 'map';
  @Output() mainAction = new EventEmitter<void>();
  private countries = countries;
  public recommendations: string = '';
  public isLoading: boolean = false;
  private initialView = { lat: 20, lon: 0, zoom: 2 };
  private onDocumentClick = () => {
    this.dropdownOpen = false;
  };

  constructor(private http: HttpClient) {}

  private docClickListener = () => {
    this.dropdownOpen = false;
  };

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
      wishlist: 'violet',
      airport: 'orange'
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
      const idx = this.allMarkers.findIndex(m => m.marker === marker);
      if (idx !== -1) this.allMarkers.splice(idx, 1);

      if (type === 'user' || type === 'wishlist') {
        const idxSel = this.selectedLocations.findIndex(loc => loc.lat === lat && loc.lon === lon);
        if (idxSel !== -1) this.selectedLocations.splice(idxSel, 1);
      }
    });

    this.allMarkers.push({ marker, type });
  }

  generateRecommendations(): void {
    if (this.selectedLocations.length === 0) return;
    this.isLoading = true;
    this.recommendationsList = [];
    this.dropdownOpen = false;

    const locationsParam = this.selectedLocations.map(loc => `${loc.city}, ${loc.country}`).join(',');
    const username = localStorage.getItem('currentUser') || '';
    let url = `http://localhost:5001/api/recommendations?locations=${encodeURIComponent(locationsParam)}`;
    if (username) {
      url += `&username=${encodeURIComponent(username)}`;
    }

    this.http.get<any>(url).subscribe(response => {
      const recs = response.recommendations;
      if (!recs?.length) {
        this.isLoading = false;
        return;
      }

      const remaining = this.allMarkers.filter(m => {
        if (['safe', 'experimental', 'hidden'].includes(m.type)) {
          this.map.removeLayer(m.marker);
          return false;
        }
        return true;
      });
      this.allMarkers.splice(0, this.allMarkers.length, ...remaining);

      for (const rec of recs) {
        if (rec.lat && rec.lon) {
          const type = rec.type.includes('safe') ? 'safe' : rec.type.includes('experiment') ? 'experimental' : 'hidden';
          this.addMarker(rec.lat, rec.lon, type, rec.city, rec.country);
        }
      }

      console.log('User:', response.User);
      console.log('User Prompt:', response.user_prompt);

      this.recommendationsList = recs;
      this.dropdownOpen = true;
      this.isLoading = false;
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
    this.selectedLocations.splice(0, this.selectedLocations.length);
    this.allMarkers.forEach(m => this.map.removeLayer(m.marker));
    this.allMarkers.splice(0, this.allMarkers.length);
    this.removedMarkersStack.splice(0, this.removedMarkersStack.length);
    this.recommendations = '';
  }

  searchQuery = '';
  searchAndAddMarker(): void {
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

  ngOnInit(): void {
    document.addEventListener('click', this.onDocumentClick);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.onDocumentClick);
  }

  aiToolbarVisible = true;
  private aiToolbarFadeTimeout: any = null;
  showAiToolbar(): void {
    this.aiToolbarVisible = true;
    clearTimeout(this.aiToolbarFadeTimeout);
  }
  startAiToolbarFadeTimer(): void {
    clearTimeout(this.aiToolbarFadeTimeout);
    this.aiToolbarFadeTimeout = setTimeout(() => {
      this.aiToolbarVisible = false;
    }, 100);
  }

  legendVisible = false;
  toggleLegend(): void {
    this.legendVisible = !this.legendVisible;
  }

  dropdownOpen = false;
  recommendationsList: {
    city: string;
    country: string;
    lat: number;
    lon: number;
    type: string;
  }[] = [];

  flyToRecommendation(rec: { lat: number; lon: number }): void {
    this.map.setView([rec.lat, rec.lon], 10);
    this.dropdownOpen = false;
  }

  flyToLocation(event: any): void {
    const index = event.target.value;
    const allLocations = this.getAllDropdownLocations();
    const loc = allLocations[index];
    if (loc) this.map.setView([loc.lat, loc.lon], 10);
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  getAllDropdownLocations(): { label: string, lat: number, lon: number }[] {
    const visited = this.selectedLocations.map(loc => ({
      label: `${loc.city}, ${loc.country}`,
      lat: loc.lat,
      lon: loc.lon
    }));

    const wishlist = this.allMarkers
      .filter(m => m.type === 'wishlist')
      .map(m => {
        const latLng = m.marker.getLatLng();
        const popup = m.marker.getPopup();
        const label = popup ? popup.getContent()?.toString() : `Wunschort`;
        return {
          label: `★ ${label}`,
          lat: latLng.lat,
          lon: latLng.lng
        };
      });

    return [...visited, ...wishlist];
  }

  onMainAction(): void {
    if (this.mode === 'map') {
      this.generateRecommendations();
    } else {
      this.mainAction.emit();
    }
  }
}
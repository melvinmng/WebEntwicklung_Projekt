// (IMPORTS unverändert)
import { Component, AfterViewInit, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import countriesData from '../../data/countries.geo.json';
import { FeatureCollection } from 'geojson';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { NavbarComponent } from '../navbar/navbar.component';
import { AiToolbarComponent } from '../ai-toolbar/ai-toolbar.component';

const countries: FeatureCollection = countriesData as FeatureCollection;
type MarkerType = 'user' | 'safe' | 'experimental' | 'hidden' | 'wishlist';

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  imports: [CommonModule, HttpClientModule, FormsModule, NavbarComponent, AiToolbarComponent ]
})
export class MapComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild(AiToolbarComponent) aiToolbarComponent!: AiToolbarComponent;

  public map!: L.Map;
  private countries = countries;
  public selectedLocations: { city: string; country: string; lat: number; lon: number }[] = [];
  public recommendations: string = '';
  public allMarkers: { marker: L.Marker, type: MarkerType }[] = [];
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
  private isMouseDown = false;
  private hasMoved = false;
  private username: string = localStorage.getItem('username') || '';
  private suppressSync = false;
  private isDragging = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    document.addEventListener('click', () => this.aiToolbarComponent.dropdownOpen = false);
  }

  ngAfterViewInit(): void {
    try {
      this.initMap();
      if (this.username) {
        this.loadUserMarkers();
      }
      this.addMapButtons();
    } catch (err) {
      console.error('Fehler bei initMap oder Map-Setup:', err);
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.off();
      this.map.remove();  
      this.map = undefined!;
    }
  }

  private initMap(): void {
    // Alten Container zurücksetzen (falls schon initialisiert)
    const container = L.DomUtil.get('map') as HTMLElement;
    if (container && (container as any)._leaflet_id) {
      (container as any)._leaflet_id = null;
      container.innerHTML = '';
    }
  
    this.map = L.map('map', {
      center: [this.initialView.lat, this.initialView.lon],
      zoom: this.initialView.zoom,
      minZoom: 2,
      maxZoom: 18,
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      dragging: true,      // ist eigentlich Default, aber zur Sicherheit
      touchZoom: false,
      tap: false
    }as any);
  
    // Zoom-Buttons unten links
    L.control.zoom({ position: 'bottomleft' }).addTo(this.map);
  
    // OSM-Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  
    // Länder-Grenzen
    L.geoJSON(this.countries, {
      style: { color: 'blue', weight: 1, fillOpacity: 0.1 }
    }).addTo(this.map);
  
    // Nach dem Einfügen ins DOM einmal die Größe aktualisieren
    // → verhindert mögliche Probleme, wenn das Map-Div erst nach Darstellung seine Größe bekommt
    setTimeout(() => this.map.invalidateSize(), 0);
  
    // Linksklick → regulärer "user"-Marker
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.addMarker(e.latlng.lat, e.latlng.lng, 'user');
      this.getLocationDetails(e.latlng.lat, e.latlng.lng);
    });
  
    // Rechtsklick → "wishlist"-Marker
    this.map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      this.getWishlistLocationDetails(e.latlng.lat, e.latlng.lng);
    });
  }

  private addMapButtons(): void {
    const mapContainer = document.querySelector('.leaflet-bottom.leaflet-left');
    if (!mapContainer) return;

    const group = document.createElement('div');
    group.className = 'leaflet-bar leaflet-control leaflet-custom-group';

    const undo = document.createElement('a');
    undo.innerHTML = '↩️';
    undo.title = 'Letzten Marker wiederherstellen';
    undo.className = 'leaflet-custom-button';
    undo.onclick = e => { e.preventDefault(); this.restoreLastMarker(); };

    const home = document.createElement('a');
    home.innerHTML = '🏠';
    home.title = 'Zur Startansicht';
    home.className = 'leaflet-custom-button';
    home.onclick = e => { e.preventDefault(); this.goHome(); };

    const clear = document.createElement('a');
    clear.innerHTML = '🗑️';
    clear.title = 'Alle Orte zurücksetzen';
    clear.className = 'leaflet-custom-button';
    clear.onclick = e => { e.preventDefault(); this.clearLocations(); };

    group.appendChild(clear);
    group.appendChild(undo);
    group.appendChild(home);
    mapContainer.appendChild(group);
  }

  private getLocationDetails(lat: number, lon: number): void {
    this.http.get<any>(`http://localhost:5001/api/reverse-geocode?lat=${lat}&lon=${lon}`)
      .subscribe(data => {
        const city = data.city || 'Unbekannt';
        const country = data.country || 'Unbekannt';
        if (!this.selectedLocations.some(l => l.lat === lat && l.lon === lon)) {
          this.selectedLocations.push({ city, country, lat, lon });
          this.syncToDatabase();
        }
      });
  }

  private getWishlistLocationDetails(lat: number, lon: number): void {
    this.http.get<any>(`http://localhost:5001/api/reverse-geocode?lat=${lat}&lon=${lon}`)
      .subscribe(data => {
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

  public addMarker(lat: number, lon: number, type: MarkerType, city = '', country = ''): void {
    const marker = L.marker([lat, lon], {
      icon: this.getIcon(type),
      interactive: true
    }).addTo(this.map);

    if (city && country) marker.bindPopup(`${type}: ${city}, ${country}`);

    marker.on('click', () => {
      this.map.removeLayer(marker);
      this.removedMarkersStack.push({ lat, lon, type, data: { city, country } });
      this.allMarkers = this.allMarkers.filter(m => m.marker !== marker);
      if (type === 'user') {
        this.selectedLocations = this.selectedLocations.filter(l => !(l.lat === lat && l.lon === lon));
      }
      this.syncToDatabase();
    });

    this.allMarkers.push({ marker, type });

    // If loaded with city/country, also add to selectedLocations
    if ((type === 'user' || type === 'wishlist') && city && country) {
      if (!this.selectedLocations.some(l => l.lat === lat && l.lon === lon)) {
        this.selectedLocations.push({ city, country, lat, lon });
      }
    }

    this.syncToDatabase();
  }

  private syncToDatabase(): void {
    if (this.suppressSync || !this.username) return;

    const userLoc = this.allMarkers
      .filter(m => m.type === 'user')
      .map(m => {
        const p = m.marker.getLatLng();
        return { lat: p.lat, lon: p.lng };
      });
    const wishLoc = this.allMarkers
      .filter(m => m.type === 'wishlist')
      .map(m => {
        const p = m.marker.getLatLng();
        return { lat: p.lat, lon: p.lng };
      });
    const payload = { USERLOC: userLoc, WISHLOC: wishLoc };

    this.http.get<any>(`http://localhost:5004/api/db-read/USER/${this.username}`)
      .subscribe({
        next: () => {
          this.http.patch(`http://localhost:5004/api/db-update/${this.username}`, payload)
            .subscribe();
        },
        error: () => {
          const createPayload = { USER: this.username, ...payload };
          this.http.post('http://localhost:5004/api/db-write', createPayload)
            .subscribe();
        }
      });
  }

  private loadUserMarkers(): void {
    this.suppressSync = true;
    this.http.get<any>(`http://localhost:5004/api/db-read/USER/${this.username}`)
      .subscribe({
        next: data => {
          if (data.USERLOC) {
            data.USERLOC.forEach((l: any) => this.addMarker(l.lat, l.lon, 'user'));
          }
          if (data.WISHLOC) {
            data.WISHLOC.forEach((l: any) => this.addMarker(l.lat, l.lon, 'wishlist'));
          }
        },
        complete: () => this.suppressSync = false,
        error: () => this.suppressSync = false
      });
  }

  toggleMarkerVisibility(type: MarkerType): void {
    this.markerVisibility[type] = !this.markerVisibility[type];
    this.allMarkers.forEach(({ marker, type: t }) => {
      if (t === type) {
        this.markerVisibility[t] ? marker.addTo(this.map) : marker.remove();
      }
    });
  }

  restoreLastMarker(): void {
    const last = this.removedMarkersStack.pop();
    if (!last) return;
    this.addMarker(last.lat, last.lon, last.type, last.data.city, last.data.country);
  }

  goHome(): void {
    this.map.setView([this.initialView.lat, this.initialView.lon], this.initialView.zoom);
  }

  clearLocations(): void {
    this.selectedLocations = [];
    this.allMarkers.forEach(m => m.marker.remove());
    this.allMarkers = [];
    this.removedMarkersStack = [];
    this.syncToDatabase();
  }

  searchQuery = '';
  searchAndAddMarker(): void {
    if (!this.searchQuery) return;
    this.http.get<any[]>(`http://localhost:5001/api/search?query=${encodeURIComponent(this.searchQuery)}`)
      .subscribe(results => {
        if (!results.length) {
          alert('Ort nicht gefunden.');
          return;
        }
        const { lat, lon } = results[0];
        this.addMarker(lat, lon, 'user');
        this.getLocationDetails(lat, lon);
        this.map.setView([lat, lon], 10);
      });
  }

  legendVisible = false;
  toggleLegend(): void {
    this.legendVisible = !this.legendVisible;
  }

  flyToLocation(event: any): void {
    const idx = event.target.value;
    const all = this.getAllDropdownLocations();
    if (all[idx]) {
      this.map.setView([all[idx].lat, all[idx].lon], 10);
    }
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.aiToolbarComponent.dropdownOpen = !this.aiToolbarComponent.dropdownOpen;
  }

  getAllDropdownLocations(): { label: string; lat: number; lon: number }[] {
    const visited = this.selectedLocations.map(l => ({
      label: `${l.city}, ${l.country}`, lat: l.lat, lon: l.lon
    }));
    const wishlist = this.allMarkers
      .filter(m => m.type === 'wishlist')
      .map(m => {
        const p = m.marker.getLatLng();
        const popup = m.marker.getPopup()?.getContent()?.toString() || 'Wunschort';
        return { label: `★ ${popup}`, lat: p.lat, lon: p.lng };
      });
    return [...visited, ...wishlist];
  }
}
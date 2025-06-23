import { Component, AfterViewInit, OnInit, ViewChild, OnDestroy, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import countriesData from '../../data/countries.geo.json';
import { FeatureCollection } from 'geojson';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { tap } from 'rxjs/operators';

import { NavbarComponent } from '../navbar/navbar.component';
import { AiToolbarComponent } from '../ai-toolbar/ai-toolbar.component';

const countries: FeatureCollection = countriesData as FeatureCollection;
type MarkerType = 'user' | 'safe' | 'experimental' | 'hidden' | 'wishlist' | 'airport';

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  imports: [CommonModule, HttpClientModule, NavbarComponent, AiToolbarComponent ]
})
export class MapComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild(AiToolbarComponent) aiToolbarComponent!: AiToolbarComponent;
  @Input() toolbarMode: 'map' | 'flight' = 'map';
  @Output() flightSearchRequested = new EventEmitter<void>();

  public map!: L.Map;
  private countries = countries;
  public selectedLocations: { city: string; country: string; lat: number; lon: number }[] = [];
  public recommendations: string = '';
  public allMarkers: { marker: L.Marker, type: MarkerType }[] = [];
  public removedMarkersStack: { lat: number, lon: number, type: MarkerType, data: any }[] = [];
  public isLoading: boolean = false;
  private flightMarkers: L.Marker[] = [];
  private flightPath?: L.Polyline;
  private planeMarker?: L.Marker;
  private planeInterval: any = null;
  private initialView = { lat: 20, lon: 0, zoom: 2 };
  public markerVisibility: Record<MarkerType, boolean> = {
    user: true,
    safe: true,
    experimental: true,
    hidden: true,
    wishlist: true,
    airport: true
  };
  private username: string = localStorage.getItem('currentUser') || '';
  private suppressSync = false;
  infoVisible = true;

  constructor(private http: HttpClient) {}

  private onDocumentClick = () => {
    this.aiToolbarComponent.dropdownOpen = false;
  };

  ngOnInit(): void {
    // Ensure the help overlay is visible each time the page is opened
    localStorage.removeItem('hideMapInfo');
    this.infoVisible = false;
    document.addEventListener('click', this.onDocumentClick);
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
    document.removeEventListener('click', this.onDocumentClick);
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

    // provide map instance to the toolbar component
    this.aiToolbarComponent.map = this.map;
  }

  private addMapButtons(): void {
    const mapContainer = document.querySelector('.leaflet-bottom.leaflet-left');
    if (!mapContainer) return;
  
    const group = document.createElement('div');
    group.className = 'leaflet-bar leaflet-control leaflet-custom-group';
  
    L.DomEvent.disableClickPropagation(group);
  
    const undo = document.createElement('a');
    undo.innerHTML = '↩️';
    undo.title = 'Letzten Marker wiederherstellen';
    undo.className = 'leaflet-custom-button';
    undo.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      this.restoreLastMarker();
    };
  
    const home = document.createElement('a');
    home.innerHTML = '🏠';
    home.title = 'Zur Startansicht';
    home.className = 'leaflet-custom-button';
    home.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      this.goHome();
    };
  
    const clear = document.createElement('a');
    clear.innerHTML = '🗑️';
    clear.title = 'Alle Orte zurücksetzen';
    clear.className = 'leaflet-custom-button';
    clear.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      this.clearLocations();
    };
  
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
    this.isLoading = true;
    this.http.get<any>(`http://localhost:5004/api/db-read/USER/${this.username}`)
      .subscribe({
        next: data => {
          const requests: any[] = [];
          if (data.USERLOC) {
            data.USERLOC.forEach((l: any) => {
              const req = this.http.get<any>(`http://localhost:5001/api/reverse-geocode?lat=${l.lat}&lon=${l.lon}`)
                .pipe(tap(res => {
                  const city = res.city || 'Unbekannt';
                  const country = res.country || 'Unbekannt';
                  this.addMarker(l.lat, l.lon, 'user', city, country);
                }));
              requests.push(req);
            });
          }
          if (data.WISHLOC) {
            data.WISHLOC.forEach((l: any) => {
              const req = this.http.get<any>(`http://localhost:5001/api/reverse-geocode?lat=${l.lat}&lon=${l.lon}`)
                .pipe(tap(res => {
                  const city = res.city || 'Unbekannt';
                  const country = res.country || 'Unbekannt';
                  this.addMarker(l.lat, l.lon, 'wishlist', city, country);
                }));
              requests.push(req);
            });
          }
          if (requests.length) {
            forkJoin(requests).subscribe({
              complete: () => {
                this.suppressSync = false;
                this.isLoading = false;
              },
              error: () => {
                this.suppressSync = false;
                this.isLoading = false;
              }
            });
          } else {
            this.suppressSync = false;
            this.isLoading = false;
          }
        },
        error: () => {
          this.suppressSync = false;
          this.isLoading = false;
        }
      });
  }

  toggleMarkerVisibility(type: MarkerType): void {
    this.markerVisibility[type] = !this.markerVisibility[type];
    if (type === 'airport') {
      this.flightMarkers.forEach(m => {
        this.markerVisibility[type] ? m.addTo(this.map) : m.remove();
      });
      if (this.flightPath) {
        this.markerVisibility[type] ? this.flightPath.addTo(this.map) : this.flightPath.remove();
      }
      if (this.planeMarker) {
        this.markerVisibility[type] ? this.planeMarker.addTo(this.map) : this.planeMarker.remove();
      }
      return;
    }
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
    this.clearFlightVisualization();
  }

  clearFlightVisualization(): void {
    this.flightMarkers.forEach(m => this.map.removeLayer(m));
    this.flightMarkers = [];
    if (this.flightPath) {
      this.map.removeLayer(this.flightPath);
      this.flightPath = undefined;
    }
    if (this.planeMarker) {
      this.map.removeLayer(this.planeMarker);
      this.planeMarker = undefined;
    }
    if (this.planeInterval) {
      clearInterval(this.planeInterval);
      this.planeInterval = null;
    }
  }

  private createAirportMarker(lat: number, lon: number): L.Marker {
    const marker = L.marker([lat, lon], {
      icon: this.getIcon('airport'),
      interactive: false
    });
    if (this.markerVisibility.airport) marker.addTo(this.map);
    return marker;
  }

  private createArc(start: [number, number], end: [number, number], heightFactor = 0.2, steps = 100): L.LatLngExpression[] {
    const [lat1, lon1] = start;
    const [lat2, lon2] = end;
    const points: L.LatLngExpression[] = [];
    const dx = lat2 - lat1;
    const dy = lon2 - lon1;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const height = dist * heightFactor;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      let lat = lat1 + dx * t;
      let lon = lon1 + dy * t;
      const offset = 4 * height * t * (1 - t);
      lat += (-dy / dist) * offset;
      lon += (dx / dist) * offset;
      points.push([lat, lon]);
    }
    return points;
  }

  private animatePlane(points: L.LatLngExpression[]): void {
    if (this.planeInterval) {
      clearInterval(this.planeInterval);
      this.planeInterval = null;
    }
    if (this.planeMarker) {
      this.map.removeLayer(this.planeMarker);
    }
    if (!points.length) return;
    const icon = L.divIcon({ className: '', html: '✈️', iconSize: [24, 24] });
    const marker = L.marker(points[0], { icon, interactive: false });
    if (this.markerVisibility.airport) marker.addTo(this.map);
    this.planeMarker = marker;
    let idx = 0;
    this.planeInterval = setInterval(() => {
      idx++;
      if (idx >= points.length) {
        clearInterval(this.planeInterval);
        this.planeInterval = null;
      } else {
        marker.setLatLng(points[idx] as L.LatLngExpression);
      }
    }, 50);
  }

  showFlight(origin: { lat: number; lon: number }, dest: { lat: number; lon: number }): void {
    this.clearFlightVisualization();
    const m1 = this.createAirportMarker(origin.lat, origin.lon);
    const m2 = this.createAirportMarker(dest.lat, dest.lon);
    this.flightMarkers = [m1, m2];
    const arc = this.createArc([origin.lat, origin.lon], [dest.lat, dest.lon]);
    this.flightPath = L.polyline(arc, { color: 'orange', weight: 2 });
    if (this.markerVisibility.airport) this.flightPath.addTo(this.map);
    this.animatePlane(arc);
  }

  legendVisible = false;
  toggleLegend(): void {
    this.legendVisible = !this.legendVisible;
  }

  toggleInfo(): void {
    this.infoVisible = !this.infoVisible;
  }

  closeInfo(): void {
    this.infoVisible = false;
  }

  handleMainAction(): void {
    if (this.toolbarMode === 'flight') {
      this.flightSearchRequested.emit();
    }
  }
}
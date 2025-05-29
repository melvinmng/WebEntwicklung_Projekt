import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import countriesData from './data/countries.geo.json';
import { FeatureCollection } from 'geojson';

const countries: FeatureCollection = countriesData as FeatureCollection;

@Component({
  selector: 'app-root',
  template: `<div id="map"></div>`,
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  private map!: L.Map;
  private countries = countries;

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map').setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

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
  }
}

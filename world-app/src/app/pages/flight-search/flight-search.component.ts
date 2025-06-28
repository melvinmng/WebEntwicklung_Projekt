import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpClientModule } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';


import { MapComponent } from '../map/map.component';

@Component({
  selector: 'app-flight-search',
  imports: [CommonModule, HttpClientModule, FormsModule, MapComponent],
  standalone: true,
  templateUrl: './flight-search.component.html',
  styleUrl: './flight-search.component.css'
})
export class FlightSearchComponent {
  @ViewChild(MapComponent) mapComponent!: MapComponent;
  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  // ----- Flight search -----
  flightFormVisible = false;
  flightOrigin = '';
  flightDestination = '';
  flightDate = '';
  flightSeat = 'economy';
  flightTrip = 'one-way';
  flightAdults = 1;
  flightChildren = 0;
  flightBookingURL = '';
  flightBookingURLSafe: SafeResourceUrl | '' = '';
  flightResults: any = null;
  flightResultsVisible = false;
  flightResultsList: any[] = [];
  flightError = '';
  bookingVisible = false;
  bookingError = '';
  formErrors = { origin: false, destination: false, date: false };
  foundIataCodes: string[] = [];
  airportNameSearch = '';
  iataSearchError = '';
  isLoading = false;

  private resolveIata(input: string) {
    if (input && input.length === 3) {
      return this.http.get<{iata_codes: string[]}>(
        `http://localhost:5003/airport-code?name=${encodeURIComponent(input)}`
      ).pipe(
        map(res => res.iata_codes?.[0] || input.toUpperCase()),
        catchError(() => of(input.toUpperCase()))
      );
    }
    if (!input) return of('');
    return this.http.get<{ iata_codes: string[] }>(
      `http://localhost:5003/airport-code?name=${encodeURIComponent(input)}`
    ).pipe(
      map(res => res.iata_codes?.[0] || ''),
      catchError(() => of(''))
    );
  }


  validateBookingFields(): boolean {
    this.formErrors.origin = !this.flightOrigin;
    this.formErrors.destination = !this.flightDestination;
    this.formErrors.date = !this.flightDate;
    return !(this.formErrors.origin || this.formErrors.destination || this.formErrors.date);
  }

  clearError(field: 'origin' | 'destination' | 'date'): void {
    this.formErrors[field] = false;
  }

  onTwoPinsSelected(event: { origin: string; destination: string }): void {
    console.log('EVENT Angekommen:', event);
    const originReq = this.http.get<{ airports: string[] }>(
      `http://localhost:5003/search-airport?query=${encodeURIComponent(event.origin)}`
    );
    const destReq = this.http.get<{ airports: string[] }>(
      `http://localhost:5003/search-airport?query=${encodeURIComponent(event.destination)}`
    );

    forkJoin([originReq, destReq]).subscribe(([o, d]) => {
      this.flightOrigin = o.airports[0] || '';
      this.flightDestination = d.airports[0] || '';
      const date = new Date();
      date.setDate(date.getDate() + 7);
      this.flightDate = date.toISOString().split('T')[0];
      if (this.flightOrigin && this.flightDestination) {
        this.openFlightSearch();
      }
    });
  }

  openFlightSearch(): void {
    console.log('openFlightSearch aufgerufen');
    this.flightFormVisible = true;
    this.flightResultsVisible = false;
  }

  closeFlightSearch(): void {
    this.resetFlightSearch();
    this.flightFormVisible = false;
    this.flightResultsVisible = false;
  }

  resetFlightSearch(): void {
    this.flightOrigin = '';
    this.flightDestination = '';
    this.flightDate = '';
    this.flightSeat = 'economy';
    this.flightTrip = 'one-way';
    this.flightAdults = 1;
    this.flightChildren = 0;
    this.flightResults = null;
    this.flightResultsVisible = false;
    this.flightResultsList = [];
    this.flightError = '';
    this.bookingError = '';
    this.formErrors = { origin: false, destination: false, date: false };
    this.bookingVisible = false;
    this.flightFormVisible = true;
    this.foundIataCodes = [];
    this.airportNameSearch = '';
    this.iataSearchError = '';
  }

  closeFlightResults(): void {
    this.flightResultsVisible = false;
  }
  

  searchFlights(): void {
    if (!this.validateBookingFields()) {
      this.bookingError = 'Bitte alle Pflichtfelder ausfüllen';
      return;
    }
    this.isLoading = true;
    this.bookingError = '';

    forkJoin([
      this.resolveIata(this.flightOrigin),
      this.resolveIata(this.flightDestination),
    ]).subscribe(([originCode, destCode]) => {
      if (!originCode || !destCode) {
        this.isLoading = false;
        this.flightError = 'Flughafen nicht gefunden';
        this.flightResultsList = [];
        this.flightResultsVisible = true;
        return;
      }
      this.flightOrigin = originCode;
      this.flightDestination = destCode;

      const params = new URLSearchParams({
        from_airport: originCode,
        to_airport: destCode,
        date: this.flightDate,
        trip: this.flightTrip,
        seat: this.flightSeat,
        adults: this.flightAdults.toString(),
        children: this.flightChildren.toString(),
      });

      this.http.get(`http://localhost:5003/flight-search?${params.toString()}`)
        .subscribe({
          next: (data: any) => {
            this.flightResults = data;
            if (data && data.error) {
              this.flightError = data.error;
              this.flightResultsList = [];
            } else {
              this.flightError = '';
              this.flightResultsList = (data?.flights || []).sort(
                (a: any, b: any) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0)
              );
            }
            this.flightResultsVisible = true;
            this.isLoading = false;
            this.showFlightOnMap();
          },
          error: (err: HttpErrorResponse) => {
            this.flightError = err.error?.error || 'Fehler bei der Abfrage';
            this.flightResultsList = [];
            this.flightResultsVisible = true;
            this.isLoading = false;
            this.showFlightOnMap();
          }
        });
    });
  }

  // ----- Booking URL -----
  getFlightBookingURL(): string {
    return `https://www.expedia.com/Flights-Search?flight-type=on&mode=search&trip=${this.flightTrip}&leg1=from:${this.flightOrigin},to:${this.flightDestination},departure:${this.flightDate}TANYT,fromType:AIRPORT,toType:AIRPORT&options=cabinclass:${this.flightSeat}&fromDate=${this.flightDate}&passengers=children:${this.flightChildren}[7],adults:${this.flightAdults},infantinlap:N`;
  }

  // ----- Redirect to Booking Page -----
  openBookingPage(): void {
    if (!this.validateBookingFields()) {
      this.bookingError = 'Bitte alle Pflichtfelder ausfüllen';
      return;
    }
    this.bookingError = '';
    this.flightBookingURL = this.getFlightBookingURL();
    window.open(this.flightBookingURL, '_blank');
  }

  // ----- Booking overlay -----
  openBookingOverlay(): void {
    this.flightFormVisible = false;
    this.flightResultsVisible = false;
    this.bookingVisible = true;
    const url = this.getFlightBookingURL();
    this.flightBookingURL = url;
    this.flightBookingURLSafe = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  closeBookingOverlay(): void {
    this.bookingVisible = false;
    this.flightFormVisible = true;
    this.flightResultsVisible = true;
    this.flightBookingURLSafe = '';
  }

  findAirportCode(name: string): void {
    const url = `http://localhost:5003/airport-code?name=${encodeURIComponent(name)}`;
    this.iataSearchError = '';
    this.foundIataCodes = [];

    this.http.get<{ iata_codes: string[] }>(url)
      .subscribe({
        next: (data) => {
          if (data.iata_codes && data.iata_codes.length > 0) {
          this.foundIataCodes = data.iata_codes;
        } else {
          this.iataSearchError = 'Kein Flughafen gefunden';
        }
      },
        error: (err) => {
        console.error('Fehler beim Abrufen der Flughafencodes:', err);
        this.iataSearchError = 'Fehler beim Abrufen der Flughafencodes';
        }
      });
  }

  private showFlightOnMap(): void {
    if (!this.mapComponent) return;
    const originReq = this.http.get<any>(`http://localhost:5003/airport-details?code=${this.flightOrigin}`);
    const destReq = this.http.get<any>(`http://localhost:5003/airport-details?code=${this.flightDestination}`);
    forkJoin([originReq, destReq]).subscribe(([o, d]) => {
      if (!o || !d) return;
      const origin = { lat: parseFloat(o.latitude_deg), lon: parseFloat(o.longitude_deg) };
      const dest = { lat: parseFloat(d.latitude_deg), lon: parseFloat(d.longitude_deg) };
      this.mapComponent.showFlight(origin, dest);
      this.mapComponent.map.fitBounds([[origin.lat, origin.lon], [dest.lat, dest.lon]]);
    });
  }
}
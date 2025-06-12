import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { MapComponent } from '../map/map.component';

@Component({
  selector: 'app-flight-search',
  imports: [CommonModule, HttpClientModule, FormsModule, MapComponent],
  standalone: true,
  templateUrl: './flight-search.component.html',
  styleUrl: './flight-search.component.css'
})
export class FlightSearchComponent {
  constructor(private http: HttpClient) {}

  /* RAUS */
  // ----- Flight search -----
  flightFormVisible = false;
  flightOrigin = '';
  flightDestination = '';
  flightDate = '';
  flightSeat = 'economy';
  flightTrip = 'one-way';
  flightAdults = 1;
  flightChildren = 0;
  flightResults: any = null;
  flightResultsVisible = false;
  flightResultsList: any[] = [];
  flightError = '';
  bookingVisible = false;

  openFlightSearch(): void {
    console.log('openFlightSearch aufgerufen');
    this.flightFormVisible = true;
    this.flightResultsVisible = false;
  }

  closeFlightSearch(): void {
    this.flightFormVisible = false;
    this.flightResults = null;
    this.flightResultsVisible = false;
    this.flightResultsList = [];
    this.flightError = '';
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
    this.bookingVisible = false;
    this.flightFormVisible = true;
  }

  closeFlightResults(): void {
    this.flightResultsVisible = false;
  }

  searchFlights(): void {
    if (!this.flightOrigin || !this.flightDestination || !this.flightDate) return;
    const params = new URLSearchParams({
      from_airport: this.flightOrigin,
      to_airport: this.flightDestination,
      date: this.flightDate,
      trip: this.flightTrip,
      seat: this.flightSeat,
      adults: this.flightAdults.toString(),
      children: this.flightChildren.toString(),
    });
    this.http
      .get(`http://localhost:5003/flight-search?${params.toString()}`)
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
        },
        error: (err: HttpErrorResponse) => {
          this.flightError = err.error?.error || 'Fehler bei der Abfrage';
          this.flightResultsList = [];
          this.flightResultsVisible = true;
        }
      });
  }

  openBookingOverlay(): void {
    this.flightFormVisible = false;
    this.flightResultsVisible = false;
    this.bookingVisible = true;

    /* this.bookingURL = "https://www.google.com/travel/flights?q=Flights to  from FRA on 2025-09-13 one way business class&curr=USD" */
  }

  closeBookingOverlay(): void {
    this.bookingVisible = false;
    this.flightFormVisible = true;
    this.flightResultsVisible = true;
  }
}
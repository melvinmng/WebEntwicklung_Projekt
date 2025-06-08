import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Flight {
  flight_number: string;
  airline: string;
  price: any;
  departure_time: string;
}

@Injectable({ providedIn: 'root' })
export class FlightService {
  constructor(private http: HttpClient) {}

  getFlights(origin: string, destination: string, date: string): Observable<Flight[]> {
    const params = new HttpParams()
      .set('origin', origin)
      .set('destination', destination)
      .set('date', date);
    return this.http.get<Flight[]>('/api/flights', { params });
  }
}

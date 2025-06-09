import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-flights',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './flights.component.html',
  styleUrls: ['./flights.component.css']
})
export class FlightsComponent {
  origin = '';
  destination = '';
  date = '';
  results: any = null;

  constructor(private http: HttpClient) {}

  search() {
    const params = `origin=${this.origin}&destination=${this.destination}&date=${this.date}`;
    this.http.get(`http://localhost:5003/flights?${params}`).subscribe(data => {
      this.results = data;
    });
  }
}
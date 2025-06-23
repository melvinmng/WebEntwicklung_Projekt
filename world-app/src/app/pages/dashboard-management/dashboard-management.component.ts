import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgFor } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NavbarComponent, HttpClientModule, CommonModule],
  templateUrl: './dashboard-management.component.html',
  styleUrls: ['./dashboard-management.component.css']
})
export class DashboardComponent implements OnInit {
  stats: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>('http://localhost:5004/api/stats').subscribe({
      next: data => (this.stats = data),
      error: err => console.error('Fehler beim Abrufen der Statistiken', err)
    });
  }
  services = [
    { name: 'API-Service', path: '../api-service/app.py', port: 5001 },
    { name: 'Auth-Service', path: '../auth-service/app.py', port: 5002 },
    { name: 'Flight-Service', path: '../flight-service/app.py', port: 5003 },
    { name: 'DB-Service', path: '../db-service/app.py', port: 5004 },
  ];

  openService(service: any) {
    window.open(`http://localhost:${service.port}/dashboard`, '_blank');
  }
}
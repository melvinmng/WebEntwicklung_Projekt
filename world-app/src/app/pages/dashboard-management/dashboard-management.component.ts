import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NavbarComponent],
  templateUrl: './dashboard-management.component.html',
  styleUrls: ['./dashboard-management.component.css']
})
export class DashboardComponent {
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
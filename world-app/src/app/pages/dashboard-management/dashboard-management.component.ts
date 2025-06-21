import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor],
  templateUrl: './dashboard-management.component.html'
})
export class DashboardComponent {
  services = [
    { name: 'API-Service', path: '../api-service/app.py', port: 5000 },
    { name: 'Auth-Service', path: '../api-service/app.py', port: 5002 },
    { name: 'Flight-Service', path: '../api-service/app.py', port: 5003 },
    { name: 'DB-Service', path: '../api-service/app.py', port: 5004 },
  ];

  openService(service: any) {
    window.open(`http://localhost:${service.port}/dashboard`, '_blank');
  }
}
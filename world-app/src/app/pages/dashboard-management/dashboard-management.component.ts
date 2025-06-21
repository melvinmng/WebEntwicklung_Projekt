import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './dashboard-management.component.html'
})
export class DashboardComponent {
  services = [
    { name: 'API-Service', path: '../api-service/app.py', port: 5055 },
    // { name: 'DB-Service', path: '/pfad/zu/db-service/app.py' }
    // weitere Services ...
  ];
  status: any = {};

  constructor(private http: HttpClient) {
    this.refreshStatus();
  }

  startService(service: any) {
    const win = window.open('', '_blank');
    this.http.post('http://localhost:5050/start', { path: service.path, name: service.name })
      .subscribe(() => {
        this.refreshStatus();
        if (win) {
          win.location.href = `http://localhost:${service.port}`;
        }
      });
  }

  stopService(service: any) {
    this.http.post('http://localhost:5050/stop', { name: service.name })
      .subscribe(() => this.refreshStatus());
  }

  refreshStatus() {
    this.http.get('http://localhost:5050/status')
      .subscribe(status => this.status = status);
  }

  testOpen() {
    window.open('https://google.de', '_blank');
  }
}
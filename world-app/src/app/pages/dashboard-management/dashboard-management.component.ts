import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard-management.component.html'
})
export class DashboardComponent {
  services = [
    { name: 'API-Service', path: '/pfad/zu/api-service/app.py' },
    { name: 'DB-Service', path: '/pfad/zu/db-service/app.py' }
    // weitere Services ...
  ];
  status: any = {};

  constructor(private http: HttpClient) {
    this.refreshStatus();
  }

  startService(service: any) {
    this.http.post('http://localhost:5050/start', { path: service.path, name: service.name })
      .subscribe(() => this.refreshStatus());
  }

  stopService(service: any) {
    this.http.post('http://localhost:5050/stop', { name: service.name })
      .subscribe(() => this.refreshStatus());
  }

  refreshStatus() {
    this.http.get('http://localhost:5050/status')
      .subscribe(status => this.status = status);
  }
}
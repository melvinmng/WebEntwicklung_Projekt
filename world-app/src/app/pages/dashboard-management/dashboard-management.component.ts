import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgFor } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NavbarComponent } from '../navbar/navbar.component';
import Chart from 'chart.js/auto';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NavbarComponent, HttpClientModule, CommonModule],
  templateUrl: './dashboard-management.component.html',
  styleUrls: ['./dashboard-management.component.css']
})
export class DashboardComponent implements OnInit {
  stats: any = null;
  userLocChart: any;
  wishLocChart: any;
  ratioChart: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>('http://localhost:5004/api/stats').subscribe({
      next: data => {
        this.stats = data;
        setTimeout(() => this.initCharts(), 0);
      },
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

  initCharts() {
    if (!this.stats) return;

    const users = Object.keys(this.stats.user_location_counts || {});
    const locCounts = Object.values(this.stats.user_location_counts || {});
    const wishCounts = Object.values(this.stats.wish_location_counts || {});

    const ctx1 = (document.getElementById('userLocChart') as HTMLCanvasElement)?.getContext('2d');
    const ctx2 = (document.getElementById('wishLocChart') as HTMLCanvasElement)?.getContext('2d');
    const ctx3 = (document.getElementById('ratioChart') as HTMLCanvasElement)?.getContext('2d');

    if (ctx1) {
      this.userLocChart = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: users,
          datasets: [{ label: 'Besuchte Orte', data: locCounts as number[] }]
        },
        options: { responsive: true }
      });
    }

    if (ctx2) {
      this.wishLocChart = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: users,
          datasets: [{ label: 'Wunschorte', data: wishCounts as number[] }]
        },
        options: { responsive: true }
      });
    }

    if (ctx3) {
      this.ratioChart = new Chart(ctx3, {
        type: 'pie',
        data: {
          labels: ['Besucht', 'Wunschliste'],
          datasets: [{ data: [this.stats.total_user_locations, this.stats.total_wish_locations] }]
        },
        options: { responsive: true }
      });
    }

    // TODO: Sobald Zeitstempel in der Datenbank gespeichert werden,
    //       hier ein Liniendiagramm der Nutzerregistrierungen implementieren.
  }
}
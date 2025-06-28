import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgFor } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NavbarComponent } from '../navbar/navbar.component';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import Chart from 'chart.js/auto';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NavbarComponent, HttpClientModule, CommonModule],
  templateUrl: './dashboard-management.component.html',
  styleUrls: ['./dashboard-management.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: any = null;
  userLocChart: any;
  wishLocChart: any;
  ratioChart: any;
  loginChart: any;
  loginData: any;
  private routerSub?: Subscription;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.fetchStats();
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd && e.urlAfterRedirects === '/dashboard'))
      .subscribe(() => this.fetchStats());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.userLocChart?.destroy();
    this.wishLocChart?.destroy();
    this.ratioChart?.destroy();
    this.loginChart?.destroy();
  }

  private fetchStats() {
    const username = localStorage.getItem('currentUser') || '';
    const statsUrl = username
      ? `http://localhost:5004/api/stats?username=${encodeURIComponent(username)}`
      : 'http://localhost:5004/api/stats';
    this.http.get<any>(statsUrl, { headers: { 'Cache-Control': 'no-cache' } }).subscribe({
      next: data => {
        this.stats = data;
        setTimeout(() => this.initCharts(), 0);
      },
      error: err => console.error('Fehler beim Abrufen der Statistiken', err)
    });

    const loginUrl = username
      ? `http://localhost:5004/api/login-stats?username=${encodeURIComponent(username)}`
      : 'http://localhost:5004/api/login-stats';
    this.http.get<any>(loginUrl).subscribe({
      next: data => {
        this.loginData = data;
        setTimeout(() => this.initLoginChart(), 0);
      },
      error: err => console.error('Fehler beim Abrufen der Login-Statistiken', err)
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

    // Determine the top users for each category to avoid overcrowded charts
    const userLocEntries = Object.entries(this.stats.user_location_counts || {})
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5);
    const wishLocEntries = Object.entries(this.stats.wish_location_counts || {})
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5);

    const locUsers = userLocEntries.map(([u]) => u);
    const locCounts = userLocEntries.map(([, c]) => c as number);
    const wishUsers = wishLocEntries.map(([u]) => u);
    const wishCounts = wishLocEntries.map(([, c]) => c as number);

    const ctx1 = (document.getElementById('userLocChart') as HTMLCanvasElement)?.getContext('2d');
    const ctx2 = (document.getElementById('wishLocChart') as HTMLCanvasElement)?.getContext('2d');
    const ctx3 = (document.getElementById('ratioChart') as HTMLCanvasElement)?.getContext('2d');

    if (ctx1) {
      if (this.userLocChart) {
        this.userLocChart.destroy();
      }
      this.userLocChart = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: locUsers,
          datasets: [{ label: 'Besuchte Orte', data: locCounts }]
        },
        options: { responsive: true }
      });
    }

    if (ctx2) {
      if (this.wishLocChart) {
        this.wishLocChart.destroy();
      }
      this.wishLocChart = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: wishUsers,
          datasets: [{ label: 'Wunschorte', data: wishCounts }]
        },
        options: { responsive: true }
      });
    }

    if (ctx3) {
      if (this.ratioChart) {
        this.ratioChart.destroy();
      }
      this.ratioChart = new Chart(ctx3, {
        type: 'pie',
        data: {
          labels: ['Besucht', 'Wunschliste'],
          datasets: [{ data: [this.stats.total_user_locations, this.stats.total_wish_locations] }]
        },
        options: { responsive: true }
      });
    }
  }

  initLoginChart() {
    if (!this.loginData) return;
    const ctx = (document.getElementById('loginChart') as HTMLCanvasElement)?.getContext('2d');
    if (ctx) {
      if (this.loginChart) {
        this.loginChart.destroy();
      }
      this.loginChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.loginData.dates,
          datasets: [{ label: 'Logins', data: this.loginData.counts as number[] }]
        },
        options: { responsive: true }
      });
    }

  }
}
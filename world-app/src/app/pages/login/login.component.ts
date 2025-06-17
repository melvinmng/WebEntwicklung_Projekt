import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule,HttpClientModule,RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  login() {
    this.http.post('http://localhost:5002/login', {
      username: this.username,
      password: this.password
    }).subscribe({
      next: () => {
        localStorage.setItem('currentUser', this.username);
        this.router.navigate(['/map']);
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Login fehlgeschlagen';
      }
    });
  }
}
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule,HttpClientModule,RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  username = '';
  password = '';
  errorMessage = '';
  successMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  register() {
    this.http.post('http://localhost:5002/register', {
      username: this.username,
      password: this.password
    }).subscribe({
      next: () => {
        this.successMessage = 'Registrierung erfolgreich! Du wirst weitergeleitet...';
        setTimeout(() => this.router.navigate(['/']), 2000);
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Registrierung fehlgeschlagen';
      }
    });
  }
}
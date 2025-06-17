import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-account-management',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './account-management.component.html',
  styleUrl: './account-management.component.css'
})
export class AccountManagementComponent {
username = '';
  newUsername = '';
  newPassword = '';
  prompt = '';

  messageUser = '';
  messagePassword = '';
  messagePrompt = '';

  constructor(private http: HttpClient) {}

  changeUsername() {
    this.http.patch('http://localhost:5002/change-username', {
      username: this.username,
      new_username: this.newUsername
    }).subscribe({
      next: () => this.messageUser = 'Benutzername aktualisiert',
      error: (err) => {
        this.messageUser = err?.error?.error || 'Aktualisierung fehlgeschlagen';
      }
    });
  }

  changePassword() {
    this.http.patch('http://localhost:5002/change-password', {
      username: this.username,
      new_password: this.newPassword
    }).subscribe({
      next: () => this.messagePassword = 'Passwort aktualisiert',
      error: (err) => {
        this.messagePassword = err?.error?.error || 'Aktualisierung fehlgeschlagen';
      }
    });
  }

  savePrompt() {
    this.http.patch('http://localhost:5002/set-prompt', {
      username: this.username,
      prompt: this.prompt
    }).subscribe({
      next: () => this.messagePrompt = 'Prompt gespeichert',
      error: (err) => {
        this.messagePrompt = err?.error?.error || 'Aktualisierung fehlgeschlagen';
      }
    });
  }

}

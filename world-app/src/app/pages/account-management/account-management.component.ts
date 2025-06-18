// account-management.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-account-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    NavbarComponent
  ],
  templateUrl: './account-management.component.html',
  styleUrls: ['./account-management.component.css']
})
export class AccountManagementComponent implements OnInit {
  username = localStorage.getItem('username') || '';

  newUsername = '';
  messageUser = '';

  currentPassword = '';
  newPassword = '';
  messagePassword = '';
  passwordSuccess = false;

  // Hier liegt der Prompt
  prompt = '';
  messagePrompt = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  private loadUserData(): void {
    if (!this.username) return;
    this.http
      .get<any>(`http://localhost:5004/api/db-read/USER/${this.username}`)
      .subscribe({
        next: data => {
          // Nutze data.PROMPT (Großbuchstaben)
          if (data.PROMPT) {
            this.prompt = data.PROMPT;
          }
        },
        error: err => console.error('Fehler beim Laden der Nutzerdaten', err)
      });
  }

  changeUsername(): void {
    this.http
      .patch(`http://localhost:5004/api/db-update/${this.username}`, { USER: this.newUsername })
      .subscribe({
        next: () => {
          this.messageUser = 'Benutzername erfolgreich geändert.';
          localStorage.setItem('username', this.newUsername);
          this.username = this.newUsername;
          this.newUsername = '';
        },
        error: err => {
          console.error(err);
          this.messageUser = 'Fehler beim Ändern des Benutzernamens.';
        }
      });
  }

  changePassword(): void {
    const body = { currentPassword: this.currentPassword, newPassword: this.newPassword };
    this.http
      .post(`http://localhost:5002/change-password`, body)
      .subscribe({
        next: () => {
          this.passwordSuccess = true;
          this.messagePassword = 'Passwort erfolgreich geändert.';
          this.currentPassword = '';
          this.newPassword = '';
        },
        error: err => {
          console.error(err);
          this.passwordSuccess = false;
          this.messagePassword = 'Fehler beim Ändern des Passworts.';
        }
      });
  }

  savePrompt(): void {
    if (!this.username) return;
    // PATCH mit Feld "PROMPT"
    this.http
      .patch(`http://localhost:5004/api/db-update/${this.username}`, { PROMPT: this.prompt })
      .subscribe({
        next: () => {
          this.messagePrompt = 'Prompt erfolgreich gespeichert.';
        },
        error: err => {
          console.error('Fehler beim Speichern des Prompts', err);
          this.messagePrompt = 'Fehler beim Speichern des Prompts.';
        }
      });
  }
}
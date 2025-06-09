import { Component } from '@angular/core';
import { NavbarComponent } from './navbar/navbar.component';
import { AiToolbarComponent } from './ai-toolbar/ai-toolbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavbarComponent, AiToolbarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {}
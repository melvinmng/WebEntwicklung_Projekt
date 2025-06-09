import { Routes } from '@angular/router';
import { LoginComponent } from './app/pages/login/login.component';
import { RegisterComponent } from './app/pages/register/register.component';
import { MapComponent } from './app/pages/map/map.component';
import { FlightsComponent } from './app/pages/flights/flights.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'map', component: MapComponent },
  { path: 'flights', component: FlightsComponent },
  { path: '**', redirectTo: '' }
];
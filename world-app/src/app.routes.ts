import { Routes } from '@angular/router';
import { LoginComponent } from './app/pages/login/login.component';
import { RegisterComponent } from './app/pages/register/register.component';
import { MapComponent } from './app/pages/map/map.component';
import { FlightSearchComponent } from './app/pages/flight-search/flight-search.component';
import { AccountManagementComponent } from './app/pages/account-management/account-management.component';
import { DashboardComponent } from './app/pages/dashboard-management/dashboard-management.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'map', component: MapComponent },
  { path: 'flight-search', component: FlightSearchComponent },
  { path: 'account-management', component: AccountManagementComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: '**', redirectTo: '' }
];
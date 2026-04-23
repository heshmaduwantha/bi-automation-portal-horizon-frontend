import { Routes } from '@angular/router';
import { ReportListComponent } from './components/report-list/report-list.component';
import { AutomationSetupComponent } from './components/automation-setup/automation-setup.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'reports', component: ReportListComponent },
  { path: 'setup', component: AutomationSetupComponent },
  { path: 'dashboard', component: DashboardComponent },
];

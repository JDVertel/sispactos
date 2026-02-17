import { Routes } from '@angular/router';
import { AdminRolesComponent } from './components/admin/admin-roles.component';
import { PactosManagementComponent } from './components/admin/pactos-management.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DashboardPageComponent } from './components/dashboard/dashboard-page.component';
import { LoginComponent } from './components/login/login.component';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'login'
	},
	{
		path: 'login',
		component: LoginComponent
	},
	{
		path: 'dashboard',
		component: DashboardComponent,
		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'home'
			},
			{
				path: 'administracion',
				component: AdminRolesComponent
			},
			{
				path: 'gestion-pactos',
				component: PactosManagementComponent
			},
			{
				path: ':page',
				component: DashboardPageComponent
			}
		]
	},
	{
		path: '**',
		redirectTo: 'login'
	}
];

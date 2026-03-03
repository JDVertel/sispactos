import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { AdminRolesComponent } from './features/admin/admin-roles.component';
import { PactosManagementComponent } from './features/admin/pactos-management.component';
import { ProyectosManagementComponent } from './features/admin/proyectos-management.component';
import { ContratosManagementComponent } from './features/admin/contratos-management.component';

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
				path: 'gestion-proyectos',
				component: ProyectosManagementComponent
			},
			{
				path: 'gestion-contratos',
				component: ContratosManagementComponent
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

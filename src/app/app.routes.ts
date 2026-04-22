import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { AdminRolesComponent } from './features/admin/admin-roles.component';
import { PactosManagementComponent } from './features/admin/pactos-management.component';
import { ProyectosManagementComponent } from './features/admin/proyectos-management.component';
import { ContratosManagementComponent } from './features/admin/contratos-management.component';
import { ConfiguracionActoresComponent } from './features/admin/configuracion-actores.component';
import { PactosTerritorialesComponent } from './features/pactos-territoriales/pactos-territoriales.component';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'dashboard/home'
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
				path: 'configuracion-actores',
				component: ConfiguracionActoresComponent
			},
			{
				path: 'pactos-territoriales',
				component: PactosTerritorialesComponent
			},
			{
				path: ':page',
				component: DashboardPageComponent
			}
		]
	},
	{
		path: '**',
		redirectTo: 'dashboard/home'
	}
];

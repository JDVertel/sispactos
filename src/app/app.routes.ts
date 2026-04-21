import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { AdminRolesComponent } from './features/admin/admin-roles.component';
import { PactosManagementComponent } from './features/admin/pactos-management.component';
import { ProyectosManagementComponent } from './features/admin/proyectos-management.component';
import { ContratosManagementComponent } from './features/admin/contratos-management.component';
import { ConfiguracionActoresComponent } from './features/admin/configuracion-actores.component';
import { PactosTerritorialesComponent } from './features/pactos-territoriales/pactos-territoriales.component';
import { protectedPagesGuard } from './core/guards/protected-pages.guard';
import { validUserSessionGuard } from './core/guards/valid-user-session.guard';

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
				canActivate: [validUserSessionGuard],
				component: AdminRolesComponent
			},
			{
				path: 'gestion-pactos',
				canActivate: [validUserSessionGuard],
				component: PactosManagementComponent
			},
			{
				path: 'gestion-proyectos',
				canActivate: [validUserSessionGuard],
				component: ProyectosManagementComponent
			},
			{
				path: 'gestion-contratos',
				canActivate: [validUserSessionGuard],
				component: ContratosManagementComponent
			},
			{
				path: 'configuracion-actores',
				canActivate: [validUserSessionGuard],
				component: ConfiguracionActoresComponent
			},
			{
				path: 'pactos-territoriales',
				component: PactosTerritorialesComponent
			},
			{
				path: ':page',
				canActivate: [protectedPagesGuard],
				component: DashboardPageComponent
			}
		]
	},
	{
		path: '**',
		redirectTo: 'dashboard/home'
	}
];

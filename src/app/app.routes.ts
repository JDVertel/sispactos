import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { AdminRolesComponent } from './features/admin/admin-roles.component';
import { PactosManagementComponent } from './features/admin/pactos-management.component';
import { ProyectosManagementComponent } from './features/admin/proyectos-management.component';
import { ProyectoFinancieraComponent } from './features/admin/proyecto-financiera.component';
import { ContratosManagementComponent } from './features/admin/contratos-management.component';
import { ConfiguracionActoresComponent } from './features/admin/configuracion-actores.component';
import { PactosTerritorialesComponent } from './features/pactos-territoriales/pactos-territoriales.component';
import { dashboardAccessGuard } from './core/guards/dashboard-access.guard';

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
        component: AdminRolesComponent,
        canActivate: [dashboardAccessGuard]
      },
      {
        path: 'gestion-pactos',
        component: PactosManagementComponent,
        canActivate: [dashboardAccessGuard]
      },
      {
        path: 'gestion-proyectos',
        component: ProyectosManagementComponent,
        canActivate: [dashboardAccessGuard]
      },
      {
        path: 'gestion-proyectos/:proyectoId/financiera',
        component: ProyectoFinancieraComponent,
        canActivate: [dashboardAccessGuard]
      },
      {
        path: 'gestion-contratos',
        component: ContratosManagementComponent,
        canActivate: [dashboardAccessGuard]
      },
      {
        path: 'configuracion-actores',
        component: ConfiguracionActoresComponent,
        canActivate: [dashboardAccessGuard]
      },
      {
        path: 'pactos-territoriales',
        component: PactosTerritorialesComponent
      },
      {
        path: ':page',
        component: DashboardPageComponent,
        canActivate: [dashboardAccessGuard]
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard/home'
  }
];

import { Component } from '@angular/core';
import { provideContratosDataScope } from '../../core/contratos/contratos-scope';
import { ContratosManagementComponent } from './contratos-management.component';

/** Módulo de contratos para gestión externa (misma UI, datos aislados en localStorage). */
@Component({
  selector: 'app-gestion-externa-contratos',
  standalone: true,
  imports: [ContratosManagementComponent],
  providers: provideContratosDataScope('externa'),
  template: `
    <app-contratos-management
      tituloPagina="Gestión externa · Contratos"
      modalIdPrefix="externa-"
    />
  `
})
export class GestionExternaContratosComponent {}

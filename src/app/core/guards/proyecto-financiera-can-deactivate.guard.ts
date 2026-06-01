import { CanDeactivateFn } from '@angular/router';
import { ProyectoFinancieraComponent } from '../../features/admin/proyecto-financiera.component';

export const proyectoFinancieraCanDeactivateGuard: CanDeactivateFn<ProyectoFinancieraComponent> = (
  component
) => component.confirmarNavegacionFuera();

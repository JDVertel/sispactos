import { InjectionToken, Provider } from '@angular/core';
import { AvancesContratoService } from '../services/avances-contrato.service';
import { ContratosService } from '../services/contratos.service';
import { DesembolsosProgramadosService } from '../services/desembolsos-programados.service';
import { ModificacionesContractualesService } from '../services/modificaciones-contractuales.service';
import { SeguimientoTecnicoContratoService } from '../services/seguimiento-tecnico-contrato.service';

export type ContratosDataScope = 'interno' | 'externa';

export const CONTRATOS_DATA_SCOPE = new InjectionToken<ContratosDataScope>('CONTRATOS_DATA_SCOPE');

/** Clave de localStorage según ámbito (interno vs gestión externa). */
export function contratosStorageKey(baseKey: string, scope?: ContratosDataScope | null): string {
  return scope === 'externa' ? `${baseKey}.externa` : baseKey;
}

/** Servicios del módulo contratos con datos aislados por ámbito. */
export function provideContratosDataScope(scope: ContratosDataScope): Provider[] {
  return [
    { provide: CONTRATOS_DATA_SCOPE, useValue: scope },
    ContratosService,
    ModificacionesContractualesService,
    DesembolsosProgramadosService,
    AvancesContratoService,
    SeguimientoTecnicoContratoService
  ];
}

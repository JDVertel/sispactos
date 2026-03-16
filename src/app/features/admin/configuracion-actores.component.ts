import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type TipoActor = 'Contratista' | 'Contratante' | 'Supervisor';

interface ActorConfiguracion {
  id: number;
  tipo: TipoActor;
  nombre: string;
  identificacion: string;
  correo: string;
  telefono: string;
  estado: 'Activo' | 'Inactivo';
}

@Component({
  selector: 'app-configuracion-actores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion-actores.component.html',
  styleUrl: './configuracion-actores.component.css'
})
export class ConfiguracionActoresComponent {
  // Tipos de actor permitidos en el formulario.
  tiposActor: TipoActor[] = ['Contratista', 'Contratante', 'Supervisor'];
  // Filtro para mostrar actores por tipo.
  filtroTipo = '';

  // Lista de actores registrados (datos de ejemplo/base).
  actores: ActorConfiguracion[] = [
    {
      id: 1,
      tipo: 'Contratista',
      nombre: 'Consorcio Vias del Norte',
      identificacion: '900123001',
      correo: 'contacto@viasnorte.co',
      telefono: '3001112233',
      estado: 'Activo'
    },
    {
      id: 2,
      tipo: 'Contratante',
      nombre: 'DNP Territorial',
      identificacion: '899999001',
      correo: 'territorial@dnp.gov.co',
      telefono: '3209876510',
      estado: 'Activo'
    },
    {
      id: 3,
      tipo: 'Supervisor',
      nombre: 'Laura Pinzon',
      identificacion: '52899011',
      correo: 'laura.pinzon@dnp.gov.co',
      telefono: '3018884455',
      estado: 'Activo'
    },
    {
      id: 4,
      tipo: 'Contratista',
      nombre: 'Union Temporal Delta',
      identificacion: '901552880',
      correo: 'utdelta@correo.com',
      telefono: '3154567890',
      estado: 'Inactivo'
    }
  ];

  nuevoActor: Omit<ActorConfiguracion, 'id'> = {
    tipo: 'Contratista',
    nombre: '',
    identificacion: '',
    correo: '',
    telefono: '',
    estado: 'Activo'
  };

  // Retorna actores según el filtro seleccionado.
  get actoresFiltrados(): ActorConfiguracion[] {
    if (!this.filtroTipo) {
      return this.actores;
    }
    return this.actores.filter((actor) => actor.tipo === this.filtroTipo);
  }

  // Agrega un actor nuevo cuando el formulario está completo.
  agregarActor(): void {
    if (
      !this.nuevoActor.nombre.trim() ||
      !this.nuevoActor.identificacion.trim() ||
      !this.nuevoActor.correo.trim() ||
      !this.nuevoActor.telefono.trim()
    ) {
      return;
    }

    const nextId = this.actores.length ? Math.max(...this.actores.map((a) => a.id)) + 1 : 1;

    this.actores = [
      ...this.actores,
      {
        id: nextId,
        tipo: this.nuevoActor.tipo,
        nombre: this.nuevoActor.nombre.trim(),
        identificacion: this.nuevoActor.identificacion.trim(),
        correo: this.nuevoActor.correo.trim(),
        telefono: this.nuevoActor.telefono.trim(),
        estado: this.nuevoActor.estado
      }
    ];

    this.resetFormulario();
  }

  // Limpia el formulario de registro para volver a empezar.
  resetFormulario(): void {
    this.nuevoActor = {
      tipo: 'Contratista',
      nombre: '',
      identificacion: '',
      correo: '',
      telefono: '',
      estado: 'Activo'
    };
  }
}

# ðŸ“ Arquitectura MVC - SISPACTOS

## ðŸ“‹ Estructura del Proyecto

Este proyecto sigue una arquitectura **MVC (Model-View-Controller)** adaptada para Angular, organizando el código de forma clara y mantenible.

```
src/app/
â”œâ”€â”€ ðŸ“¦ models/                    # [M] MODELO - Entidades de Datos
â”œâ”€â”€ ðŸ‘ï¸  views/                     # [V] VISTA - Templates HTML
â”œâ”€â”€ ðŸŽ® controllers/               # [C] CONTROLADOR - Lógica
â”œâ”€â”€ ðŸŽ¨ styles/                    # Estilos CSS organizados
â”œâ”€â”€ âš™ï¸  config/                    # Configuración y Rutas
â””â”€â”€ ðŸ”„ shared/                    # Recursos compartidos
```

---

## ðŸ—‚ï¸ Descripción de Carpetas

### ðŸ“¦ **models/** - MODELO
**Propósito:** Definir las estructuras de datos y tipos de la aplicación.

**Contiene:**
- `contrato.model.ts` - Modelo de Contratos
- `pacto.model.ts` - Modelo de Pactos
- `proyecto.model.ts` - Modelo de Proyectos
- `role.model.ts` - Modelo de Roles
- `user.model.ts` - Modelo de Usuarios
- `index.ts` - Exportaciones centralizadas

**Ejemplo:**
```typescript
export interface Pacto {
  id: string;
  nombre: string;
  descripcion: string;
  // ...
}
```

---

### ðŸ‘ï¸ **views/** - VISTA
**Propósito:** Almacenar todos los templates HTML separados por módulos.

**Estructura:**
```
views/
â”œâ”€â”€ admin/               # Vistas de administración
â”‚   â”œâ”€â”€ admin-roles.component.html
â”‚   â”œâ”€â”€ pactos-management.component.html
â”‚   â”œâ”€â”€ proyectos-management.component.html
â”‚   â””â”€â”€ contratos-management.component.html
â”œâ”€â”€ auth/                # Vistas de autenticación
â”‚   â””â”€â”€ login.component.html
â”œâ”€â”€ dashboard/           # Vistas del dashboard
â”‚   â”œâ”€â”€ dashboard.component.html
â”‚   â””â”€â”€ dashboard-page.component.html
â””â”€â”€ shared/              # Vistas compartidas
    â””â”€â”€ sidebar.component.html
```

**Ventajas:**
- âœ… Separación clara de presentación y lógica
- âœ… Fácil localizar y editar templates
- âœ… Mejor organización visual del proyecto

---

### ðŸŽ® **controllers/** - CONTROLADOR
**Propósito:** Contener toda la lógica de negocio, componentes y servicios.

**Estructura:**
```
controllers/
â”œâ”€â”€ components/          # Componentes TypeScript
â”‚   â”œâ”€â”€ admin/          # Lógica de administración
â”‚   â”œâ”€â”€ auth/           # Lógica de autenticación
â”‚   â”œâ”€â”€ dashboard/      # Lógica del dashboard
â”‚   â””â”€â”€ shared/         # Componentes compartidos
â””â”€â”€ services/           # Servicios de negocio
    â”œâ”€â”€ auth.service.ts
    â”œâ”€â”€ pactos.service.ts
    â”œâ”€â”€ proyectos.service.ts
    â”œâ”€â”€ contratos.service.ts
    â”œâ”€â”€ roles-users.service.ts
    â””â”€â”€ dashboard.service.ts
```

**Responsabilidades:**
- ðŸ”¹ Manejar eventos del usuario
- ðŸ”¹ Procesar lógica de negocio
- ðŸ”¹ Comunicarse con servicios
- ðŸ”¹ Gestionar el estado de los componentes

---

### ðŸŽ¨ **styles/**
**Propósito:** Almacenar todos los archivos CSS organizados por módulo.

**Estructura:**
```
styles/
â”œâ”€â”€ admin/
â”œâ”€â”€ auth/
â”œâ”€â”€ dashboard/
â””â”€â”€ shared/
```

**Beneficios:**
- âœ… Estilos organizados por feature
- âœ… Evita conflictos de nombres
- âœ… Facilita el mantenimiento

---

### âš™ï¸ **config/**
**Propósito:** Centralizar la configuración de la aplicación.

**Contiene:**
- `app.config.ts` - Configuración principal de Angular
- `app.routes.ts` - Definición de rutas de navegación

**Ejemplo de uso:**
```typescript
// app.routes.ts
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  // ...
];
```

---

### ðŸ”„ **shared/**
**Propósito:** Recursos compartidos entre módulos (pipes, directives, utils).

**Uso futuro:**
- Directivas personalizadas
- Pipes de transformación
- Utilidades comunes
- Guards de navegación

---

## ðŸ”— Mapeo MVC en Angular

| Capa MVC | En este Proyecto | Ubicación | Responsabilidad |
|----------|------------------|-----------|-----------------|
| **Model** | Interfaces/Clases | `/models` | Estructura de datos |
| **View** | Templates HTML | `/views` | Presentación visual |
| **Controller** | Components + Services | `/controllers` | Lógica de negocio |

---

## ðŸ“ Convenciones de Código

### Imports de Modelos
```typescript
// Desde controllers/components/admin/
import { Pacto, Proyecto } from '../../../models';
```

### Imports de Servicios
```typescript
// Desde controllers/components/admin/
import { PactosService } from '../../services/pactos.service';
```

### Rutas de Templates y Estilos
```typescript
@Component({
  selector: 'app-admin-roles',
  templateUrl: '../../../views/admin/admin-roles.component.html',
  styleUrl: '../../../styles/admin/admin-roles.component.css'
})
```

---

## âœ… Ventajas de esta Arquitectura

1. **Separación de Responsabilidades**
   - Cada carpeta tiene un propósito único y claro

2. **Mantenibilidad**
   - Fácil localizar y modificar código
   - Cambios en una capa no afectan a otras

3. **Escalabilidad**
   - Estructura preparada para crecer
   - Fácil añadir nuevos módulos

4. **Trabajo en Equipo**
   - Diferentes desarrolladores pueden trabajar en diferentes capas
   - Menos conflictos en control de versiones

5. **Testing**
   - Fácil crear tests unitarios para cada componente
   - Servicios y modelos fácilmente testeables

6. **Organización Visual**
   - Estructura clara y autodocumentada
   - Nuevos desarrolladores entienden rápidamente el proyecto

---

## ðŸš€ Próximos Pasos Recomendados

- [ ] Añadir Guards de autenticación en `/config`
- [ ] Crear Interceptors HTTP en `/controllers/services`
- [ ] Implementar Pipes personalizados en `/shared`
- [ ] Añadir Tests unitarios
- [ ] Documentar servicios con JSDoc

---

## ðŸ“ž Notas para Desarrolladores

- **NUNCA** mezclar lógica de negocio en los templates HTML
- **SIEMPRE** usar servicios para comunicación con APIs
- **MANTENER** los modelos simples (solo definiciones de tipos)
- **USAR** el index.ts de models para exportaciones centralizadas
- **SEGUIR** las convenciones de nombres de Angular

---

**Última actualización:** 27 de febrero de 2026  
**Versión de Angular:** 19.2.0

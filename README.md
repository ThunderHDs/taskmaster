# TaskMaster - Aplicación de Gestión de Tareas

## Descripción General

TaskMaster es una aplicación web completa de gestión de tareas desarrollada con Next.js 13+ (App Router), React, TypeScript y Prisma. La aplicación permite a los usuarios crear, organizar, filtrar y gestionar tareas de manera eficiente con funcionalidades avanzadas como subtareas, etiquetas, grupos, fechas límite y un sistema de prioridades.

## Arquitectura del Proyecto

### Stack Tecnológico

- **Frontend**: Next.js 13+ con App Router, React 18, TypeScript
- **Backend**: Next.js API Routes (App Router)
- **Base de Datos**: SQLite con Prisma ORM
- **Estilos**: Tailwind CSS
- **Componentes UI**: Shadcn/ui
- **Validación**: Zod
- **Iconos**: Lucide React

### Estructura de Directorios

```
taskmaster-original/
├── src/
│   ├── app/                    # App Router de Next.js 13+
│   │   ├── api/                # Rutas de API
│   │   │   ├── conflicts/      # API para detección de conflictos
│   │   │   ├── groups/         # API para gestión de grupos
│   │   │   ├── tags/           # API para gestión de etiquetas
│   │   │   └── tasks/          # API principal de tareas
│   │   ├── calendar/           # Página del calendario
│   │   ├── layout.tsx          # Layout principal
│   │   └── page.tsx            # Página principal
│   ├── components/             # Componentes React
│   │   ├── ui/                 # Componentes base de Shadcn/ui
│   │   ├── TaskList.tsx        # Lista principal de tareas
│   │   ├── TaskForm.tsx        # Formulario de creación/edición
│   │   ├── TaskHistory.tsx     # Historial de actividades
│   │   ├── TagManager.tsx      # Gestión de etiquetas
│   │   └── DateRangePicker.tsx # Selector de fechas
│   ├── lib/                    # Utilidades y configuraciones
│   └── hooks/                  # Custom hooks de React
├── prisma/
│   └── schema.prisma           # Esquema de base de datos
├── public/                     # Archivos estáticos
└── docs/                       # Documentación adicional
```

## Funcionalidades Principales

### 1. Gestión de Tareas
- **Creación y Edición**: Formulario completo con título, descripción, prioridad, fechas
- **Estados**: Pendiente, En progreso, Completada
- **Prioridades**: Baja, Media, Alta, Urgente
- **Fechas**: Fecha de inicio y fecha límite
- **Subtareas**: Jerarquía de tareas padre-hijo

### 2. Sistema de Organización
- **Etiquetas (Tags)**: Categorización con colores personalizables
- **Grupos**: Agrupación de tareas por proyectos o categorías
- **Filtros Avanzados**: Por estado, prioridad, etiquetas, grupos, fechas

### 3. Interfaz de Usuario
- **Vista de Lista**: Lista detallada con todas las funcionalidades
- **Vista de Calendario**: Visualización temporal de tareas
- **Vista Agrupada**: Organización por grupos de tareas
- **Edición Inline**: Modificación rápida sin formularios
- **Operaciones Masivas**: Selección múltiple para edición/eliminación

### 4. Funcionalidades Avanzadas
- **Historial de Actividades**: Registro de cambios y acciones
- **Sistema de Deshacer**: Recuperación de acciones recientes
- **Detección de Conflictos**: Prevención de solapamientos de fechas
- **Búsqueda y Filtrado**: Múltiples criterios de búsqueda
- **Responsive Design**: Adaptable a dispositivos móviles

## Esquema de Base de Datos

### Modelos Principales

#### Task (Tarea)
```prisma
model Task {
  id              String    @id @default(cuid())
  title           String    // Título de la tarea
  description     String?   // Descripción opcional
  completed       Boolean   @default(false)
  priority        Priority  @default(MEDIUM)
  startDate       DateTime? // Fecha de inicio
  dueDate         DateTime? // Fecha límite
  originalDueDate DateTime? // Fecha límite original
  parentId        String?   // ID de tarea padre (subtareas)
  groupId         String?   // ID del grupo
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relaciones
  parent          Task?     @relation("TaskSubtasks", fields: [parentId], references: [id])
  subtasks        Task[]    @relation("TaskSubtasks")
  group           TaskGroup? @relation(fields: [groupId], references: [id])
  tags            TaskTag[]
  activityLogs    ActivityLog[]
}
```

#### TaskGroup (Grupo de Tareas)
```prisma
model TaskGroup {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  color       String   @default("#3B82F6")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  tasks       Task[]
}
```

#### Tag (Etiqueta)
```prisma
model Tag {
  id        String    @id @default(cuid())
  name      String    @unique
  color     String    @default("#10B981")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  tasks     TaskTag[]
}
```

#### ActivityLog (Registro de Actividades)
```prisma
model ActivityLog {
  id        String   @id @default(cuid())
  taskId    String
  action    String   // Tipo de acción realizada
  details   String?  // Detalles adicionales
  createdAt DateTime @default(now())
  
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
}
```

## API Endpoints

### Tareas (`/api/tasks`)
- `GET /api/tasks` - Obtener tareas con filtros
- `POST /api/tasks` - Crear nueva tarea
- `PUT /api/tasks/[id]` - Actualizar tarea
- `DELETE /api/tasks/[id]` - Eliminar tarea
- `POST /api/tasks/bulk` - Operaciones masivas

### Grupos (`/api/groups`)
- `GET /api/groups` - Obtener todos los grupos
- `POST /api/groups` - Crear nuevo grupo
- `PUT /api/groups/[id]` - Actualizar grupo
- `DELETE /api/groups/[id]` - Eliminar grupo

### Etiquetas (`/api/tags`)
- `GET /api/tags` - Obtener todas las etiquetas
- `POST /api/tags` - Crear nueva etiqueta
- `PUT /api/tags/[id]` - Actualizar etiqueta
- `DELETE /api/tags/[id]` - Eliminar etiqueta

### Conflictos (`/api/conflicts`)
- `POST /api/conflicts/check` - Verificar conflictos de fechas

## Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- npm o yarn

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd taskmaster-original
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar la base de datos**
```bash
npx prisma generate
npx prisma db push
```

4. **Ejecutar en modo desarrollo**
```bash
npm run dev
```

5. **Abrir Prisma Studio (opcional)**
```bash
npx prisma studio
```

### Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Construcción para producción
- `npm run start` - Servidor de producción
- `npm run lint` - Linting del código
- `npx prisma studio` - Interfaz de base de datos
- `npx prisma generate` - Generar cliente de Prisma
- `npx prisma db push` - Sincronizar esquema con BD

## Características Técnicas

### Gestión de Estado
- **Estado Local**: React hooks (useState, useEffect)
- **Optimistic Updates**: Actualizaciones inmediatas en UI
- **Error Handling**: Manejo robusto de errores con rollback

### Performance
- **Server Components**: Renderizado del lado del servidor
- **Client Components**: Interactividad del lado del cliente
- **Lazy Loading**: Carga diferida de componentes
- **Memoización**: Optimización de re-renders

### Seguridad
- **Validación**: Zod para validación de datos
- **Sanitización**: Limpieza de inputs del usuario
- **Error Boundaries**: Manejo de errores en componentes

### Accesibilidad
- **Keyboard Navigation**: Navegación por teclado
- **ARIA Labels**: Etiquetas para lectores de pantalla
- **Focus Management**: Gestión del foco
- **Color Contrast**: Contraste adecuado de colores

## Contribución

Para contribuir al proyecto:

1. Fork del repositorio
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Soporte

Para reportar bugs o solicitar nuevas funcionalidades, por favor crear un issue en el repositorio del proyecto.

---

## 🎨 Iconos Lucide React

Este proyecto utiliza la librería **Lucide React** para los iconos. Lucide React es una librería de iconos moderna, ligera y altamente personalizable que ofrece más de 1,000 iconos vectoriales hermosos y consistentes.

### Características principales:
- **Ligera**: Solo incluye los iconos que realmente usas
- **Personalizable**: Fácil de personalizar tamaño, color y estilo
- **Consistente**: Diseño uniforme en todos los iconos
- **Accesible**: Optimizada para accesibilidad
- **Tree-shakeable**: Optimización automática del bundle

### Instalación:
```bash
npm install lucide-react
```

### Uso básico:
```jsx
import { Heart, Star, User } from 'lucide-react';

function MyComponent() {
  return (
    <div>
      <Heart size={24} color="red" />
      <Star size={20} />
      <User className="w-6 h-6 text-blue-500" />
    </div>
  );
}
```

### Iconos utilizados en TaskMaster:
- **Plus**: Agregar nuevas tareas
- **Edit**: Editar tareas existentes
- **Trash**: Eliminar tareas
- **Check**: Marcar como completado
- **Calendar**: Fechas y calendario
- **Clock**: Tiempo y recordatorios
- **Tag**: Etiquetas y categorías
- **Filter**: Filtros y búsqueda
- **Settings**: Configuración
- **MoreVertical**: Menús contextuales
- Y muchos más...

Para más información, visita: [https://lucide.dev/](https://lucide.dev/)

## 🎨 Guía de Estilos Visuales

### Sistema de Colores

#### Paleta Principal (Tailwind CSS)
- **Background**: `bg-background` (blanco/gris muy claro)
- **Foreground**: `text-foreground` (texto principal)
- **Primary**: `bg-primary` (azul principal)
- **Secondary**: `bg-secondary` (gris secundario)
- **Muted**: `text-muted-foreground` (texto secundario)
- **Border**: `border-border` (bordes sutiles)
- **Input**: `border-input` (bordes de campos)
- **Ring**: `ring-ring` (anillos de foco)

#### Colores de Estado
- **Éxito**: `bg-green-100 text-green-800` (progreso, completado)
- **Advertencia**: `text-orange-600` (último día)
- **Error**: `text-red-600` (vencido, eliminar)
- **Info**: `bg-blue-50 border-blue-200 text-blue-900` (selección múltiple)

#### Colores de Prioridad
- **LOW**: `text-green-600`
- **MEDIUM**: `text-yellow-600`
- **HIGH**: `text-orange-600`
- **URGENT**: `text-red-600`

### Tipografía

#### Fuentes
- **Principal**: Geist Sans (`--font-geist-sans`)
- **Monospace**: Geist Mono (`--font-geist-mono`)
- **Antialiasing**: `antialiased` aplicado globalmente

#### Jerarquía de Texto
- **Títulos principales**: `text-lg font-semibold`
- **Títulos de tareas**: `text-sm font-medium`
- **Descripción**: `text-sm text-gray-600`
- **Metadatos**: `text-xs text-gray-500`
- **Etiquetas**: `text-xs font-medium`

### Componentes de UI

#### Botones
```css
/* Botón principal */
.btn-primary {
  @apply bg-primary text-primary-foreground hover:bg-primary/90;
  @apply h-10 px-4 py-2 rounded-md text-sm font-medium;
  @apply transition-colors focus-visible:ring-2 focus-visible:ring-ring;
}

/* Botón destructivo */
.btn-destructive {
  @apply bg-red-600 text-white hover:bg-red-700;
  @apply disabled:bg-gray-300 disabled:cursor-not-allowed;
}

/* Botón ghost */
.btn-ghost {
  @apply hover:bg-accent hover:text-accent-foreground;
  @apply p-1 rounded transition-colors;
}
```

#### Inputs
```css
.input-base {
  @apply flex h-10 w-full rounded-md border border-input;
  @apply bg-background px-3 py-2 text-base;
  @apply focus-visible:outline-none focus-visible:ring-2;
  @apply focus-visible:ring-ring focus-visible:ring-offset-2;
  @apply disabled:cursor-not-allowed disabled:opacity-50;
}
```

### Layouts y Espaciado

#### Contenedores
- **Espaciado principal**: `space-y-4` (16px vertical)
- **Espaciado de grupos**: `space-y-6` (24px vertical)
- **Padding de tarjetas**: `p-4` (16px)
- **Padding de encabezados**: `px-4 py-3` (16px horizontal, 12px vertical)

#### Tarjetas de Tareas
```css
.task-card {
  @apply border border-gray-200 rounded-lg;
  @apply hover:shadow-md transition-shadow;
  @apply bg-white overflow-visible;
}

.task-card.completed {
  @apply bg-gray-50 opacity-75;
}

.task-card.selected {
  @apply ring-2 ring-blue-500 ring-opacity-50;
}
```

### Estados Interactivos

#### Hover Effects
- **Botones**: `hover:bg-gray-100` (fondo gris claro)
- **Tarjetas**: `hover:shadow-md` (sombra sutil)
- **Enlaces**: `hover:text-blue-800` (azul más oscuro)
- **Títulos editables**: `hover:bg-gray-100 rounded px-1`

#### Focus States
- **Anillo de foco**: `focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`
- **Outline**: `focus-visible:outline-none`
- **Offset**: `focus:ring-offset-2`

### Animaciones

#### Keyframes Personalizados
```css
@keyframes progressShimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}

@keyframes progressFadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

#### Transiciones
- **Colores**: `transition-colors` (150ms)
- **Sombras**: `transition-shadow` (150ms)
- **Todas**: `transition-all duration-500` (para progreso)
- **Cubic-bezier**: `cubic-bezier(0.4, 0, 0.2, 1)` (suave)

### Elementos Específicos

#### Etiquetas (Tags)
```css
.tag {
  @apply inline-flex items-center px-2 py-1 rounded-full;
  @apply text-xs font-medium text-white;
  /* Color dinámico via style={{ backgroundColor: tag.color }} */
}
```

#### Indicadores de Grupo
```css
.group-indicator {
  @apply inline-flex items-center px-2 py-1 rounded-full;
  @apply text-xs font-medium border;
  /* Colores dinámicos basados en group.color */
}
```

#### Barra de Selección Múltiple
```css
.multi-select-bar {
  @apply bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4;
}
```

#### Menús Contextuales
```css
.context-menu {
  @apply absolute right-0 top-8 bg-white border border-gray-200;
  @apply rounded-md shadow-lg z-50 min-w-[100px];
}

.context-menu-item {
  @apply w-full px-3 py-2 text-left text-sm;
  @apply hover:bg-gray-100 transition-colors;
}
```

### Responsive Design
- **Texto**: `text-base md:text-sm` (más pequeño en desktop)
- **Breakpoints**: Utiliza los breakpoints estándar de Tailwind
- **Mobile-first**: Diseño optimizado para móviles primero

### Modo Oscuro
- **Configurado**: `darkMode: ["class"]` en tailwind.config.ts
- **Implementación**: Pendiente (estructura preparada)

### Accesibilidad
- **Focus visible**: Anillos de foco claros
- **Contraste**: Colores con suficiente contraste
- **Semántica**: Uso apropiado de elementos HTML
- **ARIA**: Labels y roles donde sea necesario

---

**TaskMaster** - Una solución completa para la gestión eficiente de tareas y proyectos.
# TaskMaster - Documentación Completa para Reconstrucción

## 1. Resumen Ejecutivo

TaskMaster es una aplicación web de gestión de tareas desarrollada con Next.js 15, que permite a los usuarios crear, organizar y gestionar tareas con funcionalidades avanzadas como subtareas anidadas, etiquetas personalizables, fechas programadas, actividades/comentarios y vista de calendario. La aplicación utiliza una arquitectura moderna con Prisma ORM, SQLite como base de datos, y un sistema de autenticación con NextAuth.

## 2. Funcionalidades Principales

### 2.1 Gestión de Tareas
- **Creación de tareas**: Título, descripción opcional, rango de fechas (desde/hasta)
- **Subtareas anidadas**: Hasta 3 niveles de anidación (tarea principal → subtarea → sub-subtarea)
- **Estados de completado**: Checkbox para marcar tareas como completadas
- **Edición en línea**: Modificación directa de título, descripción y fechas
- **Eliminación**: Borrado de tareas con confirmación
- **Progreso automático**: Las tareas padre muestran progreso basado en subtareas completadas

### 2.2 Sistema de Etiquetas (Tags)
- **Etiquetas personalizables**: Creación con nombre y color personalizado
- **Asignación múltiple**: Una tarea puede tener múltiples etiquetas
- **Gestión completa**: Crear, editar, eliminar etiquetas
- **Colores predefinidos**: Paleta de colores para categorización visual
- **Etiquetas iniciales**: Marketing (rojo), Development (azul), Design (naranja), Personal (púrpura)

### 2.3 Sistema de Fechas y Programación
- **Rangos de fechas**: Fecha de inicio y fecha de finalización
- **Validación de conflictos**: Las subtareas no pueden exceder las fechas de la tarea padre
- **Vista de calendario**: Visualización mensual con tareas distribuidas por días
- **Indicadores visuales**: Tareas que abarcan múltiples días se muestran como barras continuas

### 2.4 Sistema de Actividades
- **Comentarios**: Los usuarios pueden agregar comentarios a cualquier tarea
- **Logs automáticos**: Registro automático de creación, modificación y completado de tareas
- **Historial temporal**: Marca de tiempo para cada actividad
- **Vista expandible**: Panel colapsible para mostrar/ocultar actividades

### 2.5 Vistas y Filtros
- **Vista Lista**: Vista principal con tareas organizadas jerárquicamente
- **Vista Calendario**: Calendario mensual con distribución de tareas por fechas
- **Filtros**: Todas las tareas, Solo completadas, Solo pendientes
- **Ordenamiento**: Ascendente/descendente por fecha de creación
- **Modos de vista**: Compacto y detallado

### 2.6 Interfaz de Usuario
- **Diseño responsivo**: Adaptable a desktop y móvil
- **Tema claro/oscuro**: Soporte completo para ambos temas
- **Animaciones suaves**: Transiciones y efectos visuales con Tailwind CSS
- **Componentes modernos**: Basado en Radix UI y shadcn/ui

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico

**Frontend:**
- Next.js 15.3.3 (App Router)
- React 18.3.1
- TypeScript 5
- Tailwind CSS 3.4.1
- Radix UI (componentes base)
- shadcn/ui (sistema de componentes)
- Lucide React (iconos)
- date-fns (manejo de fechas)
- React Hook Form + Zod (formularios y validación)

**Backend:**
- Next.js API Routes
- Prisma ORM 5.7.1
- SQLite (base de datos)
- NextAuth 4.24.5 (autenticación)
- bcryptjs (hash de contraseñas)

**Herramientas de Desarrollo:**
- ESLint + TypeScript
- Turbopack (bundler de desarrollo)
- PostCSS

### 3.2 Estructura del Proyecto

```
src/
├── app/
│   ├── api/                 # API Routes
│   │   ├── auth/            # Autenticación
│   │   ├── tasks/           # CRUD de tareas
│   │   └── tags/            # CRUD de etiquetas
│   ├── globals.css          # Estilos globales
│   ├── layout.tsx           # Layout principal
│   └── page.tsx             # Página de inicio
├── components/
│   ├── ui/                  # Componentes base (shadcn/ui)
│   ├── TaskPage.tsx         # Componente principal
│   ├── TaskItem.tsx         # Componente de tarea individual
│   ├── CalendarView.tsx     # Vista de calendario
│   ├── Header.tsx           # Cabecera de la aplicación
│   └── providers.tsx        # Proveedores de contexto
├── hooks/
│   ├── useAuth.tsx          # Hook de autenticación
│   ├── useFetch.ts          # Hook para peticiones HTTP
│   └── use-toast.ts         # Hook para notificaciones
└── lib/
    ├── auth.ts              # Configuración NextAuth
    ├── prisma.ts            # Cliente Prisma
    ├── types.ts             # Tipos TypeScript
    └── utils.ts             # Utilidades
```

### 3.3 Base de Datos (Prisma Schema)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  tasks     Task[]
  tags      Tag[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Task {
  id           String     @id @default(cuid())
  title        String
  description  String?
  dateFrom     DateTime?
  dateTo       DateTime?
  completed    Boolean    @default(false)
  nestingLevel Int        @default(0)
  userId       String
  parentId     String?
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent       Task?      @relation("TaskSubtasks", fields: [parentId], references: [id], onDelete: Cascade)
  subtasks     Task[]     @relation("TaskSubtasks")
  activities   Activity[]
  taskTags     TaskTag[]
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

model Activity {
  id        String   @id @default(cuid())
  type      String   // 'comment' | 'log'
  content   String
  timestamp DateTime @default(now())
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

model Tag {
  id       String    @id @default(cuid())
  label    String
  color    String
  userId   String
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  taskTags TaskTag[]
}

model TaskTag {
  taskId String
  tagId  String
  task   Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([taskId, tagId])
}
```

## 4. APIs y Endpoints

### 4.1 Tareas (/api/tasks)

**GET /api/tasks**
- Obtiene todas las tareas del usuario autenticado
- Incluye subtareas anidadas, actividades y etiquetas
- Respuesta: Array de tareas con estructura jerárquica

**POST /api/tasks**
- Crea nueva tarea
- Parámetros: title, description?, dateRange?, parentId?, tags?
- Validaciones: título requerido, límite de anidación, conflictos de fechas

**PUT /api/tasks/[id]**
- Actualiza tarea existente
- Parámetros: title?, description?, dateRange?, completed?, tags?
- Incluye validaciones de fechas y actualización de etiquetas

**DELETE /api/tasks/[id]**
- Elimina tarea y todas sus subtareas
- Eliminación en cascada automática

### 4.2 Actividades (/api/tasks/[id]/activities)

**GET /api/tasks/[id]/activities**
- Obtiene todas las actividades de una tarea
- Ordenadas por timestamp descendente

**POST /api/tasks/[id]/activities**
- Crea nueva actividad (comentario o log)
- Parámetros: type ('comment' | 'log'), content

### 4.3 Etiquetas (/api/tags)

**GET /api/tags**
- Obtiene todas las etiquetas del usuario
- Incluye relaciones con tareas

**POST /api/tags**
- Crea nueva etiqueta
- Parámetros: label, color?
- Validación: etiqueta única por usuario

**PUT /api/tags/[id]**
- Actualiza etiqueta existente
- Parámetros: label?, color?

**DELETE /api/tags/[id]**
- Elimina etiqueta y sus relaciones

### 4.4 Autenticación (/api/auth)

**POST /api/auth/register**
- Registro de nuevo usuario
- Parámetros: email, password, name?

**NextAuth endpoints**
- /api/auth/[...nextauth] - Manejo completo de autenticación
- /api/auth/session - Obtiene sesión actual

## 5. Diseño Visual y Estilo

### 5.1 Sistema de Colores

**Tema Claro:**
```css
--background: 240 100% 99%;        /* Blanco casi puro */
--foreground: 240 10% 3.9%;        /* Negro suave */
--primary: 282 100% 41%;           /* Púrpura vibrante */
--primary-foreground: 0 0% 98%;    /* Blanco */
--secondary: 240 4.8% 95.9%;       /* Gris muy claro */
--muted: 240 4.8% 95.9%;           /* Gris claro */
--accent: 240 67% 97%;             /* Azul muy claro */
--destructive: 0 84.2% 60.2%;      /* Rojo */
--success: 142 71% 45%;            /* Verde */
--border: 240 5.9% 90%;            /* Gris para bordes */
```

**Tema Oscuro:**
```css
--background: 240 10% 3.9%;        /* Negro suave */
--foreground: 0 0% 98%;            /* Blanco */
--primary: 282 100% 61%;           /* Púrpura más claro */
--secondary: 240 3.7% 15.9%;       /* Gris oscuro */
--muted: 240 3.7% 15.9%;           /* Gris oscuro */
--accent: 240 3.7% 15.9%;          /* Gris oscuro */
```

### 5.2 Tipografía

**Fuentes:**
- **Principal**: Geist Sans (Google Fonts)
- **Monospace**: Geist Mono (Google Fonts)
- **Tamaños**: Sistema escalable con Tailwind CSS

**Jerarquía:**
- H1: 3xl (30px) - Título principal "TaskMaster"
- H2: lg (18px) - Títulos de sección
- Body: sm (14px) - Texto general
- Caption: xs (12px) - Metadatos y timestamps

### 5.3 Componentes de UI

**Botones:**
- Estilo: Redondeados (border-radius: 0.5rem)
- Variantes: default, outline, ghost, destructive
- Estados: hover, active, disabled
- Iconos: Lucide React

**Tarjetas:**
- Fondo: Blanco/gris oscuro según tema
- Bordes: Sutiles con border-radius
- Sombras: Suaves para elevación
- Padding: Consistente (16px)

**Formularios:**
- Inputs: Bordes redondeados, focus ring púrpura
- Labels: Texto muted-foreground
- Validación: Colores destructive para errores

**Etiquetas (Badges):**
- Colores personalizables por usuario
- Forma: Píldora redondeada
- Tamaño: Compacto con padding mínimo

### 5.4 Layout y Espaciado

**Contenedor Principal:**
- Max-width: 4xl (896px)
- Centrado horizontalmente
- Padding: 16px en móvil, 32px en desktop

**Grid System:**
- Vista Lista: Columna única con indentación para jerarquía
- Vista Calendario: Grid 7x6 para días del mes
- Responsive: Colapsa a móvil en pantallas pequeñas

**Espaciado:**
- Entre elementos: 16px (space-y-4)
- Entre secciones: 24px (space-y-6)
- Padding interno: 12px-16px según componente

### 5.5 Iconografía

**Librería**: Lucide React
**Iconos Principales:**
- ListChecks: Logo de la aplicación
- Plus: Agregar nueva tarea
- Calendar: Fechas y vista calendario
- Tag: Etiquetas
- MessageSquare: Comentarios
- History: Actividades
- Check/X: Estados de completado
- ChevronDown/Right: Expansión de elementos
- MoreVertical: Menús de opciones

### 5.6 Animaciones y Transiciones

**Transiciones:**
- Duración: 200ms (ease-out)
- Propiedades: opacity, transform, colors
- Hover effects: Cambios sutiles de color y elevación

**Animaciones:**
- Accordion: Expansión/colapso suave
- Loading: Spinner con rotación
- Toast: Slide-in desde la esquina

## 6. Flujos de Usuario

### 6.1 Flujo Principal de Gestión de Tareas

1. **Inicio**: Usuario accede a la aplicación
2. **Vista Principal**: Se muestra lista de tareas existentes
3. **Crear Tarea**: 
   - Click en botón "+"
   - Llenar título (requerido)
   - Agregar descripción (opcional)
   - Seleccionar fechas (opcional)
   - Asignar etiquetas (opcional)
   - Guardar
4. **Gestionar Tarea**:
   - Marcar como completada
   - Editar información
   - Agregar subtareas
   - Agregar comentarios
   - Eliminar

### 6.2 Flujo de Subtareas

1. **Desde Tarea Padre**: Click en "+" junto a tarea existente
2. **Validación**: Sistema verifica límites de anidación
3. **Creación**: Similar al flujo principal pero con validaciones de fechas
4. **Jerarquía**: Subtarea se muestra indentada bajo la tarea padre
5. **Progreso**: Tarea padre actualiza automáticamente su progreso

### 6.3 Flujo de Etiquetas

1. **Crear Etiqueta**: 
   - Desde panel de etiquetas
   - Ingresar nombre y seleccionar color
   - Guardar
2. **Asignar a Tarea**:
   - Durante creación o edición de tarea
   - Seleccionar de lista existente
   - Múltiple selección permitida
3. **Gestionar Etiquetas**:
   - Editar nombre/color
   - Eliminar (con confirmación)

### 6.4 Flujo de Vista Calendario

1. **Cambio de Vista**: Click en tab "Calendar"
2. **Navegación**: Botones prev/next para cambiar mes
3. **Visualización**: Tareas se muestran como barras en días correspondientes
4. **Interacción**: Click en día para ver tareas de esa fecha
5. **Detalles**: Panel lateral muestra tareas del día seleccionado

## 7. Configuración y Dependencias

### 7.1 package.json Principal

```json
{
  "name": "taskmaster",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev --turbopack -p 9002",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@hookform/resolvers": "^4.1.3",
    "@next-auth/prisma-adapter": "^1.0.7",
    "@prisma/client": "^5.7.1",
    "@radix-ui/react-*": "^1.x.x",
    "bcryptjs": "^2.4.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.475.0",
    "next": "15.3.3",
    "next-auth": "^4.24.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.54.2",
    "tailwind-merge": "^3.0.1",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "9.33.0",
    "eslint-config-next": "15.4.6",
    "postcss": "^8",
    "prisma": "^5.7.1",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
```

### 7.2 Configuraciones Importantes

**next.config.ts:**
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
};

export default nextConfig;
```

**tailwind.config.ts:**
- Configuración completa de colores CSS variables
- Animaciones personalizadas
- Plugins: tailwindcss-animate

**prisma/schema.prisma:**
- Provider: sqlite
- URL: file:./dev.db
- Modelos: User, Task, Activity, Tag, TaskTag

## 8. Consideraciones de Desarrollo

### 8.1 Modo Desarrollo
- Usuario por defecto: 'dev-user-id'
- Autenticación deshabilitada para desarrollo
- Puerto: 9002
- Turbopack habilitado para desarrollo rápido

### 8.2 Manejo de Estados
- Estados locales con useState
- Efectos con useEffect
- Custom hooks para lógica reutilizable
- Context providers para estado global

### 8.3 Optimizaciones
- Lazy loading de componentes
- Memoización con useMemo y useCallback
- Debouncing en búsquedas
- Timeouts en peticiones HTTP

### 8.4 Manejo de Errores
- Try-catch en todas las operaciones async
- Toast notifications para feedback
- Validación en frontend y backend
- Rollback en operaciones fallidas

### 8.5 Accesibilidad
- Componentes Radix UI (accesibles por defecto)
- Navegación por teclado
- ARIA labels apropiados
- Contraste de colores adecuado

## 9. Instrucciones de Reconstrucción

### 9.1 Configuración Inicial

1. **Crear proyecto Next.js:**
```bash
npx create-next-app@latest taskmaster --typescript --tailwind --eslint --app
cd taskmaster
```

2. **Instalar dependencias:**
```bash
npm install @prisma/client prisma @next-auth/prisma-adapter next-auth bcryptjs
npm install @radix-ui/react-* lucide-react class-variance-authority clsx tailwind-merge
npm install react-hook-form @hookform/resolvers zod date-fns
npm install tailwindcss-animate
npm install -D @types/bcryptjs
```

3. **Configurar Prisma:**
```bash
npx prisma init --datasource-provider sqlite
# Copiar schema.prisma
npx prisma generate
npx prisma db push
```

4. **Configurar shadcn/ui:**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input textarea card tabs popover calendar badge label scroll-area alert-dialog tooltip dropdown-menu progress separator collapsible
```

### 9.2 Estructura de Archivos

1. **Crear estructura de carpetas** según la documentación
2. **Copiar archivos de configuración** (tailwind.config.ts, next.config.ts)
3. **Implementar componentes** en el orden:
   - Layout y providers
   - Componentes UI base
   - TaskPage (componente principal)
   - TaskItem (componente de tarea)
   - CalendarView y Header
   - APIs y hooks

### 9.3 Orden de Implementación Recomendado

1. **Base**: Layout, estilos globales, configuraciones
2. **Autenticación**: NextAuth setup, modelos de usuario
3. **Modelos de datos**: Prisma schema, tipos TypeScript
4. **APIs básicas**: CRUD de tareas y etiquetas
5. **Componentes principales**: TaskPage, TaskItem
6. **Funcionalidades avanzadas**: Subtareas, actividades, calendario
7. **Optimizaciones**: Performance, accesibilidad, responsive

### 9.4 Variables de Entorno

```env
# .env.local
NEXTAUTH_URL=http://localhost:9002
NEXTAUTH_SECRET=your-secret-key
DATABASE_URL="file:./dev.db"
```

## 10. Conclusión

Este documento proporciona una guía completa para reconstruir TaskMaster desde cero, manteniendo todas las funcionalidades actuales y el diseño visual. La aplicación está diseñada con principios modernos de desarrollo web, utilizando las mejores prácticas de React, Next.js y TypeScript.

La arquitectura modular permite un desarrollo incremental, comenzando con funcionalidades básicas y agregando características avanzadas progresivamente. El sistema de componentes reutilizables y la configuración de Tailwind CSS aseguran consistencia visual y facilidad de mantenimiento.

Para cualquier duda específica sobre la implementación, consultar los archivos de código fuente originales como referencia adicional.
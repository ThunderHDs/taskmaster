# TaskMaster - Sistema de Gestión de Tareas

## Descripción

TaskMaster es una aplicación web moderna para la gestión de tareas con sistema avanzado de detección de conflictos de fechas. Permite crear tareas padre con subtareas y detecta automáticamente conflictos de fechas entre ellas.

## Características Principales

- ✅ **Gestión de Tareas**: Crear, editar y eliminar tareas
- 🔗 **Sistema de Subtareas**: Organización jerárquica de tareas
- ⚠️ **Detección de Conflictos**: Sistema inteligente de detección de conflictos de fechas
- 📅 **Gestión de Fechas**: Selector de fechas intuitivo
- 🏷️ **Sistema de Etiquetas**: Organización por categorías
- 📱 **Interfaz Responsiva**: Diseño adaptable a diferentes dispositivos

## Stack Tecnológico

### Frontend
- **Next.js 14** - Framework de React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios
- **Shadcn/ui** - Componentes de UI
- **React Hook Form** - Gestión de formularios

### Backend
- **Next.js API Routes** - API endpoints
- **Prisma** - ORM para base de datos
- **SQLite** - Base de datos (desarrollo)

### Herramientas de Desarrollo
- **ESLint** - Linting de código
- **Prettier** - Formateo de código
- **TypeScript** - Verificación de tipos

## Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- npm o yarn

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/taskmaster.git
   cd taskmaster
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

4. **Configurar variables de entorno**
   ```bash
   cp .env.example .env.local
   ```
   Editar `.env.local` con tus configuraciones.

5. **Ejecutar en modo desarrollo**
   ```bash
   npm run dev
   ```

   La aplicación estará disponible en `http://localhost:3000`

## Scripts Disponibles

- `npm run dev` - Ejecutar en modo desarrollo
- `npm run build` - Construir para producción
- `npm run start` - Ejecutar en modo producción
- `npm run lint` - Ejecutar linting
- `npm run type-check` - Verificar tipos TypeScript

## Estructura del Proyecto

```
src/
├── app/                 # App Router de Next.js
│   ├── api/            # API Routes
│   ├── globals.css     # Estilos globales
│   ├── layout.tsx      # Layout principal
│   └── page.tsx        # Página principal
├── components/         # Componentes React
│   ├── ui/            # Componentes de UI base
│   ├── TaskList.tsx   # Lista de tareas
│   ├── TaskForm.tsx   # Formulario de tareas
│   └── ...
├── lib/               # Utilidades y configuraciones
│   ├── prisma.ts     # Cliente de Prisma
│   └── utils.ts      # Utilidades generales
├── utils/             # Utilidades específicas
│   └── dateConflictUtils.ts # Lógica de conflictos
└── hooks/             # Custom hooks
    └── use-toast.ts   # Hook para notificaciones
```

## Sistema de Detección de Conflictos

El sistema detecta automáticamente conflictos de fechas entre:
- Tareas padre y sus subtareas
- Subtareas entre sí
- Fechas de inicio y vencimiento

### Tipos de Conflictos
1. **Conflicto de Extensión**: Subtarea se extiende más allá de la tarea padre
2. **Conflicto de Inicio Temprano**: Subtarea inicia antes que la tarea padre
3. **Conflicto de Solapamiento**: Subtareas se solapan en fechas

## Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Contacto

Proyecto Link: [https://github.com/tu-usuario/taskmaster](https://github.com/tu-usuario/taskmaster)

---

**Desarrollado con ❤️ usando Next.js y TypeScript**
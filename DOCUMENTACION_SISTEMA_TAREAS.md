# Documentación Detallada: Sistema de Creación y Edición de Tareas y Subtareas

## Índice
1. [Arquitectura General](#arquitectura-general)
2. [Componentes Principales](#componentes-principales)
3. [Flujo de Datos](#flujo-de-datos)
4. [APIs y Endpoints](#apis-y-endpoints)
5. [Sistema de Detección de Conflictos](#sistema-de-detección-de-conflictos)
6. [Funciones Utilitarias](#funciones-utilitarias)
7. [Casos de Uso Detallados](#casos-de-uso-detallados)

---

## Arquitectura General

### Stack Tecnológico
- **Frontend**: Next.js 14 con React
- **Backend**: Next.js API Routes
- **Base de Datos**: SQLite con Prisma ORM
- **UI**: Tailwind CSS + Shadcn/ui
- **Validación**: Zod (implícito en Prisma)

### Estructura de Directorios Relevantes
```
src/
├── app/api/                    # API Routes de Next.js
│   ├── tasks/                  # Endpoints de tareas
│   │   ├── route.ts           # GET, POST /api/tasks
│   │   └── [id]/route.ts      # GET, PUT, DELETE /api/tasks/:id
│   └── subtasks/              # Endpoints de subtareas
│       └── route.ts           # POST /api/subtasks
├── components/                 # Componentes React
│   ├── TaskList.tsx           # Lista principal de tareas
│   ├── InlineTaskForm.tsx     # Formulario de nueva tarea
│   ├── InlineTaskEditForm.tsx # Formulario de edición de tarea
│   ├── InlineSubtaskForm.tsx  # Formulario de subtarea
│   └── DateConflictModal.tsx  # Modal de conflictos de fecha
├── utils/                      # Utilidades
│   └── dateConflictUtils.ts   # Lógica de conflictos de fecha
└── lib/                       # Librerías
    └── prisma.ts             # Cliente de Prisma
```

---

## Componentes Principales

### 1. TaskList.tsx
**Propósito**: Componente principal que renderiza la lista de tareas y maneja el estado global.

**Estado Principal**:
```typescript
const [tasks, setTasks] = useState<Task[]>([]);
const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
const [conflictModal, setConflictModal] = useState<ConflictModalState>({
  isOpen: false,
  subtask: null,
  parentTask: null,
  conflictDetails: null,
  pendingSubtaskData: null
});
```

**Funciones Principales**:

#### `fetchTasks()`
- **Entrada**: Ninguna
- **Salida**: `void`
- **Propósito**: Obtiene todas las tareas desde la API
- **Flujo**:
  1. Hace GET a `/api/tasks`
  2. Actualiza el estado `tasks`
  3. Maneja errores con toast

#### `handleTaskUpdate(taskId: string, updateData: Partial<Task>)`
- **Entrada**: 
  - `taskId`: ID de la tarea a actualizar
  - `updateData`: Datos parciales de la tarea
- **Salida**: `Promise<void>`
- **Propósito**: Actualiza una tarea existente
- **Flujo**:
  1. Hace PUT a `/api/tasks/${taskId}`
  2. Actualiza el estado local optimísticamente
  3. Refresca la lista si es necesario

#### `handleSubtaskSubmit(parentTaskId: string, subtaskData: SubtaskData)`
- **Entrada**:
  - `parentTaskId`: ID de la tarea padre
  - `subtaskData`: Datos de la nueva subtarea
- **Salida**: `Promise<void>`
- **Propósito**: Crea una nueva subtarea con validación de conflictos
- **Flujo**:
  1. Busca la tarea padre en el estado
  2. Valida conflictos de fecha usando `validateDateConflict()`
  3. Si hay conflicto: abre modal de confirmación
  4. Si no hay conflicto: crea la subtarea directamente

### 2. InlineTaskForm.tsx
**Propósito**: Formulario para crear nuevas tareas.

**Props**:
```typescript
interface InlineTaskFormProps {
  onTaskCreated: (task: Task) => void;
  onCancel: () => void;
}
```

**Estado Local**:
```typescript
const [formData, setFormData] = useState({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  priority: 'medium' as Priority,
  tags: [] as string[]
});
```

**Función Principal**:
#### `handleSubmit()`
- **Entrada**: Datos del formulario
- **Salida**: `void`
- **Flujo**:
  1. Valida datos del formulario
  2. Hace POST a `/api/tasks`
  3. Llama a `onTaskCreated` con la nueva tarea
  4. Resetea el formulario

### 3. InlineTaskEditForm.tsx
**Propósito**: Formulario para editar tareas existentes.

**Props**:
```typescript
interface InlineTaskEditFormProps {
  task: Task;
  onTaskUpdated: (task: Task) => void;
  onCancel: () => void;
  onParentTaskUpdate?: (taskId: string, updateData: any) => void;
}
```

**Funciones Principales**:

#### `handleSubmit()`
- **Entrada**: Datos del formulario editado
- **Salida**: `void`
- **Flujo**:
  1. Valida cambios
  2. Hace PUT a `/api/tasks/${task.id}`
  3. Llama a `onTaskUpdated`

#### `handleConfirmKeepSubtask()`
- **Entrada**: Ninguna (usa estado del conflicto)
- **Salida**: `void`
- **Propósito**: Confirma mantener subtarea y ajustar tarea padre
- **Flujo**:
  1. Obtiene datos del conflicto del estado
  2. Crea datos de actualización usando `createParentUpdateData()`
  3. Actualiza tarea padre via `onParentTaskUpdate`
  4. Crea la subtarea
  5. Cierra modal de conflicto

### 4. InlineSubtaskForm.tsx
**Propósito**: Formulario específico para crear subtareas.

**Props**:
```typescript
interface InlineSubtaskFormProps {
  parentTaskId: string;
  onSubtaskCreated: (subtask: any) => void;
  onCancel: () => void;
  onConflictDetected: (conflictData: ConflictData) => void;
}
```

**Función Principal**:
#### `handleSubmit()`
- **Entrada**: Datos del formulario de subtarea
- **Salida**: `void`
- **Flujo**:
  1. Valida datos
  2. Llama a `onSubtaskCreated` (que internamente maneja conflictos)

### 5. DateConflictModal.tsx
**Propósito**: Modal que muestra conflictos de fecha y permite resolverlos.

**Props**:
```typescript
interface DateConflictModalProps {
  isOpen: boolean;
  subtask: { title: string; startDate?: string; endDate?: string; } | null;
  parentTask: Task | null;
  conflictDetails: {
    message: string;
    suggestedParentStartDate?: string;
    suggestedParentEndDate?: string;
  } | null;
  onConfirmKeepSubtask: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}
```

**Funciones de Visualización**:
#### `formatDateRange(startDate?: string, endDate?: string)`
- **Entrada**: Fechas de inicio y fin (opcionales)
- **Salida**: `string` - Rango formateado
- **Lógica**:
  - Si ambas son null: "Sin fechas definidas"
  - Si solo inicio es null: "Hasta [fecha_fin]"
  - Si solo fin es null: "Desde [fecha_inicio]"
  - Si ambas existen: "[fecha_inicio] - [fecha_fin]"

---

## Flujo de Datos

### Flujo de Creación de Tarea
```
1. Usuario completa InlineTaskForm
2. handleSubmit() → POST /api/tasks
3. API crea tarea en BD
4. Respuesta → onTaskCreated()
5. TaskList actualiza estado local
6. Re-render de la lista
```

### Flujo de Creación de Subtarea (Sin Conflicto)
```
1. Usuario completa InlineSubtaskForm
2. handleSubmit() → onSubtaskCreated()
3. TaskList.handleSubtaskSubmit()
4. validateDateConflict() → sin conflicto
5. POST /api/subtasks
6. Actualización del estado
7. Re-render
```

### Flujo de Creación de Subtarea (Con Conflicto)
```
1. Usuario completa InlineSubtaskForm
2. handleSubmit() → onSubtaskCreated()
3. TaskList.handleSubtaskSubmit()
4. validateDateConflict() → detecta conflicto
5. Abre DateConflictModal
6. Usuario confirma → handleConfirmKeepSubtask()
7. createParentUpdateData() genera datos de actualización
8. PUT /api/tasks/:id (actualiza tarea padre)
9. POST /api/subtasks (crea subtarea)
10. Actualización del estado
11. Re-render
```

### Flujo de Edición de Tarea
```
1. Usuario hace clic en editar
2. setEditingTaskId() → muestra InlineTaskEditForm
3. Usuario modifica datos
4. handleSubmit() → PUT /api/tasks/:id
5. onTaskUpdated() → actualiza estado local
6. setEditingTaskId(null) → oculta formulario
```

---

## APIs y Endpoints

### GET /api/tasks
**Archivo**: `src/app/api/tasks/route.ts`

**Entrada**: Ninguna
**Salida**: 
```typescript
{
  success: boolean;
  data: Task[];
  error?: string;
}
```

**Lógica**:
1. Conecta a BD via Prisma
2. Obtiene todas las tareas con subtareas incluidas
3. Ordena por fecha de creación descendente
4. Retorna JSON

### POST /api/tasks
**Archivo**: `src/app/api/tasks/route.ts`

**Entrada**:
```typescript
{
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
}
```

**Salida**:
```typescript
{
  success: boolean;
  data: Task;
  error?: string;
}
```

**Lógica**:
1. Valida datos de entrada
2. Crea tarea en BD
3. Retorna tarea creada

### PUT /api/tasks/[id]
**Archivo**: `src/app/api/tasks/[id]/route.ts`

**Entrada**:
- **Parámetros**: `id` (string)
- **Body**: Datos parciales de tarea

**Salida**: Tarea actualizada

**Lógica**:
1. Extrae ID de parámetros
2. Valida existencia de tarea
3. Actualiza campos proporcionados
4. Retorna tarea actualizada

### POST /api/subtasks
**Archivo**: `src/app/api/subtasks/route.ts`

**Entrada**:
```typescript
{
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  parentTaskId: string;
}
```

**Salida**: Subtarea creada

**Lógica**:
1. Valida datos
2. Verifica existencia de tarea padre
3. Crea subtarea
4. Retorna subtarea creada

---

## Sistema de Detección de Conflictos

### Archivo: `src/utils/dateConflictUtils.ts`

### Interfaces Principales
```typescript
export interface DateConflictResult {
  hasConflict: boolean;
  message: string;
  suggestedParentStartDate?: string;
  suggestedParentEndDate?: string;
}

export interface SubtaskData {
  title: string;
  startDate?: string;
  endDate?: string;
}
```

### Función: `validateDateConflict()`
**Entrada**:
- `subtaskData: SubtaskData`
- `parentTask: Task`

**Salida**: `DateConflictResult`

**Lógica Detallada**:
```typescript
1. Si subtarea no tiene fechas → sin conflicto
2. Si tarea padre no tiene fechas → conflicto (sugerir fechas de subtarea)
3. Convertir fechas a objetos Date
4. Verificar si subtarea inicia antes que padre
5. Verificar si subtarea termina después que padre
6. Si hay conflicto:
   - suggestedStartDate = fecha de subtarea SI inicia antes, sino undefined
   - suggestedEndDate = fecha de subtarea SI termina después, sino undefined
7. Generar mensaje descriptivo
8. Retornar resultado
```

**Casos de Conflicto**:
1. **Subtarea inicia antes**: `suggestedStartDate = subtask.startDate, suggestedEndDate = undefined`
2. **Subtarea termina después**: `suggestedStartDate = undefined, suggestedEndDate = subtask.endDate`
3. **Ambos conflictos**: `suggestedStartDate = subtask.startDate, suggestedEndDate = subtask.endDate`

### Función: `createParentUpdateData()`
**Entrada**:
- `parentTask: Task`
- `suggestedStartDate?: string`
- `suggestedEndDate?: string`

**Salida**:
```typescript
{
  id: string;
  startDate: string;
  endDate: string;
  updatedAt: string;
}
```

**Lógica**:
```typescript
{
  id: parentTask.id,
  startDate: suggestedStartDate || parentTask.startDate,
  endDate: suggestedEndDate || parentTask.endDate,
  updatedAt: new Date().toISOString()
}
```

---

## Funciones Utilitarias

### `formatDate(date: Date): string`
- Convierte Date a formato localizado
- Maneja casos de fecha inválida

### `validateDateRange(startDate?: string, endDate?: string): boolean`
- Valida que fecha de inicio sea anterior a fecha de fin
- Retorna `true` si es válido o si alguna fecha falta

---

## Casos de Uso Detallados

### Caso 1: Crear Tarea Simple
```
Usuario → InlineTaskForm → handleSubmit() → POST /api/tasks → TaskList.fetchTasks()
```

### Caso 2: Crear Subtarea Sin Conflicto
```
Usuario → InlineSubtaskForm → TaskList.handleSubtaskSubmit() → validateDateConflict(sin conflicto) → POST /api/subtasks
```

### Caso 3: Crear Subtarea Con Conflicto de Fecha de Inicio
```
1. Usuario crea subtarea que inicia antes que la tarea padre
2. validateDateConflict() detecta conflicto
3. Retorna: { suggestedStartDate: "2024-01-01", suggestedEndDate: undefined }
4. Modal muestra: "Nueva fecha sugerida: 2024-01-01 - [fecha_fin_original]"
5. Usuario confirma
6. createParentUpdateData() genera: { startDate: "2024-01-01", endDate: parent.endDate }
7. PUT /api/tasks/:id actualiza solo la fecha de inicio
8. POST /api/subtasks crea la subtarea
```

### Caso 4: Editar Tarea Existente
```
1. Usuario hace clic en editar
2. InlineTaskEditForm se muestra con datos actuales
3. Usuario modifica campos
4. handleSubmit() → PUT /api/tasks/:id
5. Estado local se actualiza
6. Formulario se oculta
```

---

## Puntos de Extensión

### Para Agregar Nueva Funcionalidad:

1. **Nuevos campos en tareas**:
   - Modificar schema de Prisma
   - Actualizar interfaces TypeScript
   - Modificar formularios
   - Actualizar APIs

2. **Nueva lógica de validación**:
   - Agregar funciones en `dateConflictUtils.ts`
   - Modificar `validateDateConflict()`
   - Actualizar modal de conflictos

3. **Nuevos tipos de conflictos**:
   - Extender `DateConflictResult`
   - Agregar casos en `validateDateConflict()`
   - Actualizar UI del modal

4. **Optimizaciones de rendimiento**:
   - Implementar React.memo en componentes
   - Agregar debouncing en formularios
   - Implementar paginación en TaskList

---

## Consideraciones Técnicas

### Estado Global vs Local
- **Global** (TaskList): Lista de tareas, modal de conflictos
- **Local** (Formularios): Datos temporales de formularios

### Manejo de Errores
- APIs retornan formato consistente `{ success, data, error }`
- Componentes muestran errores via toast
- Validación en cliente y servidor

### Optimizaciones Actuales
- Actualización optimística del estado
- Reutilización de componentes
- Lazy loading implícito de Next.js

### Limitaciones Conocidas
- No hay paginación en lista de tareas
- No hay búsqueda/filtrado avanzado
- Validación de fechas básica
- No hay undo/redo

Este documento te proporciona una visión completa del sistema para que puedas implementar tus modificaciones de manera informada y consistente con la arquitectura existente.
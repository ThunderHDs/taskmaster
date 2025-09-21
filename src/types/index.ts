// ============================================================================
// TIPOS CENTRALIZADOS - TaskMaster v2.0
// ============================================================================
// Este archivo consolida todas las interfaces y tipos del proyecto
// para eliminar duplicación y mantener consistencia

/**
 * Tipo de prioridad de una tarea
 */
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/**
 * Interfaz para las etiquetas (tags)
 */
export interface Tag {
  id: string;
  name: string;
  color: string;
  _count?: {
    tasks: number;
  };
}

/**
 * Interfaz para los grupos de tareas
 */
export interface TaskGroup {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
  };
}

/**
 * Interfaz para los datos de conflictos
 */
export interface ConflictData {
  id?: string;
  type: 'OVERLAP' | 'OVERLOAD';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  conflictingTaskId: string;
  conflictingTaskTitle: string;
  suggestions: string[];
}

/**
 * Interfaz para las subtareas
 */
export interface Subtask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  parentId: string;
  createdAt: string;
  updatedAt: string;
  tags: { tag: Tag }[];
}

/**
 * Interfaz principal para las tareas
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  parentId?: string;
  groupId?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[] | { tag: Tag }[];
  subtasks: Task[];
  parent?: Task;
  group?: TaskGroup;
  conflicts?: ConflictData[];
  progress?: { date: string; description?: string }[];
}

/**
 * Interfaz para datos de tarea en detección de conflictos
 */
export interface TaskData {
  id: string;
  title: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  priority: Priority;
  groupId?: string;
}

// ============================================================================
// PROPS PARA COMPONENTES
// ============================================================================

/**
 * Props para componentes que manejan tareas
 */
export interface TaskComponentProps {
  tasks: Task[];
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onTaskEdit: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (task: Task) => void;
  availableTags: Tag[];
  isLoading?: boolean;
}

/**
 * Props para TaskList
 */
export interface TaskListProps {
  tasks: Task[];
  groups: TaskGroup[];
  tags: Tag[];
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onTaskEdit: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (task: Task) => void;
  onBulkEdit: (tasks: Task[]) => void;
  onBulkDelete: (tasks: Task[]) => void;
  isLoading?: boolean;
}

/**
 * Props para TaskForm
 */
export interface TaskFormProps {
  task?: Task;
  groups: TaskGroup[];
  tags: Tag[];
  onSubmit: (task: Partial<Task>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Props para TagManager
 */
export interface TagManagerProps {
  tags: Tag[];
  onTagCreate: (tag: Omit<Tag, 'id'>) => void;
  onTagUpdate: (tag: Tag) => void;
  onTagDelete: (tagId: string) => void;
  isLoading?: boolean;
}

/**
 * Props para TaskSelector
 */
export interface TaskSelectorProps {
  tasks: Task[];
  selectedTasks: string[];
  onTaskSelect: (taskId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isLoading?: boolean;
}

/**
 * Props para TaskHistory
 */
export interface TaskHistoryProps {
  taskId: string;
  history: TaskHistoryEntry[];
  isLoading?: boolean;
}

// ============================================================================
// UTILIDADES Y ESTADÍSTICAS
// ============================================================================

/**
 * Estadísticas de tareas
 */
export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  byPriority: Record<Priority, number>;
  byGroup: Record<string, number>;
}

/**
 * Filtros para tareas
 */
export interface TaskFilters {
  searchQuery: string;
  selectedTags: string[];
  selectedGroups: string[];
  priorityFilter: string;
  completedFilter: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Entrada del historial de tareas
 */
export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  action: 'CREATED' | 'UPDATED' | 'COMPLETED' | 'DELETED' | 'RESTORED';
  changes: Record<string, any>;
  timestamp: string;
  userId?: string;
}

/**
 * Resultado de detección de conflictos
 */
export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: ConflictData[];
  suggestions: string[];
}

/**
 * Resultado de validación de conflictos de fecha
 */
export interface DateConflictResult {
  hasConflict: boolean;
  conflictType?: 'SUBTASK_AFTER_PARENT' | 'PARENT_BEFORE_SUBTASK';
  message?: string;
  conflictingDates?: {
    parentStart?: string;
    parentDue?: string;
    subtaskStart?: string;
    subtaskDue?: string;
  };
}

/**
 * Datos de subtarea para validación de conflictos
 */
export interface SubtaskData {
  startDate?: string;
  dueDate?: string;
  title: string;
}

// ============================================================================
// RE-EXPORTACIONES
// ============================================================================

// Re-exportar todo desde task.ts para compatibilidad
export * from './task';

// Tipos de utilidad
export type TaskStatus = 'pending' | 'completed' | 'overdue';
export type SortOrder = 'asc' | 'desc';
export type SortField = 'title' | 'dueDate' | 'priority' | 'createdAt' | 'updatedAt';

/**
 * Configuración de ordenamiento
 */
export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

/**
 * Configuración de vista
 */
export interface ViewConfig {
  groupBy: 'none' | 'priority' | 'group' | 'dueDate';
  showCompleted: boolean;
  showSubtasks: boolean;
  compactView: boolean;
}
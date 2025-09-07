// Tipos de datos para el sistema de tareas

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
  conflicts?: ConflictData[];
  progress?: { date: string; description?: string }[];
}

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
 * Estadísticas de tareas
 */
export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
}

/**
 * Filtros para tareas
 */
export interface TaskFilters {
  searchQuery: string;
  selectedTags: string[];
  priorityFilter: string;
  completedFilter: string;
}
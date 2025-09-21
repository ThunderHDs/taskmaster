import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Task } from "../types/task"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calcula el nivel de profundidad de una tarea en la jerarquía de subtareas
 * @param task - La tarea para la cual calcular el nivel
 * @param allTasks - Array de todas las tareas para buscar padres
 * @returns El nivel de profundidad (0 = tarea principal, 1 = subtarea, 2 = subtarea de subtarea)
 */
export function getTaskDepthLevel(task: Task, allTasks: Task[]): number {
  if (!task.parentId) {
    return 0; // Tarea principal
  }

  const parent = allTasks.find(t => t.id === task.parentId);
  if (!parent) {
    return 1; // Si no encuentra el padre, asume que es subtarea de nivel 1
  }

  return 1 + getTaskDepthLevel(parent, allTasks);
}

/**
 * Verifica si una tarea puede tener subtareas (máximo 2 niveles de profundidad)
 * @param task - La tarea a verificar
 * @param allTasks - Array de todas las tareas
 * @returns true si puede tener subtareas, false si ya está en el nivel máximo
 */
export function canHaveSubtasks(task: Task, allTasks: Task[]): boolean {
  const currentLevel = getTaskDepthLevel(task, allTasks);
  return currentLevel < 2; // Solo permite hasta nivel 2 (0, 1, 2)
}

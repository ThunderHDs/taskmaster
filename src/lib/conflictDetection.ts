import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: Array<{
    id?: string;
    type: 'OVERLAP' | 'OVERLOAD';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
    conflictingTaskId: string;
    conflictingTaskTitle: string;
    suggestions: string[];
  }>;
}

export interface TaskData {
  id?: string;
  title: string;
  startDate?: Date | null;
  dueDate?: Date | null;
  estimatedHours?: number | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

/**
 * Detecta conflictos para una tarea específica
 */
export async function detectConflictsForTask(
  taskData: TaskData,
  excludeTaskId?: string
): Promise<ConflictDetectionResult> {
  const conflicts: ConflictDetectionResult['conflicts'] = [];
  
  try {
    // Obtener todas las tareas activas (no completadas) excepto la actual
    const existingTasks = await prisma.task.findMany({
      where: {
        completed: false,
        ...(excludeTaskId && { id: { not: excludeTaskId } }),
        OR: [
          {
            AND: [
              { startDate: { not: null } },
              { dueDate: { not: null } }
            ]
          },
          {
            estimatedHours: { not: null }
          }
        ]
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        dueDate: true,
        estimatedHours: true,
        priority: true
      }
    });
    
    // Detectar conflictos de superposición de fechas (OVERLAP)
    if (taskData.startDate && taskData.dueDate) {
      for (const existingTask of existingTasks) {
        if (existingTask.startDate && existingTask.dueDate) {
          const overlap = checkDateOverlap(
            taskData.startDate,
            taskData.dueDate,
            existingTask.startDate,
            existingTask.dueDate
          );
          
          if (overlap.hasOverlap) {
            const severity = calculateOverlapSeverity(
              overlap.overlapDays,
              taskData.priority,
              existingTask.priority
            );
            
            conflicts.push({
              type: 'OVERLAP',
              severity,
              message: `Conflicto de fechas con "${existingTask.title}". Superposición de ${overlap.overlapDays} día(s).`,
              conflictingTaskId: existingTask.id,
              conflictingTaskTitle: existingTask.title,
              suggestions: generateOverlapSuggestions(
                taskData,
                existingTask,
                overlap.overlapDays
              )
            });
          }
        }
      }
    }
    
    // Detectar conflictos de sobrecarga de trabajo (OVERLOAD)
    if (taskData.startDate && taskData.dueDate && taskData.estimatedHours) {
      const overloadConflicts = await checkWorkloadOverload(
        taskData,
        existingTasks,
        excludeTaskId
      );
      conflicts.push(...overloadConflicts);
    }
    
    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  } catch (error) {
    console.error('Error detecting conflicts:', error);
    return {
      hasConflicts: false,
      conflicts: []
    };
  }
}

/**
 * Verifica si dos rangos de fechas se superponen
 */
function checkDateOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): { hasOverlap: boolean; overlapDays: number } {
  const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
  const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));
  
  if (overlapStart <= overlapEnd) {
    const overlapDays = Math.ceil(
      (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    return { hasOverlap: true, overlapDays };
  }
  
  return { hasOverlap: false, overlapDays: 0 };
}

/**
 * Calcula la severidad de un conflicto de superposición
 */
function calculateOverlapSeverity(
  overlapDays: number,
  priority1: string,
  priority2: string
): 'LOW' | 'MEDIUM' | 'HIGH' {
  const priorityWeight = {
    'LOW': 1,
    'MEDIUM': 2,
    'HIGH': 3,
    'URGENT': 4
  };
  
  const maxPriorityWeight = Math.max(
    priorityWeight[priority1 as keyof typeof priorityWeight] || 2,
    priorityWeight[priority2 as keyof typeof priorityWeight] || 2
  );
  
  // Severidad basada en días de superposición y prioridad
  if (overlapDays >= 7 || maxPriorityWeight >= 4) {
    return 'HIGH';
  } else if (overlapDays >= 3 || maxPriorityWeight >= 3) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

/**
 * Verifica conflictos de sobrecarga de trabajo
 */
async function checkWorkloadOverload(
  taskData: TaskData,
  existingTasks: any[],
  excludeTaskId?: string
): Promise<ConflictDetectionResult['conflicts']> {
  const conflicts: ConflictDetectionResult['conflicts'] = [];
  
  if (!taskData.startDate || !taskData.dueDate || !taskData.estimatedHours) {
    return conflicts;
  }
  
  // Calcular horas por día de la nueva tarea
  const taskDays = Math.ceil(
    (taskData.dueDate.getTime() - taskData.startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  const hoursPerDay = taskData.estimatedHours / taskDays;
  
  // Verificar cada día del rango de la nueva tarea
  for (let d = new Date(taskData.startDate); d <= taskData.dueDate; d.setDate(d.getDate() + 1)) {
    const dayStart = new Date(d);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);
    
    let totalHoursForDay = hoursPerDay;
    const conflictingTasks: string[] = [];
    
    // Sumar horas de tareas existentes que se superponen con este día
    for (const existingTask of existingTasks) {
      if (existingTask.startDate && existingTask.dueDate && existingTask.estimatedHours) {
        if (existingTask.startDate <= dayEnd && existingTask.dueDate >= dayStart) {
          const existingTaskDays = Math.ceil(
            (existingTask.dueDate.getTime() - existingTask.startDate.getTime()) / (1000 * 60 * 60 * 24)
          ) + 1;
          const existingHoursPerDay = existingTask.estimatedHours / existingTaskDays;
          totalHoursForDay += existingHoursPerDay;
          conflictingTasks.push(existingTask.id);
        }
      }
    }
    
    // Verificar si excede las 8 horas por día (límite razonable)
    if (totalHoursForDay > 8) {
      const severity = totalHoursForDay > 12 ? 'HIGH' : totalHoursForDay > 10 ? 'MEDIUM' : 'LOW';
      
      // Agregar conflicto solo una vez por tarea conflictiva
      for (const conflictingTaskId of conflictingTasks) {
        const conflictingTask = existingTasks.find(t => t.id === conflictingTaskId);
        if (conflictingTask && !conflicts.some(c => c.conflictingTaskId === conflictingTaskId)) {
          conflicts.push({
            type: 'OVERLOAD',
            severity,
            message: `Sobrecarga de trabajo detectada. Total estimado: ${totalHoursForDay.toFixed(1)} horas/día con "${conflictingTask.title}".`,
            conflictingTaskId: conflictingTask.id,
            conflictingTaskTitle: conflictingTask.title,
            suggestions: generateOverloadSuggestions(taskData, conflictingTask, totalHoursForDay)
          });
        }
      }
    }
  }
  
  return conflicts;
}

/**
 * Genera sugerencias para resolver conflictos de superposición
 */
function generateOverlapSuggestions(
  task1: TaskData,
  task2: any,
  overlapDays: number
): string[] {
  const suggestions: string[] = [];
  
  if (task1.priority === 'LOW' || task1.priority === 'MEDIUM') {
    suggestions.push('Considera posponer esta tarea para después de que termine la tarea conflictiva');
  }
  
  if (task2.priority === 'LOW' || task2.priority === 'MEDIUM') {
    suggestions.push('Considera reprogramar la tarea conflictiva');
  }
  
  if (overlapDays <= 2) {
    suggestions.push('Ajusta las fechas para reducir la superposición a días no laborables');
  }
  
  suggestions.push('Divide una de las tareas en subtareas más pequeñas');
  suggestions.push('Asigna la tarea a otro miembro del equipo si es posible');
  
  return suggestions;
}

/**
 * Genera sugerencias para resolver conflictos de sobrecarga
 */
function generateOverloadSuggestions(
  task1: TaskData,
  task2: any,
  totalHours: number
): string[] {
  const suggestions: string[] = [];
  
  suggestions.push('Extiende el plazo de una de las tareas para distribuir mejor la carga de trabajo');
  suggestions.push('Reduce el alcance o divide las tareas en partes más pequeñas');
  
  if (totalHours > 12) {
    suggestions.push('Considera asignar recursos adicionales o delegar parte del trabajo');
  }
  
  suggestions.push('Reprograma una de las tareas para un período menos ocupado');
  suggestions.push('Revisa si alguna tarea puede ser automatizada o simplificada');
  
  return suggestions;
}

/**
 * Guarda conflictos detectados en la base de datos
 */
export async function saveDetectedConflicts(
  taskId: string,
  conflicts: ConflictDetectionResult['conflicts']
): Promise<void> {
  try {
    // Eliminar conflictos existentes para esta tarea
    await prisma.dateConflict.deleteMany({
      where: {
        OR: [
          { taskId },
          { conflictingTaskId: taskId }
        ]
      }
    });
    
    // Crear nuevos conflictos
    for (const conflict of conflicts) {
      await prisma.dateConflict.create({
        data: {
          taskId,
          conflictingTaskId: conflict.conflictingTaskId,
          type: conflict.type,
          severity: conflict.severity,
          message: conflict.message
        }
      });
    }
  } catch (error) {
    console.error('Error saving conflicts:', error);
  }
}
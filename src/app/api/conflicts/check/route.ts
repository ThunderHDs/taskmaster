import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ConflictCheckRequest {
  taskId?: string; // Para edición de tarea existente
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

interface DetectedConflict {
  conflictingTaskId: string;
  conflictingTaskTitle: string;
  type: 'OVERLAP' | 'OVERLOAD';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  suggestion?: string;
}

// POST /api/conflicts/check - Verificar conflictos para una tarea
export async function POST(request: NextRequest) {
  try {
    const body: ConflictCheckRequest = await request.json();
    const { taskId, startDate, dueDate, estimatedHours, priority } = body;
    
    if (!startDate && !dueDate) {
      return NextResponse.json({ conflicts: [] });
    }
    
    const conflicts: DetectedConflict[] = [];
    
    // Obtener todas las tareas que podrían tener conflictos
    const existingTasks = await prisma.task.findMany({
      where: {
        AND: [
          taskId ? { id: { not: taskId } } : {}, // Excluir la tarea actual si es edición
          { completed: false }, // Solo tareas no completadas
          {
            OR: [
              { startDate: { not: null } },
              { dueDate: { not: null } }
            ]
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
    
    const taskStart = startDate ? new Date(startDate) : null;
    const taskEnd = dueDate ? new Date(dueDate) : null;
    
    for (const existingTask of existingTasks) {
      const existingStart = existingTask.startDate;
      const existingEnd = existingTask.dueDate;
      
      // Verificar conflictos de superposición de fechas (OVERLAP)
      const overlapConflict = checkDateOverlap(
        taskStart,
        taskEnd,
        existingStart,
        existingEnd,
        existingTask
      );
      
      if (overlapConflict) {
        conflicts.push(overlapConflict);
      }
      
      // Verificar conflictos de sobrecarga (OVERLOAD)
      const overloadConflict = checkWorkloadOverload(
        taskStart,
        taskEnd,
        estimatedHours,
        existingStart,
        existingEnd,
        existingTask.estimatedHours,
        existingTask,
        priority
      );
      
      if (overloadConflict) {
        conflicts.push(overloadConflict);
      }
    }
    
    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    return NextResponse.json(
      { error: 'Failed to check conflicts' },
      { status: 500 }
    );
  }
}

// Función para verificar superposición de fechas
function checkDateOverlap(
  taskStart: Date | null,
  taskEnd: Date | null,
  existingStart: Date | null,
  existingEnd: Date | null,
  existingTask: any
): DetectedConflict | null {
  if (!taskStart && !taskEnd) return null;
  if (!existingStart && !existingEnd) return null;
  
  // Usar fecha de inicio como fecha de fin si no hay fecha de fin
  const effectiveTaskStart = taskStart || taskEnd!;
  const effectiveTaskEnd = taskEnd || taskStart!;
  const effectiveExistingStart = existingStart || existingEnd!;
  const effectiveExistingEnd = existingEnd || existingStart!;
  
  // Verificar si hay superposición
  const hasOverlap = (
    effectiveTaskStart <= effectiveExistingEnd &&
    effectiveTaskEnd >= effectiveExistingStart
  );
  
  if (!hasOverlap) return null;
  
  // Determinar severidad basada en el grado de superposición
  const overlapDays = Math.min(
    effectiveTaskEnd.getTime(),
    effectiveExistingEnd.getTime()
  ) - Math.max(
    effectiveTaskStart.getTime(),
    effectiveExistingStart.getTime()
  );
  
  const overlapDaysCount = Math.ceil(overlapDays / (1000 * 60 * 60 * 24));
  
  let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (overlapDaysCount > 7) severity = 'HIGH';
  else if (overlapDaysCount > 3) severity = 'MEDIUM';
  
  return {
    conflictingTaskId: existingTask.id,
    conflictingTaskTitle: existingTask.title,
    type: 'OVERLAP',
    severity,
    message: `Las fechas se superponen con "${existingTask.title}" por ${overlapDaysCount} día(s)`,
    suggestion: overlapDaysCount > 3 
      ? 'Considera ajustar las fechas para evitar la superposición'
      : 'Superposición menor, revisa si es necesario ajustar'
  };
}

// Función para verificar sobrecarga de trabajo
function checkWorkloadOverload(
  taskStart: Date | null,
  taskEnd: Date | null,
  taskHours: number | undefined,
  existingStart: Date | null,
  existingEnd: Date | null,
  existingHours: number | undefined,
  existingTask: any,
  priority?: string
): DetectedConflict | null {
  if (!taskHours || !existingHours) return null;
  if (!taskStart || !existingStart) return null;
  
  // Verificar si las tareas están en el mismo período
  const taskEndDate = taskEnd || taskStart;
  const existingEndDate = existingEnd || existingStart;
  
  const hasTimeOverlap = (
    taskStart <= existingEndDate &&
    taskEndDate >= existingStart
  );
  
  if (!hasTimeOverlap) return null;
  
  // Calcular días de trabajo
  const taskDays = Math.max(1, Math.ceil((taskEndDate.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)));
  const existingDays = Math.max(1, Math.ceil((existingEndDate.getTime() - existingStart.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Calcular horas por día
  const taskHoursPerDay = taskHours / taskDays;
  const existingHoursPerDay = existingHours / existingDays;
  const totalHoursPerDay = taskHoursPerDay + existingHoursPerDay;
  
  // Considerar sobrecarga si excede 8 horas por día
  if (totalHoursPerDay <= 8) return null;
  
  let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (totalHoursPerDay > 12) severity = 'HIGH';
  else if (totalHoursPerDay > 10) severity = 'MEDIUM';
  
  // Ajustar severidad basada en prioridad
  if (priority === 'HIGH' || priority === 'URGENT') {
    severity = severity === 'LOW' ? 'MEDIUM' : 'HIGH';
  }
  
  return {
    conflictingTaskId: existingTask.id,
    conflictingTaskTitle: existingTask.title,
    type: 'OVERLOAD',
    severity,
    message: `Sobrecarga de trabajo: ${totalHoursPerDay.toFixed(1)} horas/día con "${existingTask.title}"`,
    suggestion: totalHoursPerDay > 12 
      ? 'Considera redistribuir las tareas o extender los plazos'
      : 'Carga de trabajo alta, revisa la planificación'
  };
}
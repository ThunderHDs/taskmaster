// Importaciones necesarias para manejar requests HTTP en Next.js API Routes
import { NextRequest, NextResponse } from 'next/server';
// Cliente de Prisma para interactuar con la base de datos
import { prisma } from '@/lib/prisma';
// DESHABILITADO: Sistema de detección de conflictos - descomentar para reactivar
// import { detectConflictsForTask, saveDetectedConflicts } from '@/lib/conflictDetection';

/**
 * GET /api/tasks/[id] - Obtener una tarea específica por su ID
 * 
 * Parámetros de ruta:
 * - id: string - ID único de la tarea a obtener
 * 
 * Incluye todas las relaciones: etiquetas, subtareas, tarea padre, actividades y conflictos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extraer el ID de la tarea desde los parámetros de la ruta
    const { id } = await params;
    
    // Buscar la tarea específica con todas sus relaciones
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        // Incluir etiquetas asociadas a la tarea
        tags: {
          include: {
            tag: true  // Datos completos de cada etiqueta
          }
        },
        // Incluir subtareas ordenadas por fecha de creación
        subtasks: {
          include: {
            tags: {
              include: {
                tag: true  // Datos completos de etiquetas de subtareas
              }
            }
          },
          orderBy: {
            createdAt: 'asc'  // Subtareas más antiguas primero
          }
        },
        // Incluir información de la tarea padre (si existe)
        parent: true,
        // Incluir información del grupo al que pertenece la tarea
        group: true,
        // Incluir todas las actividades ordenadas por fecha
        activities: {
          orderBy: {
            createdAt: 'desc'  // Actividades más recientes primero
          }
        },
        // Incluir conflictos de fechas con otras tareas
        conflicts: {
          include: {
            conflictingTask: true  // Datos de la tarea en conflicto
          }
        }
      }
    });
    
    // Verificar si la tarea existe
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Retornar la tarea encontrada con todas sus relaciones
    return NextResponse.json(task);
  } catch (error) {
    // Registrar error en consola para debugging
    console.error('Error fetching task:', error);
    // Retornar respuesta de error al cliente
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tasks/[id] - Actualizar una tarea específica
 * 
 * Parámetros de ruta:
 * - id: string - ID único de la tarea a actualizar
 * 
 * Body esperado (todos los campos son opcionales):
 * - title?: string - Nuevo título de la tarea
 * - description?: string - Nueva descripción
 * - completed?: boolean - Estado de completado
 * - priority?: 'LOW'|'MEDIUM'|'HIGH'|'URGENT' - Nueva prioridad
 * - dueDate?: string - Nueva fecha de vencimiento en formato ISO
 * - startDate?: string - Nueva fecha de inicio en formato ISO
 * - estimatedHours?: number - Nuevas horas estimadas
 * - tagIds?: string[] - Array de IDs de etiquetas a asociar
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extraer el ID de la tarea desde los parámetros de la ruta
    const { id } = await params;
    
    // Parsear el cuerpo de la petición JSON con validación
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return NextResponse.json(
          { error: 'Request body is empty' },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Extraer campos a actualizar del body
    const {
      title,           // Nuevo título (opcional)
      description,     // Nueva descripción (opcional)
      completed,       // Nuevo estado de completado (opcional)
      priority,        // Nueva prioridad (opcional)
      dueDate,         // Nueva fecha de vencimiento (opcional)
      startDate,       // Nueva fecha de inicio (opcional)
      estimatedHours,  // Nuevas horas estimadas (opcional)
      groupId,         // Nuevo ID del grupo (opcional)
      tagIds           // Nuevos IDs de etiquetas (opcional)
    } = body;
    
    // VERIFICACIÓN: Comprobar que la tarea existe antes de actualizar
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        tags: true  // Incluir etiquetas actuales para comparación
      }
    });
    
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // VALIDACIÓN 1: Verificar que la prioridad sea válida si se proporciona
    if (priority) {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { error: 'Invalid priority. Must be one of: LOW, MEDIUM, HIGH, URGENT' },
          { status: 400 }
        );
      }
    }
    
    // VALIDACIÓN 2: Validar fechas proporcionadas para asegurar consistencia
    if (dueDate && startDate) {
      try {
        const due = new Date(dueDate);
        const start = new Date(startDate);
        
        // Verificar que las fechas sean válidas
        if (isNaN(due.getTime()) || isNaN(start.getTime())) {
          return NextResponse.json(
            { error: 'Invalid date format' },
            { status: 400 }
          );
        }
        
        // Asegurar que la fecha de vencimiento no sea anterior a la fecha de inicio
        if (due < start) {
          return NextResponse.json(
            { error: 'Due date cannot be before start date' },
            { status: 400 }
          );
        }
      } catch (dateError) {
        return NextResponse.json(
          { error: 'Error processing dates' },
          { status: 400 }
        );
      }
    }
    
    // PREPARACIÓN: Construir objeto de datos para actualización
    const updateData: any = {};
    if (title !== undefined) updateData.title = title?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (completed !== undefined) updateData.completed = completed;
    if (priority !== undefined) updateData.priority = priority;
    if (groupId !== undefined) updateData.groupId = groupId || null;
    
    // Handle dates with proper validation
    if (dueDate !== undefined) {
      if (dueDate && dueDate !== null && !Array.isArray(dueDate) && dueDate !== '') {
        try {
          const dateObj = new Date(dueDate);
          if (!isNaN(dateObj.getTime())) {
            updateData.dueDate = dateObj;
          } else {
            updateData.dueDate = null;
          }
        } catch (error) {
          updateData.dueDate = null;
        }
      } else {
        // Si no se proporciona fecha de vencimiento, establecer como null
        updateData.dueDate = null;
      }
    }
    
    // Manejo de fecha de inicio: validar y convertir a objeto Date
    if (startDate !== undefined) {
      if (startDate && startDate !== null && !Array.isArray(startDate) && startDate !== '') {
        try {
          const dateObj = new Date(startDate);
          // Verificar que la fecha sea válida
          if (!isNaN(dateObj.getTime())) {
            updateData.startDate = dateObj;
          } else {
            updateData.startDate = null;
          }
        } catch (error) {
          // En caso de error en la conversión, establecer como null
          updateData.startDate = null;
        }
      } else {
        // Si no se proporciona fecha de inicio, establecer como null
        updateData.startDate = null;
      }
    }
    
    // Manejo de horas estimadas: establecer valor o null si no se proporciona
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours || null;
    
    // MANEJO DE ETIQUETAS: Actualizar las asociaciones de etiquetas de la tarea
    if (tagIds !== undefined) {
      // Eliminar todas las asociaciones de etiquetas existentes
      await prisma.taskTag.deleteMany({
        where: { taskId: id }
      });
      
      // Filtrar IDs de etiquetas válidos (no nulos, no vacíos)
      const validTagIds = tagIds.filter((tagId: string) => tagId && tagId.trim() !== '');
      
      // Crear nuevas asociaciones de etiquetas si hay IDs válidos
      if (validTagIds.length > 0) {
        updateData.tags = {
          create: validTagIds.map((tagId: string) => ({
            tag: {
              connect: { id: tagId }
            }
          }))
        };
      }
    }
    
    // ACTUALIZACIÓN: Ejecutar la actualización de la tarea en la base de datos
    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        // Incluir etiquetas con sus datos completos
        tags: {
          include: {
            tag: true
          }
        },
        // Incluir subtareas asociadas
        subtasks: true,
        // Incluir tarea padre si existe
        parent: true,
        // Incluir información del grupo
        group: true
      }
    });
    
    // LÓGICA ESPECIAL PARA COMPLETAR TAREAS: Actualizar fecha final automáticamente
    let completionTimeMessage = '';
    if (completed !== undefined && completed !== existingTask.completed && completed === true) {
      // Cuando se marca como completada, actualizar la fecha final a la fecha actual
      const completionDate = new Date();
      
      // Actualizar la fecha final en la base de datos
      await prisma.task.update({
        where: { id },
        data: { dueDate: completionDate }
      });
      
      // Calcular diferencia de días si había una fecha prevista original
      if (existingTask.dueDate) {
        const originalDueDate = new Date(existingTask.dueDate);
        const timeDifference = completionDate.getTime() - originalDueDate.getTime();
        const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
        
        if (daysDifference < 0) {
          // Completada antes de tiempo
          const daysEarly = Math.abs(daysDifference);
          completionTimeMessage = `Tarea completada ${daysEarly} día${daysEarly === 1 ? '' : 's'} antes de lo previsto inicialmente`;
        } else if (daysDifference > 0) {
          // Completada después de tiempo
          completionTimeMessage = `Tarea completada ${daysDifference} día${daysDifference === 1 ? '' : 's'} después de lo previsto inicialmente`;
        } else {
          // Completada exactamente en la fecha prevista
          completionTimeMessage = 'Tarea completada exactamente en la fecha prevista';
        }
      } else {
        // No había fecha prevista
        completionTimeMessage = 'Tarea completada (sin fecha límite previa)';
      }
    }

    // REGISTRO DE ACTIVIDADES: Crear log de los cambios realizados en la tarea
    const changes = [];
    // Detectar qué campos han cambiado comparando con los valores originales
    if (title !== undefined && title !== existingTask.title) changes.push('title');
    if (description !== undefined && description !== existingTask.description) changes.push('description');
    if (completed !== undefined && completed !== existingTask.completed) {
      // Mensaje específico para cambios de estado de completado
      changes.push(completed ? 'marked as completed' : 'marked as incomplete');
    }
    if (priority !== undefined && priority !== existingTask.priority) changes.push('priority');
    if (dueDate !== undefined) changes.push('due date');
    if (startDate !== undefined) changes.push('start date');
    if (estimatedHours !== undefined) changes.push('estimated hours');
    if (tagIds !== undefined) changes.push('tags');
    
    // Crear entrada en el log de actividades solo si hubo cambios
    if (changes.length > 0) {
      // Detectar si la actualización es por resolución de conflictos de fechas
      const isConflictResolution = (
        (startDate !== undefined || dueDate !== undefined) &&
        request.headers.get('x-conflict-resolution') === 'true'
      );
      
      let activityDetails;
      if (isConflictResolution) {
        activityDetails = `Tarea padre "${updatedTask.title}" actualizada automáticamente por conflicto de fechas detectado con subtarea: ${changes.join(', ')}`;
      } else if (completionTimeMessage) {
        // Si hay mensaje de tiempo de completado, usarlo como detalle principal
        activityDetails = completionTimeMessage;
      } else {
        activityDetails = `Task "${updatedTask.title}" was updated: ${changes.join(', ')}`;
      }
      
      await prisma.activityLog.create({
        data: {
          taskId: id,
          action: completed === true ? 'COMPLETED' : 'UPDATED',
          details: activityDetails
        }
      });
    }

    // DETECCIÓN DE CONFLICTOS: Verificar si los cambios pueden generar conflictos
    const shouldCheckConflicts = (
      startDate !== undefined || 
      dueDate !== undefined || 
      estimatedHours !== undefined ||
      priority !== undefined
    );

    // SISTEMA DESHABILITADO: Detección automática de conflictos de fechas
    // Descomentar las siguientes líneas para reactivar la funcionalidad
    // let conflictResult = { hasConflicts: false, conflicts: [] };
    // if (shouldCheckConflicts) {
    //   conflictResult = await detectConflictsForTask({
    //     id: updatedTask.id,
    //     title: updatedTask.title,
    //     startDate: updatedTask.startDate,
    //     dueDate: updatedTask.dueDate,
    //     estimatedHours: updatedTask.estimatedHours,
    //     priority: updatedTask.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    //   }, id); // Excluir la tarea actual de la detección de conflictos

    //   if (conflictResult.hasConflicts) {
    //     await saveDetectedConflicts(updatedTask.id, conflictResult.conflicts);
    //   }
    // }

    // RESPUESTA CON CONFLICTOS: Incluir información de conflictos en la respuesta (deshabilitado)
    // const taskWithConflicts = {
    //   ...updatedTask,
    //   conflicts: conflictResult.conflicts
    // };

    // RESPUESTA EXITOSA: Retornar la tarea actualizada con todas sus relaciones
    return NextResponse.json(updatedTask);
  } catch (error) {
    // MANEJO DE ERRORES: Registrar error y retornar respuesta de error 500
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id] - Eliminar una tarea específica
 * 
 * Elimina una tarea por su ID, incluyendo todas sus subtareas y registros relacionados.
 * Si la tarea eliminada era una subtarea, registra la eliminación en el log de actividades de la tarea padre.
 * 
 * @param request - Objeto de solicitud HTTP
 * @param params - Parámetros de ruta que contienen el ID de la tarea
 * @param params.id - ID único de la tarea a eliminar
 * 
 * @returns Respuesta JSON con mensaje de confirmación o error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // VERIFICACIÓN: Comprobar si la tarea existe antes de eliminarla
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        // Incluir subtareas para verificar si tiene dependencias
        subtasks: true
      }
    });
    
    // Error 404 si la tarea no existe
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // ELIMINACIÓN: Eliminar la tarea (las eliminaciones en cascada manejan subtareas y registros relacionados)
    await prisma.task.delete({
      where: { id }
    });
    
    // REGISTRO DE ACTIVIDAD: Si era una subtarea, registrar la eliminación en la tarea padre
    if (existingTask.parentId) {
      await prisma.activityLog.create({
        data: {
          taskId: existingTask.parentId,
          action: 'SUBTASK_DELETED',
          details: `Subtask "${existingTask.title}" was deleted`
        }
      });
    }
    
    // RESPUESTA EXITOSA: Confirmar eliminación
    return NextResponse.json(
      { message: 'Task deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    // MANEJO DE ERRORES: Registrar error y retornar respuesta de error 500
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
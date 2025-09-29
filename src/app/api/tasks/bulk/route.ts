import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ENDPOINT: POST /api/tasks/bulk - Crear múltiples tareas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      titles,
      description,
      priority = 'MEDIUM',
      startDate,
      dueDate,
      tagIds = [],
      groupId,
      subtasks = [],
      individualData
    } = body;

    // VALIDACIÓN: Verificar que se proporcionen títulos
    if (!titles || !Array.isArray(titles) || titles.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un título de tarea' },
        { status: 400 }
      );
    }

    // VALIDACIÓN: Verificar que el grupo existe (si se proporciona)
    let group = null;
    if (groupId) {
      group = await prisma.taskGroup.findUnique({
        where: { id: groupId }
      });

      if (!group) {
        return NextResponse.json(
          { error: 'El grupo especificado no existe' },
          { status: 404 }
        );
      }
    }

    // VALIDACIÓN: Verificar que las etiquetas existen
    if (tagIds.length > 0) {
      const existingTags = await prisma.tag.findMany({
        where: { id: { in: tagIds } }
      });

      if (existingTags.length !== tagIds.length) {
        return NextResponse.json(
          { error: 'Una o más etiquetas especificadas no existen' },
          { status: 404 }
        );
      }
    }

    // VALIDACIÓN: Filtrar títulos válidos y únicos
    const validTitles = titles
      .filter((title: string) => title && title.trim())
      .map((title: string) => title.trim());

    if (validTitles.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un título válido' },
        { status: 400 }
      );
    }

    // VALIDACIÓN: Verificar títulos únicos
    const titleSet = new Set(validTitles.map(title => title.toLowerCase()));
    if (titleSet.size !== validTitles.length) {
      return NextResponse.json(
        { error: 'No se permiten títulos duplicados' },
        { status: 400 }
      );
    }

    // VALIDACIÓN: Verificar longitud de títulos
    const invalidTitles = validTitles.filter(title => title.length > 200);
    if (invalidTitles.length > 0) {
      return NextResponse.json(
        { error: 'Los títulos deben tener menos de 200 caracteres' },
        { status: 400 }
      );
    }

    // VALIDACIÓN: Verificar descripción
    if (description && description.length > 1000) {
      return NextResponse.json(
        { error: 'La descripción debe tener menos de 1000 caracteres' },
        { status: 400 }
      );
    }

    // VALIDACIÓN: Verificar fechas
    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedDueDate = dueDate ? new Date(dueDate) : null;

    if (parsedStartDate && parsedDueDate && parsedStartDate > parsedDueDate) {
      return NextResponse.json(
        { error: 'La fecha de inicio no puede ser posterior a la fecha límite' },
        { status: 400 }
      );
    }

    // VALIDACIÓN: Verificar que las fechas no sean en el pasado
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (parsedStartDate && parsedStartDate < today) {
      return NextResponse.json(
        { error: 'La fecha de inicio no puede ser en el pasado' },
        { status: 400 }
      );
    }

    if (parsedDueDate && parsedDueDate < today) {
      return NextResponse.json(
        { error: 'La fecha límite no puede ser en el pasado' },
        { status: 400 }
      );
    }

    // PREPARACIÓN: Filtrar subtareas válidas
    const validSubtasks = subtasks
      .filter((subtask: string) => subtask && subtask.trim())
      .map((subtask: string) => subtask.trim());

    // TRANSACCIÓN: Crear todas las tareas y sus subtareas
    const result = await prisma.$transaction(async (tx) => {
      const createdTasks = [];

      for (let i = 0; i < validTitles.length; i++) {
        const title = validTitles[i];
        const individualTaskData = individualData?.[i];
        
        // Usar datos individuales si están disponibles, sino usar datos globales
        const taskStartDate = individualTaskData?.startDate ? new Date(individualTaskData.startDate) : parsedStartDate;
        const taskDueDate = individualTaskData?.dueDate ? new Date(individualTaskData.dueDate) : parsedDueDate;
        const taskGroupId = individualTaskData?.groupId || groupId;
        const taskTagIds = individualTaskData?.tagIds || tagIds;
        
        // Validar fechas individuales si existen
        if (taskStartDate && taskDueDate && taskStartDate > taskDueDate) {
          throw new Error(`La fecha de inicio no puede ser posterior a la fecha límite para la tarea "${title}"`);
        }
        
        // Crear la tarea principal
        const taskData: any = {
          title,
          description: description || undefined,
          priority,
          startDate: taskStartDate,
          dueDate: taskDueDate,
          completed: false
        };
        
        // Solo agregar groupId si existe
        if (taskGroupId) {
          taskData.groupId = taskGroupId;
        }
        
        const task = await tx.task.create({
          data: taskData
        });

        // Asociar etiquetas si las hay
        if (taskTagIds.length > 0) {
          await tx.taskTag.createMany({
            data: taskTagIds.map((tagId: string) => ({
              taskId: task.id,
              tagId
            }))
          });
        }

        // Crear subtareas si las hay
        if (validSubtasks.length > 0) {
          const subtaskData = validSubtasks.map(subtaskTitle => {
            const subtask: any = {
              title: subtaskTitle,
              description: undefined,
              priority: 'MEDIUM',
              startDate: taskStartDate,
              dueDate: taskDueDate,
              parentId: task.id,
              completed: false
            };
            
            // Solo agregar groupId si existe
            if (taskGroupId) {
              subtask.groupId = taskGroupId;
            }
            
            return subtask;
          });
          
          await tx.task.createMany({
            data: subtaskData
          });
        }

        // Obtener la tarea completa con sus relaciones
        const completeTask = await tx.task.findUnique({
          where: { id: task.id },
          include: {
            tags: {
              include: {
                tag: true
              }
            },
            subtasks: true,
            parent: true,
            group: true
          }
        });

        createdTasks.push(completeTask);

        // Registrar actividad
        await tx.activityLog.create({
          data: {
            taskId: task.id,
            action: 'CREATED',
            details: group 
              ? `Tarea creada como parte de creación masiva en grupo "${group.name}"`
              : 'Tarea creada como parte de creación masiva sin grupo'
          }
        });
      }

      return createdTasks;
    });

    // RESPUESTA: Retornar las tareas creadas
    return NextResponse.json({
      message: `${result.length} tareas creadas exitosamente`,
      tasks: result,
      summary: {
        totalCreated: result.length,
        groupName: group?.name || null,
        hasSubtasks: validSubtasks.length > 0,
        subtaskCount: validSubtasks.length
      }
    });

  } catch (error) {
    console.error('Error creating bulk tasks:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al crear las tareas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// ENDPOINT: PUT /api/tasks/bulk - Editar múltiples tareas
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskIds, updates } = body;
    
    console.log('🔧 API Bulk Edit - Datos recibidos:');
    console.log('taskIds:', taskIds);
    console.log('updates:', updates);
    console.log('body completo:', body);

    // VALIDACIÓN: Verificar que se proporcionen IDs de tareas
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un ID de tarea' },
        { status: 400 }
      );
    }

    // VALIDACIÓN: Verificar que se proporcionen actualizaciones
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Se requieren datos de actualización' },
        { status: 400 }
      );
    }

    // VALIDACIÓN: Verificar que las tareas existen
    const existingTasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      include: {
        tags: { include: { tag: true } },
        subtasks: true,
        parent: true,
        group: true
      }
    });

    if (existingTasks.length !== taskIds.length) {
      return NextResponse.json(
        { error: 'Una o más tareas especificadas no existen' },
        { status: 404 }
      );
    }

    // PREPARACIÓN: Construir datos de actualización
    const updateData: any = {};
    
    if (updates.title !== undefined) {
      if (!updates.title || updates.title.trim().length === 0) {
        return NextResponse.json(
          { error: 'El título es requerido' },
          { status: 400 }
        );
      }
      if (updates.title.length > 200) {
        return NextResponse.json(
          { error: 'El título debe tener menos de 200 caracteres' },
          { status: 400 }
        );
      }
      updateData.title = updates.title.trim();
    }
    
    if (updates.description !== undefined) {
      if (updates.description && updates.description.length > 1000) {
        return NextResponse.json(
          { error: 'La descripción debe tener menos de 1000 caracteres' },
          { status: 400 }
        );
      }
      updateData.description = updates.description || undefined;
    }
    
    if (updates.completed !== undefined) {
      updateData.completed = Boolean(updates.completed);
    }
    
    if (updates.estimatedHours !== undefined) {
      if (updates.estimatedHours !== null && (updates.estimatedHours < 0 || updates.estimatedHours > 1000)) {
        return NextResponse.json(
          { error: 'Las horas estimadas deben estar entre 0 y 1000' },
          { status: 400 }
        );
      }
      updateData.estimatedHours = updates.estimatedHours;
    }

    if (updates.priority !== undefined) {
      if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(updates.priority)) {
        return NextResponse.json(
          { error: 'Prioridad inválida' },
          { status: 400 }
        );
      }
      updateData.priority = updates.priority;
    }

    if (updates.startDate !== undefined) {
      updateData.startDate = updates.startDate ? new Date(updates.startDate) : null;
    }

    if (updates.dueDate !== undefined) {
      updateData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    }

    if (updates.groupId !== undefined) {
      if (updates.groupId) {
        const group = await prisma.taskGroup.findUnique({
          where: { id: updates.groupId }
        });
        if (!group) {
          return NextResponse.json(
            { error: 'El grupo especificado no existe' },
            { status: 404 }
          );
        }
      }
      updateData.groupId = updates.groupId || null;
    }

    // VALIDACIÓN: Verificar fechas
    if (updateData.startDate && updateData.dueDate && updateData.startDate > updateData.dueDate) {
      return NextResponse.json(
        { error: 'La fecha de inicio no puede ser posterior a la fecha límite' },
        { status: 400 }
      );
    }

    // TRANSACCIÓN: Actualizar todas las tareas
    const result = await prisma.$transaction(async (tx) => {
      const updatedTasks = [];

      for (const taskId of taskIds) {
        // Preparar datos de actualización para esta tarea específica
        let taskUpdateData = { ...updateData };
        
        // Si hay actualizaciones individuales, aplicarlas para esta tarea
        if (updates.individualUpdates && updates.individualUpdates[taskId]) {
          const individualData = updates.individualUpdates[taskId];
          
          // Aplicar fechas individuales
          if (individualData.startDate !== undefined) {
            taskUpdateData.startDate = individualData.startDate ? new Date(individualData.startDate) : null;
          }
          if (individualData.dueDate !== undefined) {
            taskUpdateData.dueDate = individualData.dueDate ? new Date(individualData.dueDate) : null;
          }
          
          // Aplicar grupo individual
          if (individualData.groupId !== undefined) {
            if (individualData.groupId) {
              const group = await tx.taskGroup.findUnique({
                where: { id: individualData.groupId }
              });
              if (!group) {
                throw new Error(`El grupo ${individualData.groupId} no existe`);
              }
            }
            taskUpdateData.groupId = individualData.groupId || null;
          }
        }
        
        // Validar fechas individuales
        if (taskUpdateData.startDate && taskUpdateData.dueDate && taskUpdateData.startDate > taskUpdateData.dueDate) {
          throw new Error(`La fecha de inicio no puede ser posterior a la fecha límite para la tarea ${taskId}`);
        }

        // Actualizar la tarea
        const updatedTask = await tx.task.update({
          where: { id: taskId },
          data: taskUpdateData,
          include: {
            tags: { include: { tag: true } },
            subtasks: true,
            parent: true,
            group: true
          }
        });

        // Actualizar etiquetas (globales o individuales)
        let tagIdsToUpdate = updates.tagIds;
        if (updates.individualUpdates && updates.individualUpdates[taskId] && updates.individualUpdates[taskId].tagIds !== undefined) {
          tagIdsToUpdate = updates.individualUpdates[taskId].tagIds;
        }
        
        if (tagIdsToUpdate !== undefined) {
          // Eliminar etiquetas existentes
          await tx.taskTag.deleteMany({
            where: { taskId }
          });

          // Agregar nuevas etiquetas
          if (tagIdsToUpdate.length > 0) {
            await tx.taskTag.createMany({
              data: tagIdsToUpdate.map((tagId: string) => ({
                taskId,
                tagId
              }))
            });
          }
        }

        // Procesar actualizaciones de subtareas existentes
        if (updates.subtaskUpdates) {
          for (const [key, subtaskUpdate] of Object.entries(updates.subtaskUpdates)) {
            const [parentTaskId, subtaskId] = key.split('-');
            
            // Solo procesar si la subtarea pertenece a la tarea actual
            if (parentTaskId === taskId) {
              const subtaskUpdateData: any = {};
              
              if (subtaskUpdate.title !== undefined) {
                subtaskUpdateData.title = subtaskUpdate.title;
              }
              if (subtaskUpdate.description !== undefined) {
                subtaskUpdateData.description = subtaskUpdate.description;
              }
              if (subtaskUpdate.priority !== undefined) {
                subtaskUpdateData.priority = subtaskUpdate.priority;
              }
              if (subtaskUpdate.startDate !== undefined) {
                subtaskUpdateData.startDate = subtaskUpdate.startDate ? new Date(subtaskUpdate.startDate) : null;
              }
              if (subtaskUpdate.dueDate !== undefined) {
                subtaskUpdateData.dueDate = subtaskUpdate.dueDate ? new Date(subtaskUpdate.dueDate) : null;
              }
              if (subtaskUpdate.completed !== undefined) {
                subtaskUpdateData.completed = subtaskUpdate.completed;
              }
              
              // Actualizar la subtarea
              await tx.task.update({
                where: { id: subtaskId },
                data: subtaskUpdateData
              });
            }
          }
        }

        // Procesar subtareas
        if (updates.subtasks) {
          // Agregar subtareas comunes
          if (updates.subtasks.common && updates.subtasks.common.length > 0) {
            for (const subtaskTitle of updates.subtasks.common) {
              if (subtaskTitle.trim()) {
                await tx.task.create({
                  data: {
                    title: subtaskTitle.trim(),
                    description: '',
                    priority: 'MEDIUM',
                    completed: false,
                    parentId: taskId
                  }
                });
              }
            }
          }

          // Agregar subtareas individuales
          if (updates.subtasks.individual && updates.subtasks.individual[taskId]) {
            const individualSubtasks = updates.subtasks.individual[taskId];
            for (const subtaskTitle of individualSubtasks) {
              if (subtaskTitle.trim()) {
                await tx.task.create({
                  data: {
                    title: subtaskTitle.trim(),
                    description: '',
                    priority: 'MEDIUM',
                    completed: false,
                    parentId: taskId
                  }
                });
              }
            }
          }
        }

        updatedTasks.push(updatedTask);

        // Registrar actividad
        let activityDetails = 'Tarea actualizada mediante edición masiva';
        if (updates.individualUpdates && updates.individualUpdates[taskId]) {
          activityDetails += ' con datos individuales';
        }
        if (updates.subtasks) {
          const commonCount = updates.subtasks.common?.length || 0;
          const individualCount = updates.subtasks.individual?.[taskId]?.length || 0;
          if (commonCount > 0 || individualCount > 0) {
            activityDetails += ` - Subtareas agregadas: ${commonCount + individualCount}`;
          }
        }
        
        await tx.activityLog.create({
          data: {
            taskId,
            action: 'UPDATED',
            details: activityDetails
          }
        });
      }

      return updatedTasks;
    });

    // RESPUESTA: Retornar las tareas actualizadas
    return NextResponse.json({
      message: `${result.length} tareas actualizadas exitosamente`,
      tasks: result
    });

  } catch (error) {
    console.error('Error updating bulk tasks:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al actualizar las tareas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
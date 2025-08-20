// Importaciones necesarias para manejar requests HTTP en Next.js API Routes
import { NextRequest, NextResponse } from 'next/server';
// Cliente de Prisma para interactuar con la base de datos
import { PrismaClient } from '@prisma/client';
// DESHABILITADO: Sistema de detección de conflictos - descomentar para reactivar
// import { detectConflictsForTask, saveDetectedConflicts } from '@/lib/conflictDetection';

// Instancia global del cliente Prisma para operaciones de base de datos
const prisma = new PrismaClient();

/**
 * GET /api/tasks - Obtener todas las tareas con filtrado opcional
 * 
 * Parámetros de consulta soportados:
 * - completed: 'true'|'false' - Filtrar por estado de completado
 * - priority: 'LOW'|'MEDIUM'|'HIGH'|'URGENT' - Filtrar por prioridad
 * - parentId: string|'null' - Filtrar por tarea padre (null para tareas principales)
 */
export async function GET(request: NextRequest) {
  try {
    // Extraer parámetros de consulta de la URL
    const { searchParams } = new URL(request.url);
    const completed = searchParams.get('completed');
    const priority = searchParams.get('priority');
    const parentId = searchParams.get('parentId');
    
    // Construir objeto de filtros dinámicamente
    const where: any = {};
    
    // Filtro por estado de completado (convertir string a boolean)
    if (completed !== null) {
      where.completed = completed === 'true';
    }
    
    // Filtro por prioridad de la tarea
    if (priority) {
      where.priority = priority;
    }
    
    // Filtro por tarea padre (manejar 'null' como valor especial)
    if (parentId !== null) {
      where.parentId = parentId === 'null' ? null : parentId;
    }
    
    // Consultar tareas con relaciones incluidas y ordenamiento específico
    const tasks = await prisma.task.findMany({
      where,
      include: {
        // Incluir etiquetas asociadas a la tarea
        tags: {
          include: {
            tag: true  // Datos completos de cada etiqueta
          }
        },
        // Incluir subtareas con sus etiquetas
        subtasks: {
          include: {
            tags: {
              include: {
                tag: true  // Datos completos de etiquetas de subtareas
              }
            }
          }
        },
        // Incluir información de la tarea padre (si existe)
        parent: true,
        // Incluir las 5 actividades más recientes
        activities: {
          orderBy: {
            createdAt: 'desc'  // Más recientes primero
          },
          take: 5  // Limitar a 5 actividades por rendimiento
        }
      },
      // Ordenamiento multi-nivel para organizar las tareas
      orderBy: [
        { completed: 'asc' },    // Tareas pendientes primero
        { priority: 'desc' },    // Prioridad alta primero
        { dueDate: 'asc' },      // Fechas de vencimiento más cercanas primero
        { createdAt: 'desc' }    // Más recientes primero como criterio final
      ]
    });
    
    // Retornar las tareas encontradas en formato JSON
    return NextResponse.json(tasks);
  } catch (error) {
    // Registrar error en consola para debugging
    console.error('Error fetching tasks:', error);
    // Retornar respuesta de error al cliente
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks - Crear una nueva tarea
 * 
 * Body esperado:
 * - title: string (requerido) - Título de la tarea
 * - description?: string - Descripción opcional
 * - priority?: 'LOW'|'MEDIUM'|'HIGH'|'URGENT' - Prioridad (default: MEDIUM)
 * - dueDate?: string - Fecha de vencimiento en formato ISO
 * - startDate?: string - Fecha de inicio en formato ISO
 * - estimatedHours?: number - Horas estimadas para completar
 * - parentId?: string - ID de la tarea padre (para subtareas)
 * - tagIds?: string[] - Array de IDs de etiquetas a asociar
 */
export async function POST(request: NextRequest) {
  try {
    // Parsear el cuerpo de la petición JSON
    const body = await request.json();
    // Extraer y desestructurar los campos con valores por defecto
    const {
      title,                    // Título de la tarea (requerido)
      description,              // Descripción opcional
      priority = 'MEDIUM',      // Prioridad por defecto: MEDIUM
      dueDate,                  // Fecha de vencimiento opcional
      startDate,                // Fecha de inicio opcional
      estimatedHours,           // Horas estimadas opcionales
      parentId,                 // ID de tarea padre opcional (para subtareas)
      tagIds = []               // Array de IDs de etiquetas (vacío por defecto)
    } = body;
    
    // VALIDACIÓN 1: Verificar que el título sea obligatorio y no esté vacío
    if (!title || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    // VALIDACIÓN 2: Verificar que la prioridad sea válida
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be one of: LOW, MEDIUM, HIGH, URGENT' },
        { status: 400 }
      );
    }
    
    // VALIDACIÓN 3: Verificar que la tarea padre exista si se proporciona parentId
    if (parentId) {
      const parentTask = await prisma.task.findUnique({
        where: { id: parentId }
      });
      
      if (!parentTask) {
        return NextResponse.json(
          { error: 'Parent task not found' },
          { status: 404 }
        );
      }
    }
    
    // CREACIÓN: Crear la nueva tarea en la base de datos
    const task = await prisma.task.create({
      data: {
        title: title.trim(),                              // Título limpio sin espacios
        description: description?.trim() || null,         // Descripción limpia o null
        priority,                                         // Prioridad validada
        dueDate: dueDate ? new Date(dueDate) : null,         // Fecha de vencimiento convertida a Date
        startDate: startDate ? new Date(startDate) : null,   // Fecha de inicio convertida a Date
        estimatedHours: estimatedHours || null,               // Horas estimadas o null
        parentId: parentId || null,                          // ID de tarea padre o null
        // Crear relaciones con etiquetas usando los IDs proporcionados
        tags: {
          create: tagIds.map((tagId: string) => ({
            tag: {
              connect: { id: tagId }  // Conectar con etiqueta existente
            }
          }))
        }
      },
      // Incluir relaciones en la respuesta
      include: {
        tags: {
          include: {
            tag: true  // Datos completos de las etiquetas
          }
        },
        subtasks: true,  // Incluir subtareas (si las hay)
        parent: true     // Incluir tarea padre (si existe)
      }
    });
    
    // REGISTRO: Crear entrada en el log de actividades para auditoría
    await prisma.activityLog.create({
      data: {
        taskId: task.id,                                    // ID de la tarea creada
        action: 'CREATED',                                  // Tipo de acción realizada
        details: `Task "${task.title}" was created`        // Descripción detallada
      }
    });

    // DESHABILITADO: Sistema de detección de conflictos - descomentar para reactivar
    // DETECCIÓN: Analizar posibles conflictos con otras tareas
    // const conflictResult = await detectConflictsForTask({
    //   id: task.id,
    //   title: task.title,
    //   startDate: task.startDate,
    //   dueDate: task.dueDate,
    //   estimatedHours: task.estimatedHours,
    //   priority: task.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    // });

    // PERSISTENCIA: Guardar conflictos detectados en la base de datos
    // if (conflictResult.hasConflicts) {
    //   await saveDetectedConflicts(task.id, conflictResult.conflicts);
    // }

    // RESPUESTA: Incluir información de conflictos en la respuesta
    // const taskWithConflicts = {
    //   ...task,
    //   conflicts: conflictResult.conflicts
    // };

    // Retornar la tarea creada con código de estado 201 (Created)
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    // Registrar error en consola para debugging
    console.error('Error creating task:', error);
    // Retornar respuesta de error al cliente
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
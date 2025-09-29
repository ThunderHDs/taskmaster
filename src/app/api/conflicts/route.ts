// IMPORTACIONES: Módulos necesarios para el manejo de solicitudes HTTP y base de datos
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/conflicts - Obtener conflictos de fechas existentes
 * 
 * Recupera todos los conflictos de fechas detectados en el sistema con filtrado opcional.
 * Permite filtrar por tarea específica y severidad del conflicto.
 * 
 * @param request - Objeto de solicitud HTTP
 * 
 * Query Parameters soportados:
 * - taskId: ID de tarea para filtrar conflictos relacionados (opcional)
 * - severity: Severidad del conflicto para filtrar (opcional)
 * 
 * @returns Respuesta JSON con lista de conflictos y sus tareas relacionadas
 */
export async function GET(request: NextRequest) {
  try {
    // Validar que request.url existe y es válido antes de crear URL
    if (!request.url) {
      return NextResponse.json({ error: 'Invalid request URL' }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    
    // PARÁMETROS DE CONSULTA: Extraer filtros opcionales
    const taskId = searchParams.get('taskId');
    const severity = searchParams.get('severity');
    
    // CONSTRUCCIÓN DE FILTROS: Preparar condiciones de búsqueda
    const where: any = {};
    
    // Filtro por tarea: buscar conflictos donde la tarea sea origen o destino del conflicto
    if (taskId) {
      where.OR = [
        { taskId }, // Tarea como origen del conflicto
        { conflictingTaskId: taskId } // Tarea como destino del conflicto
      ];
    }
    
    // Filtro por severidad del conflicto
    if (severity) {
      where.severity = severity;
    }
    
    // CONSULTA DE CONFLICTOS: Obtener conflictos con información de tareas relacionadas
    const conflicts = await prisma.dateConflict.findMany({
      where,
      include: {
        // Información de la tarea origen del conflicto
        task: {
          select: {
            id: true,
            title: true,
            startDate: true,
            dueDate: true,
            priority: true
          }
        },
        // Información de la tarea en conflicto
        conflictingTask: {
          select: {
            id: true,
            title: true,
            startDate: true,
            dueDate: true,
            priority: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Ordenar por fecha de creación (más recientes primero)
      }
    });
    
    // RESPUESTA EXITOSA: Retornar lista de conflictos
    return NextResponse.json(conflicts);
  } catch (error) {
    // MANEJO DE ERRORES: Registrar error y retornar respuesta de error 500
    console.error('Error fetching conflicts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conflicts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conflicts - Crear un nuevo conflicto de fechas manualmente
 * 
 * Permite crear manualmente un conflicto entre dos tareas. Principalmente utilizado
 * para pruebas y casos especiales donde se necesita registrar un conflicto específico.
 * 
 * @param request - Objeto de solicitud HTTP
 * 
 * Cuerpo de la solicitud esperado:
 * {
 *   "taskId": "string",           // ID de la tarea origen (requerido)
 *   "conflictingTaskId": "string", // ID de la tarea en conflicto (requerido)
 *   "type": "string",             // Tipo de conflicto (requerido)
 *   "severity": "string",         // Severidad del conflicto (opcional, por defecto: MEDIUM)
 *   "message": "string"           // Mensaje descriptivo del conflicto (requerido)
 * }
 * 
 * @returns Respuesta JSON con el conflicto creado o error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, conflictingTaskId, type, severity, message } = body;
    
    // VALIDACIÓN: Verificar que se proporcionen todos los campos requeridos
    if (!taskId || !conflictingTaskId || !type || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId, conflictingTaskId, type, message' },
        { status: 400 }
      );
    }
    
    // VERIFICACIÓN DE EXISTENCIA: Comprobar que ambas tareas existan en la base de datos
    const [task, conflictingTask] = await Promise.all([
      prisma.task.findUnique({ where: { id: taskId } }),
      prisma.task.findUnique({ where: { id: conflictingTaskId } })
    ]);
    
    // Error 404 si alguna de las tareas no existe
    if (!task || !conflictingTask) {
      return NextResponse.json(
        { error: 'One or both tasks not found' },
        { status: 404 }
      );
    }
    
    // VERIFICACIÓN DE DUPLICADOS: Comprobar que no exista ya un conflicto entre estas tareas
    const existingConflict = await prisma.dateConflict.findFirst({
      where: {
        OR: [
          { taskId, conflictingTaskId }, // Conflicto en dirección A -> B
          { taskId: conflictingTaskId, conflictingTaskId: taskId } // Conflicto en dirección B -> A
        ]
      }
    });
    
    // Error 409 si ya existe un conflicto entre estas tareas
    if (existingConflict) {
      return NextResponse.json(
        { error: 'Conflict already exists between these tasks' },
        { status: 409 }
      );
    }
    
    // CREACIÓN: Crear el nuevo conflicto con información de las tareas relacionadas
    const conflict = await prisma.dateConflict.create({
      data: {
        taskId,
        conflictingTaskId,
        type,
        severity: severity || 'MEDIUM', // Severidad por defecto si no se especifica
        message
      },
      include: {
        // Incluir información de la tarea origen
        task: {
          select: {
            id: true,
            title: true,
            startDate: true,
            dueDate: true,
            priority: true
          }
        },
        conflictingTask: {
          select: {
            id: true,
            title: true,
            startDate: true,
            dueDate: true,
            priority: true
          }
        }
      }
    });
    
    return NextResponse.json(conflict, { status: 201 });
  } catch (error) {
    console.error('Error creating conflict:', error);
    return NextResponse.json(
      { error: 'Failed to create conflict' },
      { status: 500 }
    );
  }
}
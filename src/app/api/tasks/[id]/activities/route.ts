// IMPORTACIONES: Módulos necesarios para el manejo de solicitudes HTTP y base de datos
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tasks/[id]/activities - Obtener actividades de una tarea específica
 * 
 * Recupera el historial de actividades (log de cambios) de una tarea específica con paginación.
 * Incluye información de paginación para manejar grandes volúmenes de actividades.
 * 
 * @param request - Objeto de solicitud HTTP
 * @param params - Parámetros de ruta que contienen el ID de la tarea
 * @param params.id - ID único de la tarea
 * 
 * Query Parameters soportados:
 * - limit: Número máximo de actividades a retornar (por defecto: 50, máximo: 100)
 * - offset: Número de actividades a omitir para paginación (por defecto: 0)
 * 
 * @returns Respuesta JSON con actividades y información de paginación
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Validar que request.url existe y es válido antes de crear URL
    if (!request.url) {
      return NextResponse.json({ error: 'Invalid request URL' }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    
    // PARÁMETROS DE CONSULTA: Extraer y validar parámetros de paginación
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // VERIFICACIÓN: Comprobar que la tarea existe antes de buscar sus actividades
    const task = await prisma.task.findUnique({
      where: { id }
    });
    
    // Error 404 si la tarea no existe
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // CONSULTA DE ACTIVIDADES: Obtener actividades de la tarea con paginación
    const activities = await prisma.activityLog.findMany({
      where: { taskId: id },
      orderBy: {
        createdAt: 'desc' // Ordenar por fecha de creación (más recientes primero)
      },
      take: Math.min(limit, 100), // Limitar a máximo 100 actividades por solicitud
      skip: offset // Omitir actividades para paginación
    });
    
    // CONTEO TOTAL: Obtener número total de actividades para información de paginación
    const totalCount = await prisma.activityLog.count({
      where: { taskId: id }
    });
    
    // RESPUESTA EXITOSA: Retornar actividades con información de paginación
    return NextResponse.json({
      activities,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + activities.length < totalCount // Indicar si hay más actividades disponibles
      }
    });
  } catch (error) {
    // MANEJO DE ERRORES: Registrar error y retornar respuesta de error 500
    console.error('Error fetching task activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task activities' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/[id]/activities - Agregar nueva entrada al log de actividades
 * 
 * Crea una nueva entrada en el historial de actividades de una tarea específica.
 * Permite registrar acciones personalizadas realizadas en la tarea.
 * 
 * @param request - Objeto de solicitud HTTP
 * @param params - Parámetros de ruta que contienen el ID de la tarea
 * @param params.id - ID único de la tarea
 * 
 * Cuerpo de la solicitud esperado:
 * {
 *   "action": "string",     // Acción realizada (requerido)
 *   "details": "string"     // Detalles adicionales (opcional)
 * }
 * 
 * @returns Respuesta JSON con la nueva entrada de actividad creada
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, details } = body;
    
    // VALIDACIÓN: Verificar que se proporcione la acción requerida
    if (!action || action.trim() === '') {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }
    
    // VERIFICACIÓN: Comprobar que la tarea existe antes de crear la actividad
    const task = await prisma.task.findUnique({
      where: { id }
    });
    
    // Error 404 si la tarea no existe
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // CREACIÓN: Crear nueva entrada en el log de actividades
    const activity = await prisma.activityLog.create({
      data: {
        taskId: id,
        action: action.trim(), // Limpiar espacios en blanco
        details: details?.trim() || null // Detalles opcionales, null si no se proporcionan
      }
    });
    
    // RESPUESTA EXITOSA: Retornar la actividad creada con código 201
    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    // MANEJO DE ERRORES: Registrar error y retornar respuesta de error 500
    console.error('Error creating activity log:', error);
    return NextResponse.json(
      { error: 'Failed to create activity log' },
      { status: 500 }
    );
  }
}
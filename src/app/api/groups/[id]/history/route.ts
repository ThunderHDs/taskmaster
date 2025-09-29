import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/groups/[id]/history - Obtener historial de actividades de un grupo
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;

    // Verificar que el grupo existe
    const group = await prisma.taskGroup.findUnique({
      where: { id: groupId },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Grupo no encontrado' },
        { status: 404 }
      );
    }

    // Obtener todas las tareas del grupo (incluyendo subtareas)
    const groupTaskIds = group.tasks.map(task => task.id);
    
    // Obtener historial de todas las tareas del grupo y sus subtareas
    const activities = await prisma.activityLog.findMany({
      where: {
        OR: [
          // Actividades de tareas principales del grupo
          {
            taskId: {
              in: groupTaskIds,
            },
          },
          // Actividades de subtareas cuyas tareas padre pertenecen al grupo
          {
            task: {
              parent: {
                groupId: groupId,
              },
            },
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            parentId: true,
            groupId: true,
          },
        },
      },
    });

    // Formatear las actividades para incluir información contextual
    const formattedActivities = activities.map((activity) => ({
      id: activity.id,
      action: activity.action,
      details: activity.details,
      comment: activity.comment,
      isUserComment: activity.isUserComment,
      createdAt: activity.createdAt.toISOString(),
      taskId: activity.task.id,
      taskTitle: activity.task.title,
      isSubtask: !!activity.task.parentId,
      isDirectGroupTask: activity.task.groupId === groupId,
    }));

    return NextResponse.json({
      groupId: group.id,
      groupName: group.name,
      totalTasks: group.tasks.length,
      activities: formattedActivities,
    });
  } catch (error) {
    console.error('Error fetching group history:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/groups/[id]/history - Crear nueva entrada de historial para el grupo
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const body = await request.json();
    const { action, details, comment, isUserComment = false } = body;

    // Validar datos requeridos
    if (!action) {
      return NextResponse.json(
        { error: 'El campo action es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el grupo existe
    const group = await prisma.taskGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Grupo no encontrado' },
        { status: 404 }
      );
    }

    // Para actividades a nivel de grupo, crear una entrada especial
    // Nota: Como ActivityLog requiere taskId, usaremos la primera tarea del grupo
    // o crearemos una entrada especial si no hay tareas
    const firstTask = await prisma.task.findFirst({
      where: { groupId: groupId },
      select: { id: true },
    });

    if (!firstTask) {
      return NextResponse.json(
        { error: 'No se pueden crear actividades para un grupo sin tareas' },
        { status: 400 }
      );
    }

    // Crear nueva entrada de historial
    const activityLog = await prisma.activityLog.create({
      data: {
        taskId: firstTask.id,
        action: `GROUP_${action}`,
        details: details ? `[GRUPO: ${group.name}] ${details}` : `[GRUPO: ${group.name}] ${action}`,
        comment: comment || null,
        isUserComment,
      },
    });

    return NextResponse.json({
      id: activityLog.id,
      action: activityLog.action,
      details: activityLog.details,
      comment: activityLog.comment,
      isUserComment: activityLog.isUserComment,
      createdAt: activityLog.createdAt.toISOString(),
      groupId: groupId,
      groupName: group.name,
    });
  } catch (error) {
    console.error('Error creating group activity log:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
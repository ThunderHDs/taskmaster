import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/tasks/[id]/history - Obtener historial de una tarea
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    // Verificar que la tarea existe
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      );
    }

    // Obtener historial de la tarea principal y sus subtareas
    const activities = await prisma.activityLog.findMany({
      where: {
        OR: [
          { taskId: taskId }, // Actividades de la tarea principal
          {
            task: {
              parentId: taskId, // Actividades de las subtareas
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
          },
        },
      },
    });

    // Formatear las actividades para incluir información de subtareas
    const formattedActivities = activities.map((activity) => ({
      id: activity.id,
      action: activity.action,
      details: activity.details,
      comment: activity.comment,
      isUserComment: activity.isUserComment,
      createdAt: activity.createdAt.toISOString(),
      isSubtask: activity.task.parentId === taskId,
      subtaskTitle: activity.task.parentId === taskId ? activity.task.title : null,
    }));

    return NextResponse.json(formattedActivities);
  } catch (error) {
    console.error('Error fetching task history:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[id]/history - Crear nueva entrada de historial
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const body = await request.json();
    const { action, details, comment, isUserComment = false } = body;

    // Validar datos requeridos
    if (!action) {
      return NextResponse.json(
        { error: 'El campo action es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la tarea existe
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      );
    }

    // Crear nueva entrada de historial
    const activityLog = await prisma.activityLog.create({
      data: {
        taskId,
        action,
        details: details || null,
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
    });
  } catch (error) {
    console.error('Error creating activity log:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
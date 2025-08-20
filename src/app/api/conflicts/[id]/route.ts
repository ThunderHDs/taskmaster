import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/conflicts/[id] - Obtener un conflicto específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const conflict = await prisma.dateConflict.findUnique({
      where: { id },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            startDate: true,
            dueDate: true,
            priority: true,
            estimatedHours: true
          }
        },
        conflictingTask: {
          select: {
            id: true,
            title: true,
            startDate: true,
            dueDate: true,
            priority: true,
            estimatedHours: true
          }
        }
      }
    });
    
    if (!conflict) {
      return NextResponse.json(
        { error: 'Conflict not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(conflict);
  } catch (error) {
    console.error('Error fetching conflict:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conflict' },
      { status: 500 }
    );
  }
}

// DELETE /api/conflicts/[id] - Eliminar un conflicto (cuando se resuelve)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Verificar que el conflicto existe
    const existingConflict = await prisma.dateConflict.findUnique({
      where: { id }
    });
    
    if (!existingConflict) {
      return NextResponse.json(
        { error: 'Conflict not found' },
        { status: 404 }
      );
    }
    
    // Eliminar el conflicto
    await prisma.dateConflict.delete({
      where: { id }
    });
    
    // Crear log de actividad para ambas tareas
    await Promise.all([
      prisma.activityLog.create({
        data: {
          taskId: existingConflict.taskId,
          action: 'CONFLICT_RESOLVED',
          details: `Conflict resolved with task ID: ${existingConflict.conflictingTaskId}`
        }
      }),
      prisma.activityLog.create({
        data: {
          taskId: existingConflict.conflictingTaskId,
          action: 'CONFLICT_RESOLVED',
          details: `Conflict resolved with task ID: ${existingConflict.taskId}`
        }
      })
    ]);
    
    return NextResponse.json(
      { message: 'Conflict resolved successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting conflict:', error);
    return NextResponse.json(
      { error: 'Failed to delete conflict' },
      { status: 500 }
    );
  }
}

// PUT /api/conflicts/[id] - Actualizar severidad o mensaje de un conflicto
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { severity, message } = body;
    
    // Verificar que el conflicto existe
    const existingConflict = await prisma.dateConflict.findUnique({
      where: { id }
    });
    
    if (!existingConflict) {
      return NextResponse.json(
        { error: 'Conflict not found' },
        { status: 404 }
      );
    }
    
    // Actualizar el conflicto
    const updatedConflict = await prisma.dateConflict.update({
      where: { id },
      data: {
        ...(severity && { severity }),
        ...(message && { message })
      },
      include: {
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
    
    return NextResponse.json(updatedConflict);
  } catch (error) {
    console.error('Error updating conflict:', error);
    return NextResponse.json(
      { error: 'Failed to update conflict' },
      { status: 500 }
    );
  }
}
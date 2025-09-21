// Importaciones necesarias para manejar requests HTTP en Next.js API Routes
import { NextRequest, NextResponse } from 'next/server';
// Cliente de Prisma para interactuar con la base de datos
import { prisma } from '@/lib/prisma';

/**
 * GET /api/groups - Obtener todos los grupos de tareas con conteo opcional
 * 
 * Parámetros de consulta soportados:
 * - includeTaskCount: 'true'|'false' - Incluir conteo de tareas por grupo
 * 
 * Respuesta:
 * - Array de grupos con información básica
 * - Si includeTaskCount=true, incluye totalTasks, completedTasks, activeTasks
 */
export async function GET(request: NextRequest) {
  try {
    // Extraer parámetros de consulta de la URL
    const { searchParams } = new URL(request.url);
    const includeTaskCount = searchParams.get('includeTaskCount') === 'true';

    // Consultar grupos con inclusión condicional de tareas
    const groups = await prisma.taskGroup.findMany({
      include: {
        tasks: includeTaskCount ? {
          select: {
            id: true,
            completed: true
          }
        } : false
      },
      orderBy: {
        name: 'asc' // Ordenar alfabéticamente por nombre
      }
    });

    // Transformar datos para incluir conteos de tareas si se solicita
    const transformedGroups = groups.map(group => {
      if (includeTaskCount && group.tasks) {
        const totalTasks = group.tasks.length;
        const completedTasks = group.tasks.filter(task => task.completed).length;
        const activeTasks = totalTasks - completedTasks;

        return {
          ...group,
          totalTasks,
          completedTasks,
          activeTasks,
          tasks: undefined // Remover array de tareas del response
        };
      }
      return group;
    });

    // Retornar grupos transformados con código 200 (OK)
    return NextResponse.json(transformedGroups);
  } catch (error) {
    // Registrar error en consola para debugging
    console.error('Error fetching task groups:', error);
    
    // Retornar error genérico del servidor
    return NextResponse.json(
      { error: 'Failed to fetch task groups' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups - Crear un nuevo grupo de tareas
 * 
 * Body esperado:
 * {
 *   name: string (requerido) - Nombre del grupo
 *   description?: string - Descripción opcional
 *   color?: string - Color hexadecimal para el grupo
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parsear el cuerpo de la petición JSON
    const body = await request.json();
    const { name, description, color } = body;

    // Validación básica de datos requeridos
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Validar formato de color si se proporciona
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json(
        { error: 'Color must be a valid hex color (e.g., #FF5733)' },
        { status: 400 }
      );
    }

    // Crear nuevo grupo en la base de datos
    const group = await prisma.taskGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null
      }
    });

    // Retornar grupo creado con código 201 (Created)
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    // Registrar error completo en consola
    console.error('Error creating task group:', error);

    // Manejar errores específicos de Prisma
    if (error instanceof Error) {
      // Error de constraint único (nombre duplicado)
      if (error.message.includes('Unique constraint') || error.message.includes('P2002')) {
        return NextResponse.json(
          { error: 'A group with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Error genérico del servidor
    return NextResponse.json(
      { error: 'Failed to create task group' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups - Eliminar múltiples grupos de tareas
 * 
 * Parámetros de consulta:
 * - ids: string - IDs de grupos separados por comas (ej: "id1,id2,id3")
 * 
 * Comportamiento:
 * - Las tareas asociadas tendrán su groupId establecido a null
 * - No se eliminan las tareas, solo se desasocian del grupo
 */
export async function DELETE(request: NextRequest) {
  try {
    // Extraer parámetros de la URL
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    // Validar que se proporcionen IDs
    if (!idsParam) {
      return NextResponse.json(
        { error: 'Group IDs are required' },
        { status: 400 }
      );
    }

    // Procesar y limpiar lista de IDs
    const ids = idsParam.split(',').map(id => id.trim()).filter(id => id.length > 0);

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid group ID is required' },
        { status: 400 }
      );
    }

    // Verificar que los grupos existan y obtener tareas afectadas
    const groupsToDelete = await prisma.taskGroup.findMany({
      where: {
        id: {
          in: ids
        }
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    // Validar que se encontraron grupos
    if (groupsToDelete.length === 0) {
      return NextResponse.json(
        { error: 'No groups found with the provided IDs' },
        { status: 404 }
      );
    }

    // Contar tareas que serán afectadas
    const affectedTasksCount = groupsToDelete.reduce((count, group) => count + group.tasks.length, 0);

    // Eliminar los grupos (las tareas tendrán groupId = null por onDelete: SetNull)
    const deleteResult = await prisma.taskGroup.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    // Retornar resultado de la eliminación
    return NextResponse.json({
      message: `Successfully deleted ${deleteResult.count} group(s)`,
      deletedCount: deleteResult.count,
      affectedTasksCount,
      deletedGroups: groupsToDelete.map(g => ({ id: g.id, name: g.name }))
    });
  } catch (error) {
    // Registrar error en consola
    console.error('Error deleting task groups:', error);
    
    // Retornar error genérico
    return NextResponse.json(
      { error: 'Failed to delete task groups' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/groups - Get all task groups with optional task count
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeTaskCount = searchParams.get('includeTaskCount') === 'true';
    
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
        name: 'asc'
      }
    });
    
    // Transform the data to include task counts if requested
    const transformedGroups = groups.map(group => {
      if (includeTaskCount && group.tasks) {
        const totalTasks = group.tasks.length;
        const completedTasks = group.tasks.filter(task => task.completed).length;
        const activeTasks = totalTasks - completedTasks;
        
        return {
          ...group,
          taskCount: {
            total: totalTasks,
            active: activeTasks,
            completed: completedTasks
          },
          tasks: undefined // Remove the tasks array from response
        };
      }
      return group;
    });
    
    return NextResponse.json(transformedGroups);
  } catch (error) {
    console.error('Error fetching task groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task groups' },
      { status: 500 }
    );
  }
}

// POST /api/groups - Create a new task group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color } = body;
    
    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required and must be a non-empty string' },
        { status: 400 }
      );
    }
    
    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Group name must be 100 characters or less' },
        { status: 400 }
      );
    }
    
    if (description && (typeof description !== 'string' || description.length > 500)) {
      return NextResponse.json(
        { error: 'Description must be a string of 500 characters or less' },
        { status: 400 }
      );
    }
    
    if (color && (typeof color !== 'string' || !/^#[0-9A-F]{6}$/i.test(color))) {
      return NextResponse.json(
        { error: 'Color must be a valid hex color code (e.g., #FF0000)' },
        { status: 400 }
      );
    }
    
    // Check if group name already exists
    const existingGroup = await prisma.taskGroup.findUnique({
      where: { name: name.trim() }
    });
    
    if (existingGroup) {
      return NextResponse.json(
        { error: 'A group with this name already exists' },
        { status: 409 }
      );
    }
    
    // Create the group
    const group = await prisma.taskGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#6366F1'
      }
    });
    
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating task group:', error);
    return NextResponse.json(
      { error: 'Failed to create task group' },
      { status: 500 }
    );
  }
}

// PUT /api/groups - Update multiple groups (batch update)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { groups } = body;
    
    if (!Array.isArray(groups)) {
      return NextResponse.json(
        { error: 'Request body must contain an array of groups' },
        { status: 400 }
      );
    }
    
    const updatedGroups = [];
    
    for (const groupData of groups) {
      const { id, name, description, color } = groupData;
      
      if (!id) {
        return NextResponse.json(
          { error: 'Each group must have an id' },
          { status: 400 }
        );
      }
      
      // Validation similar to POST
      if (name && (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100)) {
        return NextResponse.json(
          { error: `Invalid name for group ${id}` },
          { status: 400 }
        );
      }
      
      if (description && (typeof description !== 'string' || description.length > 500)) {
        return NextResponse.json(
          { error: `Invalid description for group ${id}` },
          { status: 400 }
        );
      }
      
      if (color && (typeof color !== 'string' || !/^#[0-9A-F]{6}$/i.test(color))) {
        return NextResponse.json(
          { error: `Invalid color for group ${id}` },
          { status: 400 }
        );
      }
      
      const updateData: any = {};
      if (name) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (color) updateData.color = color;
      
      const updatedGroup = await prisma.taskGroup.update({
        where: { id },
        data: updateData
      });
      
      updatedGroups.push(updatedGroup);
    }
    
    return NextResponse.json(updatedGroups);
  } catch (error) {
    console.error('Error updating task groups:', error);
    return NextResponse.json(
      { error: 'Failed to update task groups' },
      { status: 500 }
    );
  }
}

// DELETE /api/groups - Delete multiple groups
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    
    if (!idsParam) {
      return NextResponse.json(
        { error: 'Group IDs are required' },
        { status: 400 }
      );
    }
    
    const ids = idsParam.split(',').map(id => id.trim()).filter(id => id.length > 0);
    
    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid group ID is required' },
        { status: 400 }
      );
    }
    
    // Check if groups exist and get tasks that will be affected
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
    
    if (groupsToDelete.length === 0) {
      return NextResponse.json(
        { error: 'No groups found with the provided IDs' },
        { status: 404 }
      );
    }
    
    // Count affected tasks
    const affectedTasksCount = groupsToDelete.reduce((count, group) => count + group.tasks.length, 0);
    
    // Delete the groups (tasks will have their groupId set to null due to onDelete: SetNull)
    const deleteResult = await prisma.taskGroup.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });
    
    return NextResponse.json({
      message: `Successfully deleted ${deleteResult.count} group(s)`,
      deletedCount: deleteResult.count,
      affectedTasksCount,
      deletedGroups: groupsToDelete.map(g => ({ id: g.id, name: g.name }))
    });
  } catch (error) {
    console.error('Error deleting task groups:', error);
    return NextResponse.json(
      { error: 'Failed to delete task groups' },
      { status: 500 }
    );
  }
}
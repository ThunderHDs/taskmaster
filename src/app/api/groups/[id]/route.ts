import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/groups/[id] - Get a specific task group
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const includeTasks = searchParams.get('includeTasks') === 'true';
    
    const group = await prisma.taskGroup.findUnique({
      where: { id },
      include: {
        tasks: includeTasks ? {
          include: {
            tags: {
              include: {
                tag: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        } : false
      }
    });
    
    if (!group) {
      return NextResponse.json(
        { error: 'Task group not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(group);
  } catch (error) {
    console.error('Error fetching task group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task group' },
      { status: 500 }
    );
  }
}

// PUT /api/groups/[id] - Update a specific task group
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, description, color } = body;
    
    // Check if group exists
    const existingGroup = await prisma.taskGroup.findUnique({
      where: { id }
    });
    
    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Task group not found' },
        { status: 404 }
      );
    }
    
    // Validation
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Group name must be a non-empty string' },
          { status: 400 }
        );
      }
      
      if (name.trim().length > 100) {
        return NextResponse.json(
          { error: 'Group name must be 100 characters or less' },
          { status: 400 }
        );
      }
      
      // Check if another group with this name exists
      const duplicateGroup = await prisma.taskGroup.findFirst({
        where: {
          name: name.trim(),
          id: { not: id }
        }
      });
      
      if (duplicateGroup) {
        return NextResponse.json(
          { error: 'A group with this name already exists' },
          { status: 409 }
        );
      }
    }
    
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string' || description.length > 500) {
        return NextResponse.json(
          { error: 'Description must be a string of 500 characters or less' },
          { status: 400 }
        );
      }
    }
    
    if (color !== undefined) {
      if (typeof color !== 'string' || !/^#[0-9A-F]{6}$/i.test(color)) {
        return NextResponse.json(
          { error: 'Color must be a valid hex color code (e.g., #FF0000)' },
          { status: 400 }
        );
      }
    }
    
    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (color !== undefined) updateData.color = color;
    
    // Update the group
    const updatedGroup = await prisma.taskGroup.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error('Error updating task group:', error);
    return NextResponse.json(
      { error: 'Failed to update task group' },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id] - Delete a specific task group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Check if group exists and get associated tasks
    const groupToDelete = await prisma.taskGroup.findUnique({
      where: { id },
      include: {
        tasks: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
    
    if (!groupToDelete) {
      return NextResponse.json(
        { error: 'Task group not found' },
        { status: 404 }
      );
    }
    
    const affectedTasksCount = groupToDelete.tasks.length;
    
    // Delete the group (tasks will have their groupId set to null due to onDelete: SetNull)
    await prisma.taskGroup.delete({
      where: { id }
    });
    
    return NextResponse.json({
      message: 'Task group deleted successfully',
      deletedGroup: {
        id: groupToDelete.id,
        name: groupToDelete.name
      },
      affectedTasksCount
    });
  } catch (error) {
    console.error('Error deleting task group:', error);
    return NextResponse.json(
      { error: 'Failed to delete task group' },
      { status: 500 }
    );
  }
}
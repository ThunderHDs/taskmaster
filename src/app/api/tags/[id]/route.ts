import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/tags/[id] - Get a specific tag with its tasks
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const includeTasks = searchParams.get('includeTasks') === 'true';
    
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        tasks: includeTasks ? {
          include: {
            task: {
              include: {
                tags: {
                  include: {
                    tag: true
                  }
                },
                parent: true,
                subtasks: {
                  select: {
                    id: true,
                    title: true,
                    completed: true
                  }
                }
              }
            }
          }
        } : false
      }
    });
    
    if (!tag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }
    
    // Transform the response to flatten task data if tasks are included
    if (includeTasks && tag.tasks) {
      const transformedTag = {
        ...tag,
        tasks: tag.tasks.map(taskTag => taskTag.task)
      };
      return NextResponse.json(transformedTag);
    }
    
    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tag' },
      { status: 500 }
    );
  }
}

// PUT /api/tags/[id] - Update a specific tag
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, color } = body;
    
    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({
      where: { id }
    });
    
    if (!existingTag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData: any = {};
    
    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return NextResponse.json(
          { error: 'Tag name cannot be empty' },
          { status: 400 }
        );
      }
      
      // Check for name conflicts (excluding current tag)
      const nameConflict = await prisma.tag.findFirst({
        where: {
          name: name.trim(),
          id: { not: id }
        }
      });
      
      if (nameConflict) {
        return NextResponse.json(
          { error: 'Tag with this name already exists' },
          { status: 409 }
        );
      }
      
      updateData.name = name.trim();
    }
    
    if (color !== undefined) {
      // Validate color format (basic hex color validation)
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexColorRegex.test(color)) {
        return NextResponse.json(
          { error: 'Invalid color format. Use hex color (e.g., #3B82F6)' },
          { status: 400 }
        );
      }
      updateData.color = color;
    }
    
    // Update the tag
    const updatedTag = await prisma.tag.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}

// DELETE /api/tags/[id] - Delete a specific tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Check if tag exists and get associated tasks
    const existingTag = await prisma.tag.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            task: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      }
    });
    
    if (!existingTag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }
    
    // Check if tag is being used by any tasks
    if (existingTag.tasks.length > 0) {
      const taskTitles = existingTag.tasks.map(taskTag => taskTag.task.title);
      return NextResponse.json(
        {
          error: `Cannot delete tag "${existingTag.name}" as it is being used by the following task(s): ${taskTitles.join(', ')}`
        },
        { status: 400 }
      );
    }
    
    // Delete the tag
    await prisma.tag.delete({
      where: { id }
    });
    
    return NextResponse.json(
      { message: `Tag "${existingTag.name}" deleted successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
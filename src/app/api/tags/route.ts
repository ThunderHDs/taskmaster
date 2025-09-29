import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/tags - Get all tags with optional task count
export async function GET(request: NextRequest) {
  try {
    // Validar que request.url existe y es válido antes de crear URL
    if (!request.url) {
      return NextResponse.json({ error: 'Invalid request URL' }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    const includeTaskCount = searchParams.get('includeTaskCount') === 'true';
    
    const tags = await prisma.tag.findMany({
      include: {
        tasks: includeTaskCount ? {
          include: {
            task: {
              select: {
                id: true,
                completed: true
              }
            }
          }
        } : false
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    // Transform the data to include task counts if requested
    const transformedTags = tags.map(tag => {
      if (includeTaskCount && tag.tasks) {
        const totalTasks = tag.tasks.length;
        const completedTasks = tag.tasks.filter(taskTag => taskTag.task.completed).length;
        const activeTasks = totalTasks - completedTasks;
        
        return {
          ...tag,
          taskCount: {
            total: totalTasks,
            active: activeTasks,
            completed: completedTasks
          },
          tasks: undefined // Remove the tasks array from response
        };
      }
      return tag;
    });
    
    return NextResponse.json(transformedTags);
  } catch (error) {
    // Registrar error completo en consola para debugging
    console.error('Error fetching tags:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Determinar tipo de error y respuesta apropiada
    if (error instanceof Error) {
      // Error de timeout de base de datos
      if (error.message.includes('timeout') || error.message.includes('P1008')) {
        return NextResponse.json(
          { error: 'Database connection timeout. Please try again.' },
          { status: 503 }
        );
      }
      
      // Error de validación
      if (error.message.includes('Invalid') || error.message.includes('validation')) {
        return NextResponse.json(
          { error: 'Invalid request parameters' },
          { status: 400 }
        );
      }
    }
    
    // Error genérico del servidor
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color = '#3B82F6' } = body;
    
    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }
    
    // Validate color format (basic hex color validation)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(color)) {
      return NextResponse.json(
        { error: 'Invalid color format. Use hex color (e.g., #3B82F6)' },
        { status: 400 }
      );
    }
    
    // Check if tag with same name already exists
    const existingTag = await prisma.tag.findUnique({
      where: { name: name.trim() }
    });
    
    if (existingTag) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 409 }
      );
    }
    
    // Create the tag
    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color
      }
    });
    
    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    // Registrar error completo en consola para debugging
    console.error('Error creating tag:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Determinar tipo de error y respuesta apropiada
    if (error instanceof Error) {
      // Error de timeout de base de datos
      if (error.message.includes('timeout') || error.message.includes('P1008')) {
        return NextResponse.json(
          { error: 'Database connection timeout. Please try again.' },
          { status: 503 }
        );
      }
      
      // Error de constraint único (nombre duplicado)
      if (error.message.includes('Unique constraint') || error.message.includes('P2002')) {
        return NextResponse.json(
          { error: 'A tag with this name already exists' },
          { status: 409 }
        );
      }
      
      // Error de validación de datos
      if (error.message.includes('Invalid') || error.message.includes('validation')) {
        return NextResponse.json(
          { error: 'Invalid tag data provided' },
          { status: 400 }
        );
      }
    }
    
    // Error genérico del servidor
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}

// PUT /api/tags - Update multiple tags (bulk update)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Updates array is required' },
        { status: 400 }
      );
    }
    
    const results = [];
    
    for (const update of updates) {
      const { id, name, color } = update;
      
      if (!id) {
        results.push({ error: 'Tag ID is required for update' });
        continue;
      }
      
      try {
        // Check if tag exists
        const existingTag = await prisma.tag.findUnique({
          where: { id }
        });
        
        if (!existingTag) {
          results.push({ id, error: 'Tag not found' });
          continue;
        }
        
        // Prepare update data
        const updateData: any = {};
        if (name !== undefined) {
          if (!name || name.trim() === '') {
            results.push({ id, error: 'Tag name cannot be empty' });
            continue;
          }
          
          // Check for name conflicts (excluding current tag)
          const nameConflict = await prisma.tag.findFirst({
            where: {
              name: name.trim(),
              id: { not: id }
            }
          });
          
          if (nameConflict) {
            results.push({ id, error: 'Tag with this name already exists' });
            continue;
          }
          
          updateData.name = name.trim();
        }
        
        if (color !== undefined) {
          const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
          if (!hexColorRegex.test(color)) {
            results.push({ id, error: 'Invalid color format' });
            continue;
          }
          updateData.color = color;
        }
        
        // Update the tag
        const updatedTag = await prisma.tag.update({
          where: { id },
          data: updateData
        });
        
        results.push({ id, success: true, tag: updatedTag });
      } catch (error) {
        results.push({ id, error: 'Failed to update tag' });
      }
    }
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error updating tags:', error);
    return NextResponse.json(
      { error: 'Failed to update tags' },
      { status: 500 }
    );
  }
}

// DELETE /api/tags - Delete multiple tags
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { tagIds } = body;
    
    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json(
        { error: 'Tag IDs array is required' },
        { status: 400 }
      );
    }
    
    const results = [];
    
    for (const tagId of tagIds) {
      try {
        // Check if tag exists
        const existingTag = await prisma.tag.findUnique({
          where: { id: tagId },
          include: {
            tasks: true
          }
        });
        
        if (!existingTag) {
          results.push({ id: tagId, error: 'Tag not found' });
          continue;
        }
        
        // Check if tag is being used by any tasks
        if (existingTag.tasks.length > 0) {
          results.push({
            id: tagId,
            error: `Cannot delete tag "${existingTag.name}" as it is being used by ${existingTag.tasks.length} task(s)`
          });
          continue;
        }
        
        // Delete the tag
        await prisma.tag.delete({
          where: { id: tagId }
        });
        
        results.push({ id: tagId, success: true, name: existingTag.name });
      } catch (error) {
        results.push({ id: tagId, error: 'Failed to delete tag' });
      }
    }
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error deleting tags:', error);
    return NextResponse.json(
      { error: 'Failed to delete tags' },
      { status: 500 }
    );
  }
}
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test creating a tag
    const tag = await prisma.tag.create({
      data: {
        name: 'Test Tag',
        color: '#FF0000'
      }
    });
    console.log('Created tag:', tag);
    
    // Test creating a task
    const task = await prisma.task.create({
      data: {
        title: 'Test Task',
        description: 'This is a test task',
        priority: 'MEDIUM',
        completed: false
      }
    });
    console.log('Created task:', task);
    
    // Test fetching all tasks
    const tasks = await prisma.task.findMany({
      include: {
        tags: {
          include: {
            tag: true
          }
        },
        subtasks: true
      }
    });
    console.log('All tasks:', tasks);
    
    // Test fetching all tags
    const tags = await prisma.tag.findMany();
    console.log('All tags:', tags);
    
    console.log('Database test completed successfully!');
  } catch (error) {
    console.error('Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
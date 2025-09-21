const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTasks() {
  try {
    console.log('Checking existing tasks...');
    
    const tasks = await prisma.task.findMany({
      take: 5,
      select: {
        id: true,
        title: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('Found tasks:', JSON.stringify(tasks, null, 2));
    
    if (tasks.length > 0) {
      console.log('\nTesting history endpoint with first task ID:', tasks[0].id);
    } else {
      console.log('No tasks found in database');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTasks();
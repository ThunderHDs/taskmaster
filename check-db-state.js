const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTasks() {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { title: { contains: 'sdfsffsf' } },
          { id: 'cmftvpab10005ue2wkj1hesey' }
        ]
      },
      include: {
        subtasks: true
      }
    });
    
    console.log('=== ESTADO DE TAREAS EN BD ===');
    tasks.forEach(task => {
      console.log(`\nTarea: ${task.title}`);
      console.log(`ID: ${task.id}`);
      console.log(`Completada: ${task.completed}`);
      console.log(`Subtareas: ${task.subtasks?.length || 0}`);
      
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(subtask => {
          console.log(`  - ${subtask.title}: ${subtask.completed ? 'COMPLETADA' : 'PENDIENTE'}`);
        });
      }
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkTasks();
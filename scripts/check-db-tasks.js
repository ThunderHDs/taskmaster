const { PrismaClient } = require('@prisma/client');

// Usar la misma configuración que el servidor Next.js
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
});

async function checkTasks() {
  try {
    console.log('🔍 Checking tasks in CORRECT database (prisma/dev.db)...');
    
    const tasks = await prisma.task.findMany({
      select: {
        id: true,
        title: true,
        createdAt: true,
        parentId: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`✅ Found ${tasks.length} tasks in dev.db:`);
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ID: ${task.id}`);
      console.log(`   Title: ${task.title}`);
      console.log(`   Parent: ${task.parentId || 'None (main task)'}`);
      console.log(`   Created: ${task.createdAt}`);
      console.log('');
    });
    
    // Probar buscar una tarea específica
    if (tasks.length > 0) {
      const firstTask = tasks[0];
      console.log(`🔍 Testing findUnique with first task ID: ${firstTask.id}`);
      
      const foundTask = await prisma.task.findUnique({
        where: { id: firstTask.id }
      });
      
      if (foundTask) {
        console.log('✅ Task found with findUnique');
        console.log('🎯 Now testing history endpoint simulation...');
        
        // Simular lo que hace el endpoint de historial
        const historyData = await prisma.activityLog.findMany({
          where: {
            taskId: firstTask.id
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        console.log(`📋 History entries for task ${firstTask.id}: ${historyData.length}`);
        
      } else {
        console.log('❌ Task NOT found with findUnique - this is the problem!');
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTasks();

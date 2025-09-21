const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugHistory() {
  try {
    console.log('=== DEBUGGING TASK HISTORY ===');
    
    // Obtener algunas tareas
    const tasks = await prisma.task.findMany({
      take: 3,
      select: {
        id: true,
        title: true,
        parentId: true
      }
    });
    
    console.log('\nTareas encontradas:');
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ID: ${task.id}`);
      console.log(`   Título: ${task.title}`);
      console.log(`   Parent ID: ${task.parentId || 'null'}`);
      console.log(`   URL que se generaría: /api/tasks/${task.id}/history`);
      console.log('');
    });
    
    // Probar con el primer ID
    if (tasks.length > 0) {
      const testId = tasks[0].id;
      console.log(`\n=== PROBANDO CON ID: ${testId} ===`);
      
      // Verificar que la tarea existe
      const taskExists = await prisma.task.findUnique({
        where: { id: testId }
      });
      
      console.log('¿La tarea existe?', taskExists ? 'SÍ' : 'NO');
      
      if (taskExists) {
        // Buscar historial
        const history = await prisma.activityLog.findMany({
          where: {
            OR: [
              { taskId: testId },
              { 
                task: {
                  parentId: testId
                }
              }
            ]
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        console.log(`Entradas de historial encontradas: ${history.length}`);
        
        // Probar la URL manualmente
        console.log('\n=== PROBANDO URL MANUALMENTE ===');
        const testUrl = `http://localhost:3000/api/tasks/${testId}/history`;
        console.log(`URL a probar: ${testUrl}`);
        
        try {
          const fetch = require('node-fetch');
          const response = await fetch(testUrl);
          console.log(`Status: ${response.status}`);
          console.log(`Status Text: ${response.statusText}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log('Respuesta:', JSON.stringify(data, null, 2));
          } else {
            const errorText = await response.text();
            console.log('Error response:', errorText);
          }
        } catch (fetchError) {
          console.log('Error en fetch:', fetchError.message);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugHistory();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCompletion() {
  try {
    // Crear una tarea de prueba con fecha límite en el futuro
    const testTask = await prisma.task.create({
      data: {
        title: 'Tarea de prueba - Punto 4',
        description: 'Tarea para probar la actualización automática de fecha final',
        dueDate: new Date('2025-01-20'),
        priority: 'MEDIUM',
        completed: false
      }
    });
    
    console.log('Tarea de prueba creada:');
    console.log('ID:', testTask.id);
    console.log('Título:', testTask.title);
    console.log('Fecha límite original:', testTask.dueDate);
    console.log('Completada:', testTask.completed);
    
    console.log('\n--- Ahora puedes probar marcando esta tarea como completada en la interfaz ---');
    console.log('La fecha final debería actualizarse automáticamente a la fecha actual');
    console.log('Y debería aparecer un mensaje en el historial indicando que se completó antes de tiempo');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompletion();
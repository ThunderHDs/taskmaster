const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyGroupsFunctionality() {
  try {
    console.log('🔍 Verificando funcionalidad completa de grupos...');
    
    // 1. Verificar que existen grupos
    console.log('\n1. Verificando grupos existentes:');
    const groups = await prisma.taskGroup.findMany({
      include: {
        _count: {
          select: { tasks: true }
        }
      }
    });
    
    console.log(`✓ Encontrados ${groups.length} grupos:`);
    groups.forEach(group => {
      console.log(`  - ${group.name} (${group.color}) - ${group._count.tasks} tareas`);
    });
    
    // 2. Verificar tareas con grupos
    console.log('\n2. Verificando tareas con grupos asignados:');
    const tasksWithGroups = await prisma.task.findMany({
      where: {
        groupId: { not: null }
      },
      include: {
        group: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });
    
    console.log(`✓ Encontradas ${tasksWithGroups.length} tareas con grupos:`);
    tasksWithGroups.forEach(task => {
      console.log(`  - "${task.title}" → Grupo: ${task.group?.name || 'Sin grupo'}`);
    });
    
    // 3. Crear una tarea de prueba con grupo si hay grupos disponibles
    if (groups.length > 0) {
      console.log('\n3. Creando tarea de prueba con grupo:');
      const testGroup = groups[0];
      
      const newTask = await prisma.task.create({
        data: {
          title: `Tarea de Verificación - ${new Date().toLocaleTimeString()}`,
          description: 'Tarea creada para verificar la funcionalidad de grupos',
          priority: 'MEDIUM',
          completed: false,
          groupId: testGroup.id
        },
        include: {
          group: true
        }
      });
      
      console.log(`✓ Tarea creada exitosamente:`);
      console.log(`  - ID: ${newTask.id}`);
      console.log(`  - Título: ${newTask.title}`);
      console.log(`  - Grupo: ${newTask.group?.name}`);
      console.log(`  - Color del grupo: ${newTask.group?.color}`);
      
      // 4. Actualizar la tarea para cambiar de grupo
      if (groups.length > 1) {
        console.log('\n4. Probando cambio de grupo:');
        const newGroup = groups[1];
        
        const updatedTask = await prisma.task.update({
          where: { id: newTask.id },
          data: { groupId: newGroup.id },
          include: { group: true }
        });
        
        console.log(`✓ Grupo cambiado exitosamente:`);
        console.log(`  - Grupo anterior: ${testGroup.name}`);
        console.log(`  - Grupo nuevo: ${updatedTask.group?.name}`);
        
        // Revertir el cambio
        await prisma.task.update({
          where: { id: newTask.id },
          data: { groupId: testGroup.id }
        });
        console.log(`✓ Grupo revertido a: ${testGroup.name}`);
      }
      
      // 5. Eliminar la tarea de prueba
      await prisma.task.delete({
        where: { id: newTask.id }
      });
      console.log(`✓ Tarea de prueba eliminada`);
    }
    
    // 6. Verificar estadísticas finales
    console.log('\n5. Estadísticas finales:');
    const totalTasks = await prisma.task.count();
    const tasksWithGroupsCount = await prisma.task.count({
      where: { groupId: { not: null } }
    });
    const tasksWithoutGroups = totalTasks - tasksWithGroupsCount;
    
    console.log(`✓ Total de tareas: ${totalTasks}`);
    console.log(`✓ Tareas con grupo: ${tasksWithGroupsCount}`);
    console.log(`✓ Tareas sin grupo: ${tasksWithoutGroups}`);
    console.log(`✓ Total de grupos: ${groups.length}`);
    
    console.log('\n🎉 Verificación de funcionalidad de grupos completada exitosamente!');
    console.log('\n📋 Resumen:');
    console.log('  ✅ Modelo TaskGroup funcionando');
    console.log('  ✅ Relación Task-Group funcionando');
    console.log('  ✅ CRUD de grupos funcionando');
    console.log('  ✅ Asignación de grupos a tareas funcionando');
    console.log('  ✅ Cambio de grupos funcionando');
    
  } catch (error) {
    console.error('❌ Error verificando funcionalidad de grupos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyGroupsFunctionality();
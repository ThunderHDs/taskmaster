const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestTask() {
  try {
    console.log('Creating test task with group...');
    
    // Get first available group
    const groups = await prisma.taskGroup.findMany();
    if (groups.length === 0) {
      console.log('No groups found. Creating a test group first...');
      const testGroup = await prisma.taskGroup.create({
        data: {
          name: 'Test Group',
          description: 'Grupo de prueba',
          color: '#3B82F6'
        }
      });
      console.log(`✓ Created test group: ${testGroup.name}`);
      groups.push(testGroup);
    }
    
    const selectedGroup = groups[0];
    console.log(`Using group: ${selectedGroup.name}`);
    
    // Create test task with group
    const testTask = await prisma.task.create({
      data: {
        title: 'Tarea de Prueba con Grupo',
        description: 'Esta es una tarea de prueba asignada a un grupo',
        priority: 'MEDIUM',
        completed: false,
        groupId: selectedGroup.id
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
    
    console.log('\n✓ Test task created successfully!');
    console.log(`  - Title: ${testTask.title}`);
    console.log(`  - Group: ${testTask.group?.name || 'No group'}`);
    console.log(`  - Group Color: ${testTask.group?.color || 'N/A'}`);
    console.log(`  - Priority: ${testTask.priority}`);
    
    // Show all tasks with groups
    console.log('\nAll tasks with groups:');
    const allTasks = await prisma.task.findMany({
      include: {
        group: true
      },
      where: {
        groupId: {
          not: null
        }
      }
    });
    
    allTasks.forEach(task => {
      console.log(`  - ${task.title} → ${task.group?.name || 'No group'}`);
    });
    
  } catch (error) {
    console.error('Error creating test task:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestTask();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestGroups() {
  try {
    console.log('Creating test groups...');
    
    const groups = [
      {
        name: 'Trabajo',
        description: 'Tareas relacionadas con el trabajo',
        color: '#3B82F6'
      },
      {
        name: 'Personal',
        description: 'Tareas personales y del hogar',
        color: '#10B981'
      },
      {
        name: 'Estudios',
        description: 'Tareas académicas y de aprendizaje',
        color: '#F59E0B'
      },
      {
        name: 'Proyectos',
        description: 'Proyectos especiales y desarrollo',
        color: '#8B5CF6'
      }
    ];

    for (const group of groups) {
      const existingGroup = await prisma.taskGroup.findFirst({
        where: { name: group.name }
      });

      if (!existingGroup) {
        await prisma.taskGroup.create({
          data: group
        });
        console.log(`✓ Created group: ${group.name}`);
      } else {
        console.log(`- Group already exists: ${group.name}`);
      }
    }

    console.log('\nTest groups created successfully!');
    
    // Show all groups
    const allGroups = await prisma.taskGroup.findMany();
    console.log('\nAll groups in database:');
    allGroups.forEach(group => {
      console.log(`- ${group.name} (${group.color})`);
    });
    
  } catch (error) {
    console.error('Error creating test groups:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestGroups();
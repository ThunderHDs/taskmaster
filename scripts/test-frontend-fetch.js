// Script para simular el fetch del frontend
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFrontendFetch() {
  try {
    console.log('=== SIMULANDO FETCH DEL FRONTEND ===');
    
    // Obtener una tarea real
    const task = await prisma.task.findFirst({
      where: {
        parentId: null // Solo tareas principales
      },
      select: {
        id: true,
        title: true
      }
    });
    
    if (!task) {
      console.log('❌ No se encontraron tareas');
      return;
    }
    
    console.log('📋 Tarea encontrada:');
    console.log('   ID:', task.id);
    console.log('   Título:', task.title);
    
    // Simular exactamente lo que hace el frontend
    const taskId = task.id;
    const url = `/api/tasks/${taskId}/history`;
    const fullUrl = `http://localhost:3000${url}`;
    
    console.log('\n🔍 Simulando TaskHistory component:');
    console.log('   taskId recibido:', taskId);
    console.log('   typeof taskId:', typeof taskId);
    console.log('   URL generada:', url);
    console.log('   URL completa:', fullUrl);
    
    // Verificar si hay caracteres especiales
    console.log('\n🔬 Análisis del taskId:');
    console.log('   Longitud:', taskId.length);
    console.log('   Contiene espacios:', taskId.includes(' '));
    console.log('   Contiene caracteres especiales:', /[^a-zA-Z0-9]/.test(taskId));
    console.log('   Encoded URI:', encodeURIComponent(taskId));
    
    // Probar diferentes variaciones de la URL
    const urlVariations = [
      fullUrl,
      `http://localhost:3000/api/tasks/${encodeURIComponent(taskId)}/history`,
      `http://localhost:3000/api/tasks/${taskId.trim()}/history`
    ];
    
    console.log('\n🧪 Probando variaciones de URL:');
    
    for (let i = 0; i < urlVariations.length; i++) {
      const testUrl = urlVariations[i];
      console.log(`\n${i + 1}. Probando: ${testUrl}`);
      
      try {
        const response = await fetch(testUrl);
        console.log(`   Status: ${response.status}`);
        console.log(`   StatusText: ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Éxito - Datos:`, data);
        } else {
          console.log(`   ❌ Error ${response.status}`);
        }
      } catch (error) {
        console.log(`   💥 Excepción:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Usar dynamic import para fetch
(async () => {
  const fetch = (await import('node-fetch')).default;
  global.fetch = fetch;
  await testFrontendFetch();
})();
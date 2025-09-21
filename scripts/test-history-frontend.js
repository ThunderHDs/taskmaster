// Usar fetch nativo de Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

// Simular exactamente lo que hace el componente TaskHistory
async function testTaskHistoryFetch() {
  console.log('🧪 Testing TaskHistory fetch behavior...');
  
  // Obtener tareas existentes primero
  try {
    const tasksResponse = await fetch('http://localhost:3000/api/tasks');
    if (!tasksResponse.ok) {
      console.error('❌ Failed to fetch tasks:', tasksResponse.status);
      return;
    }
    
    const tasks = await tasksResponse.json();
    console.log('✅ Found tasks:', tasks.length);
    
    if (tasks.length === 0) {
      console.log('⚠️ No tasks found in database');
      return;
    }
    
    // Probar con cada tarea
    for (const task of tasks.slice(0, 3)) { // Solo las primeras 3
      console.log(`\n🔍 Testing history for task: ${task.id} (${task.title})`);
      
      const historyUrl = `http://localhost:3000/api/tasks/${task.id}/history`;
      console.log('📡 Fetching URL:', historyUrl);
      
      try {
        const historyResponse = await fetch(historyUrl);
        console.log('📊 Response status:', historyResponse.status);
        console.log('📊 Response statusText:', historyResponse.statusText);
        
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          console.log('✅ History data:', historyData);
          console.log('📈 History entries count:', historyData.length);
        } else {
          console.error('❌ Failed to fetch history:');
          console.error('   Status:', historyResponse.status);
          console.error('   StatusText:', historyResponse.statusText);
          
          // Intentar leer el cuerpo del error
          try {
            const errorText = await historyResponse.text();
            console.error('   Error body:', errorText);
          } catch (e) {
            console.error('   Could not read error body:', e.message);
          }
        }
      } catch (fetchError) {
        console.error('💥 Fetch error for task', task.id, ':', fetchError.message);
      }
    }
    
  } catch (error) {
    console.error('💥 General error:', error.message);
  }
}

// Ejecutar la prueba
testTaskHistoryFetch().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
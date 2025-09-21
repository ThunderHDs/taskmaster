// Test script para verificar la funcionalidad de la API de grupos usando fetch nativo
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:3000';

async function testGroupsAPI() {
  console.log('🧪 Testing Groups API with curl...');
  
  try {
    // 1. Test GET /api/groups
    console.log('\n1. Testing GET /api/groups');
    const getResult = execSync(`curl -s ${BASE_URL}/api/groups`, { encoding: 'utf8' });
    const groups = JSON.parse(getResult);
    console.log(`✓ Found ${groups.length} groups:`);
    groups.forEach(group => {
      console.log(`  - ${group.name} (${group.color})`);
    });
    
    // 2. Test POST /api/groups
    console.log('\n2. Testing POST /api/groups');
    const newGroupData = {
      name: 'Test API Group',
      description: 'Grupo creado desde test API',
      color: '#FF6B6B'
    };
    
    const postCommand = `curl -s -X POST ${BASE_URL}/api/groups -H "Content-Type: application/json" -d '${JSON.stringify(newGroupData)}'`;
    const postResult = execSync(postCommand, { encoding: 'utf8' });
    const newGroup = JSON.parse(postResult);
    console.log(`✓ Created group: ${newGroup.name} (ID: ${newGroup.id})`);
    
    // 3. Test PUT /api/groups/[id]
    console.log('\n3. Testing PUT /api/groups/[id]');
    const updateData = {
      name: 'Test API Group Updated',
      description: 'Grupo actualizado desde test API',
      color: '#4ECDC4'
    };
    
    const putCommand = `curl -s -X PUT ${BASE_URL}/api/groups/${newGroup.id} -H "Content-Type: application/json" -d '${JSON.stringify(updateData)}'`;
    const putResult = execSync(putCommand, { encoding: 'utf8' });
    const updatedGroup = JSON.parse(putResult);
    console.log(`✓ Updated group: ${updatedGroup.name}`);
    
    // 4. Test DELETE /api/groups/[id]
    console.log('\n4. Testing DELETE /api/groups/[id]');
    const deleteCommand = `curl -s -X DELETE ${BASE_URL}/api/groups/${newGroup.id}`;
    execSync(deleteCommand, { encoding: 'utf8' });
    console.log(`✓ Deleted group: ${newGroup.id}`);
    
    // 5. Final verification
    console.log('\n5. Final verification - GET /api/groups');
    const finalResult = execSync(`curl -s ${BASE_URL}/api/groups`, { encoding: 'utf8' });
    const finalGroups = JSON.parse(finalResult);
    console.log(`✓ Final count: ${finalGroups.length} groups`);
    
    console.log('\n🎉 Groups API test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing Groups API:', error.message);
  }
}

// Ejecutar el test
testGroupsAPI();
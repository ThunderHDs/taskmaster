// Script para debuggear el problema de desfase de fechas

console.log('=== ANÁLISIS DEL PROBLEMA DE DESFASE DE FECHAS ===');

// Simulamos diferentes escenarios de fechas
const scenarios = [
  {
    name: 'Fecha UTC medianoche',
    date: '2024-01-15T00:00:00.000Z'
  },
  {
    name: 'Fecha local medianoche',
    date: '2024-01-15T00:00:00'
  },
  {
    name: 'Solo fecha (sin hora)',
    date: '2024-01-15'
  },
  {
    name: 'Fecha con hora local',
    date: '2024-01-15T23:00:00'
  }
];

// Métodos de formateo
const formatDateToStringISO = (date) => {
  return date.toISOString().split('T')[0];
};

const formatDateToStringLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateToStringUTC = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

scenarios.forEach((scenario, index) => {
  console.log(`\n${index + 1}. ${scenario.name}`);
  console.log(`   Entrada: ${scenario.date}`);
  
  const date = new Date(scenario.date);
  console.log(`   Objeto Date: ${date.toString()}`);
  console.log(`   ISO String: ${date.toISOString()}`);
  console.log(`   Timezone Offset: ${date.getTimezoneOffset()} minutos`);
  
  console.log(`   Formateo ISO (actual): ${formatDateToStringISO(date)}`);
  console.log(`   Formateo Local: ${formatDateToStringLocal(date)}`);
  console.log(`   Formateo UTC: ${formatDateToStringUTC(date)}`);
  
  // Verificar si hay desfase
  const isoFormat = formatDateToStringISO(date);
  const localFormat = formatDateToStringLocal(date);
  const utcFormat = formatDateToStringUTC(date);
  
  if (isoFormat !== localFormat || isoFormat !== utcFormat) {
    console.log(`   ⚠️  DESFASE DETECTADO!`);
    console.log(`      ISO vs Local: ${isoFormat} vs ${localFormat}`);
    console.log(`      ISO vs UTC: ${isoFormat} vs ${utcFormat}`);
  } else {
    console.log(`   ✅ Sin desfase`);
  }
});

console.log('\n=== INFORMACIÓN DEL SISTEMA ===');
console.log(`Zona horaria: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
console.log(`Offset actual: ${new Date().getTimezoneOffset()} minutos`);

// Simulación específica del problema reportado
console.log('\n=== SIMULACIÓN DEL PROBLEMA REPORTADO ===');
const problemDate = new Date('2024-01-15T23:30:00'); // Fecha tarde en el día
console.log(`Fecha problemática: ${problemDate.toString()}`);
console.log(`Formateo ISO: ${formatDateToStringISO(problemDate)}`);
console.log(`Formateo Local: ${formatDateToStringLocal(problemDate)}`);

// Crear fecha en zona horaria local para comparar
const localMidnight = new Date(2024, 0, 15); // Año, mes (0-indexado), día
console.log(`\nFecha local medianoche: ${localMidnight.toString()}`);
console.log(`Formateo ISO: ${formatDateToStringISO(localMidnight)}`);
console.log(`Formateo Local: ${formatDateToStringLocal(localMidnight)}`);

import { Task } from '@prisma/client';

/**
 * Resultado de la validación de conflictos de fechas entre subtarea y tarea padre
 * Contiene información sobre si existe conflicto y las fechas sugeridas para resolverlo
 */
export interface DateConflictResult {
  hasConflict: boolean;              // Indica si existe un conflicto de fechas
  message: string;                   // Mensaje descriptivo del conflicto o estado
  suggestedParentStartDate?: string; // Nueva fecha de inicio sugerida para la tarea padre (ISO string)
  suggestedParentEndDate?: string;   // Nueva fecha de fin sugerida para la tarea padre (ISO string)
}

/**
 * Datos mínimos de una subtarea necesarios para la validación de conflictos
 * Incluye título y fechas opcionales en formato ISO string
 */
export interface SubtaskData {
  title: string;        // Título de la subtarea
  startDate?: string;   // Fecha de inicio en formato ISO string (opcional)
  endDate?: string;     // Fecha de fin en formato ISO string (opcional)
}

/**
 * Valida si las fechas de una subtarea entran en conflicto con las fechas de la tarea padre
 * 
 * Esta función es el núcleo del sistema de detección de conflictos de fechas.
 * Analiza tres escenarios principales:
 * 1. Subtarea sin fechas definidas → Sin conflicto
 * 2. Tarea padre sin fechas → Conflicto (se sugieren fechas de la subtarea)
 * 3. Ambas con fechas → Verificación de rangos y detección de conflictos
 * 
 * @param subtaskData - Datos de la subtarea a validar (título y fechas)
 * @param parentTask - Tarea padre completa con todas sus propiedades
 * @returns Resultado detallado de la validación con mensaje y fechas sugeridas
 */
export function validateDateConflict(
  subtaskData: SubtaskData,
  parentTask: Task
): DateConflictResult {
  // Caso 1: Si la subtarea no tiene fechas definidas, no puede haber conflicto
  if (!subtaskData.startDate || !subtaskData.endDate) {
    return {
      hasConflict: false,
      message: 'No hay fechas definidas para validar'
    };
  }

  // Convertir fechas de la subtarea de string ISO a objetos Date para comparación
  const subtaskStart = new Date(subtaskData.startDate);
  const subtaskEnd = new Date(subtaskData.endDate);
  
  // Caso 2: Si la tarea padre no tiene fechas definidas, establecer las de la subtarea
  if (!parentTask.startDate || !parentTask.dueDate) {
    return {
      hasConflict: true,
      message: `La subtarea "${subtaskData.title}" tiene fechas definidas pero la tarea padre no. Se actualizarán las fechas de la tarea padre para incluir esta subtarea.`,
      suggestedParentStartDate: subtaskData.startDate,
      suggestedParentEndDate: subtaskData.endDate
    };
  }

  // Convertir fechas de la tarea padre de string/Date a objetos Date para comparación
  const parentStart = new Date(parentTask.startDate);
  const parentEnd = new Date(parentTask.dueDate);

  // Caso 3: Verificar si la subtarea está fuera del rango de fechas de la tarea padre
  const subtaskStartsBeforeParent = subtaskStart < parentStart;
  const subtaskEndsAfterParent = subtaskEnd > parentEnd;

  // Si hay algún tipo de conflicto de fechas
  if (subtaskStartsBeforeParent || subtaskEndsAfterParent) {
    // Calcular las nuevas fechas sugeridas para la tarea padre
    // Estrategia: Solo modificar la fecha que genera conflicto, mantener la otra fecha original
    const suggestedStartDate = subtaskStartsBeforeParent 
      ? subtaskData.startDate   // Si la subtarea inicia antes, usar su fecha de inicio
      : undefined;              // No sugerir cambio si no hay conflicto en fecha de inicio
    
    const suggestedEndDate = subtaskEndsAfterParent 
      ? subtaskData.endDate     // Si la subtarea termina después, usar su fecha de fin
      : undefined;              // No sugerir cambio si no hay conflicto en fecha de fin

    // Log de depuración para rastrear la lógica de detección de conflictos
    console.log('🔍 DEBUG - validateDateConflict:', {
      subtaskTitle: subtaskData.title,
      subtaskStartsBeforeParent,
      subtaskEndsAfterParent,
      parentTask: { startDate: parentTask.startDate, dueDate: parentTask.dueDate },
      subtaskData: { startDate: subtaskData.startDate, endDate: subtaskData.endDate },
      suggestedStartDate,
      suggestedEndDate
    });

    // Construir mensaje descriptivo del conflicto basado en el tipo de problema
    let conflictMessage = `La subtarea "${subtaskData.title}" tiene fechas que exceden el rango de la tarea padre "${parentTask.title}".`;
    
    // Añadir detalles específicos según el tipo de conflicto detectado
    if (subtaskStartsBeforeParent && subtaskEndsAfterParent) {
      // Conflicto doble: la subtarea excede por ambos extremos
      conflictMessage += ` La subtarea inicia antes (${formatDate(subtaskStart)}) y termina después (${formatDate(subtaskEnd)}) que la tarea padre (${formatDate(parentStart)} - ${formatDate(parentEnd)}).`;
    } else if (subtaskStartsBeforeParent) {
      // Conflicto de inicio: la subtarea inicia antes que el padre
      conflictMessage += ` La subtarea inicia antes (${formatDate(subtaskStart)}) que la tarea padre (${formatDate(parentStart)}).`;
    } else if (subtaskEndsAfterParent) {
      // Conflicto de fin: la subtarea termina después que el padre
      conflictMessage += ` La subtarea termina después (${formatDate(subtaskEnd)}) que la tarea padre (${formatDate(parentEnd)}).`;
    }

    // Retornar resultado con conflicto detectado y fechas sugeridas
    return {
      hasConflict: true,
      message: conflictMessage,
      suggestedParentStartDate: suggestedStartDate,
      suggestedParentEndDate: suggestedEndDate
    };
  }

  // Caso 4: No hay conflicto - las fechas de la subtarea están dentro del rango del padre
  return {
    hasConflict: false,
    message: 'Las fechas de la subtarea están dentro del rango de la tarea padre'
  };
}

/**
 * Formatea una fecha para mostrar en mensajes de usuario
 * 
 * Convierte un objeto Date a una representación legible en español
 * Formato: "15 ene 2024" (día, mes abreviado, año)
 * 
 * @param date - Fecha a formatear (objeto Date)
 * @returns Fecha formateada como string legible
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',    // Año completo (ej: 2024)
    month: 'short',     // Mes abreviado (ej: ene, feb, mar)
    day: 'numeric'      // Día del mes (ej: 1, 15, 31)
  });
}

/**
 * Valida si un rango de fechas es lógicamente correcto
 * 
 * Verifica que la fecha de inicio sea anterior o igual a la fecha de fin.
 * Si alguna fecha no está definida, se considera válido (fechas opcionales).
 * 
 * @param startDate - Fecha de inicio en formato ISO string (opcional)
 * @param endDate - Fecha de fin en formato ISO string (opcional)
 * @returns true si el rango es válido o si las fechas están vacías
 */
export function validateDateRange(startDate?: string, endDate?: string): boolean {
  // Si alguna fecha no está definida, considerar válido (fechas opcionales)
  if (!startDate || !endDate) return true;
  
  // Convertir strings ISO a objetos Date para comparación
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Validar que la fecha de inicio sea anterior o igual a la fecha de fin
  return start <= end;
}

/**
 * Crea los datos de actualización para la tarea padre cuando hay conflicto de fechas
 * 
 * Esta función prepara el objeto de datos necesario para actualizar la tarea padre
 * con las nuevas fechas sugeridas que resuelven el conflicto con la subtarea.
 * Solo actualiza las fechas que realmente necesitan cambio.
 * 
 * @param parentTask - Tarea padre actual con sus fechas originales
 * @param suggestedStartDate - Nueva fecha de inicio sugerida (ISO string, opcional)
 * @param suggestedEndDate - Nueva fecha de fin sugerida (ISO string, opcional)
 * @returns Objeto con los datos necesarios para actualizar la tarea padre
 */
export function createParentUpdateData(
  parentTask: Task,
  suggestedStartDate?: string,
  suggestedEndDate?: string
) {
  const result = {
    id: parentTask.id,  // ID de la tarea padre a actualizar
    // Usar fecha sugerida si existe, sino mantener la fecha original
    startDate: suggestedStartDate || parentTask.startDate?.toString() || null,
    dueDate: suggestedEndDate || parentTask.dueDate?.toString() || null,
    updatedAt: new Date().toISOString()  // Timestamp de la actualización
  };

  console.log('🔧 DEBUG - createParentUpdateData:', {
    input: { suggestedStartDate, suggestedEndDate },
    parentTask: { startDate: parentTask.startDate, dueDate: parentTask.dueDate },
    result: { startDate: result.startDate, dueDate: result.dueDate }
  });

  return result;
}
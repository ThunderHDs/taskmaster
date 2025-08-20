// Importación de React para crear el componente funcional
import React from 'react';
// Componente de botón personalizado de la librería UI
import { Button } from './ui/button';
// Iconos de Lucide React para la interfaz visual del modal
import { AlertTriangle, X, Calendar, Clock } from 'lucide-react';
// Tipo Task de Prisma para tipado de la tarea padre
import { Task } from '@prisma/client';

/**
 * Propiedades del modal de resolución de conflictos de fechas
 * Este modal se muestra cuando una subtarea tiene fechas que entran en conflicto
 * con las fechas de su tarea padre, requiriendo una decisión del usuario
 */
interface DateConflictModalProps {
  isOpen: boolean;                    // Controla la visibilidad del modal
  subtask: {                          // Información de la subtarea que causa el conflicto
    title: string;                    // Título de la subtarea
    startDate?: string;               // Fecha de inicio de la subtarea (ISO string)
    endDate?: string;                 // Fecha de fin de la subtarea (ISO string)
  } | null;
  parentTask: Task | null;            // Información completa de la tarea padre
  conflictDetails: {                  // Detalles específicos del conflicto detectado
    message: string;                  // Mensaje descriptivo del conflicto
    suggestedParentStartDate?: string; // Nueva fecha de inicio sugerida para el padre
    suggestedParentEndDate?: string;   // Nueva fecha de fin sugerida para el padre
  } | null;
  onConfirmKeepSubtask: () => void;   // Callback para confirmar y resolver el conflicto
  onCancel: () => void;               // Callback para cancelar y volver al formulario
  isLoading?: boolean;                // Estado de carga durante la resolución
}

/**
 * Modal de resolución de conflictos de fechas entre subtareas y tareas padre
 * 
 * Este componente maneja la visualización y resolución de conflictos cuando:
 * - Una subtarea tiene fecha de inicio anterior a la tarea padre
 * - Una subtarea tiene fecha de fin posterior a la tarea padre
 * - Ambas condiciones se cumplen simultáneamente
 * 
 * Proporciona opciones para:
 * - Mantener las fechas de la subtarea y actualizar automáticamente el padre
 * - Cancelar y ajustar manualmente las fechas de la subtarea
 */
const DateConflictModal: React.FC<DateConflictModalProps> = ({
  isOpen,                    // Estado de visibilidad del modal
  subtask,                   // Datos de la subtarea en conflicto
  parentTask,                // Datos de la tarea padre
  conflictDetails,           // Información detallada del conflicto
  onConfirmKeepSubtask,      // Función para confirmar y resolver automáticamente
  onCancel,                  // Función para cancelar y permitir ajuste manual
  isLoading = false          // Estado de carga durante el procesamiento
}) => {
  // Renderizado condicional: solo mostrar si el modal está abierto y tiene todos los datos necesarios
  if (!isOpen || !subtask || !parentTask || !conflictDetails) return null;

  /**
   * Formatea una fecha ISO string a formato legible en español
   * Maneja casos de fechas undefined, null o inválidas de forma segura
   * 
   * @param dateString - Fecha en formato ISO string o undefined
   * @returns Fecha formateada en español o mensaje descriptivo
   */
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Sin fecha';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  /**
   * Formatea un rango de fechas (inicio y fin) a texto legible
   * Maneja diferentes combinaciones de fechas definidas/indefinidas
   * 
   * @param startDate - Fecha de inicio en formato ISO string
   * @param endDate - Fecha de fin en formato ISO string
   * @returns Texto descriptivo del rango de fechas
   */
  const formatDateRange = (startDate: string | undefined, endDate: string | undefined) => {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    
    // Caso: ninguna fecha definida
    if (start === 'Sin fecha' && end === 'Sin fecha') {
      return 'Sin fechas definidas';
    }
    
    // Caso: solo fecha de fin definida
    if (start === 'Sin fecha') {
      return `Hasta ${end}`;
    }
    
    // Caso: solo fecha de inicio definida
    if (end === 'Sin fecha') {
      return `Desde ${start}`;
    }
    
    // Caso: ambas fechas definidas
    return `${start} - ${end}`;
  };

  return (
    <>
      {/* Fondo oscuro del modal (backdrop) - clic para cerrar */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onCancel}  // Cerrar modal al hacer clic en el fondo
      >
        {/* Contenedor principal del modal */}
        <div 
          className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 transform transition-all"
          onClick={(e) => e.stopPropagation()}  // Prevenir cierre al hacer clic dentro del modal
        >
          {/* Encabezado del modal con título y botón de cierre */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {/* Sección izquierda: icono y título */}
            <div className="flex items-center gap-3">
              {/* Icono de advertencia en círculo ámbar */}
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              {/* Título descriptivo del modal */}
              <h3 className="text-lg font-semibold text-gray-900">
                Conflicto de fechas detectado
              </h3>
            </div>
            {/* Botón de cierre (X) en la esquina superior derecha */}
            <button
              onClick={onCancel}  // Cerrar modal sin resolver conflicto
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenido principal del modal */}
          <div className="p-6">
            {/* Mensaje explicativo del conflicto detectado */}
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                {/* Descripción detallada del conflicto */}
                {conflictDetails.message}
              </p>
            </div>

            {/* Sección de detalles de las tareas involucradas */}
            <div className="space-y-4 mb-6">
              {/* Información de la tarea padre */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start gap-3">
                  {/* Icono de calendario para la tarea padre */}
                  <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    {/* Título y nombre de la tarea padre */}
                    <h4 className="font-medium text-blue-900 mb-2">Tarea padre:</h4>
                    <p className="text-blue-800 font-medium mb-2">"{parentTask.title}"</p>
                    <div className="text-sm text-blue-700">
                      {/* Fechas actuales de la tarea padre */}
                      <p>Fecha actual: {formatDateRange(parentTask.startDate?.toString(), parentTask.dueDate?.toString())}</p>
                      {/* Fechas sugeridas para resolver el conflicto (si existen) */}
                      {(conflictDetails.suggestedParentStartDate || conflictDetails.suggestedParentEndDate) && (
                        <p className="mt-1 font-medium">
                          Nueva fecha sugerida: {formatDateRange(
                            conflictDetails.suggestedParentStartDate || parentTask.startDate?.toString(), 
                            conflictDetails.suggestedParentEndDate || parentTask.dueDate?.toString()
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Información de la subtarea que causa el conflicto */}
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-start gap-3">
                  {/* Icono de reloj para la subtarea */}
                  <Clock className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    {/* Título y nombre de la subtarea */}
                    <h4 className="font-medium text-green-900 mb-2">Subtarea:</h4>
                    <p className="text-green-800 font-medium mb-2">"{subtask.title}"</p>
                    <div className="text-sm text-green-700">
                      {/* Fechas de la subtarea que generan el conflicto */}
                      <p>Fecha: {formatDateRange(subtask.startDate, subtask.endDate)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección de advertencia con opciones disponibles */}
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
              <div className="flex items-start gap-2">
                {/* Icono de advertencia */}
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  {/* Pregunta principal al usuario */}
                  <p className="text-amber-800 font-medium mb-1">
                    ¿Qué deseas hacer?
                  </p>
                  {/* Lista de opciones disponibles con explicaciones */}
                  <ul className="text-amber-700 text-sm space-y-1">
                    <li>• <strong>Mantener subtarea:</strong> Se actualizará automáticamente la fecha de la tarea padre</li>
                    <li>• <strong>Cancelar:</strong> Volver al formulario para ajustar las fechas de la subtarea</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer con botones de acción */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            {/* Botón para cancelar y volver al formulario */}
            <Button
              type="button"
              variant="outline"  // Estilo secundario (outline)
              onClick={onCancel}  // Cerrar modal sin resolver conflicto
              disabled={isLoading}  // Deshabilitado durante el procesamiento
              className="px-4 py-2"
            >
              Cancelar y ajustar fechas
            </Button>
            {/* Botón principal para confirmar y resolver automáticamente */}
            <Button
              type="button"
              onClick={onConfirmKeepSubtask}  // Ejecutar resolución automática del conflicto
              disabled={isLoading}  // Deshabilitado durante el procesamiento
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white"  // Estilo de advertencia
            >
              {/* Contenido condicional: spinner de carga o texto normal */}
              {isLoading ? (
                <>
                  {/* Spinner animado durante el procesamiento */}
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                // Texto cuando no está cargando
                'Mantener subtarea y actualizar padre'
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export { DateConflictModal };
export default DateConflictModal;
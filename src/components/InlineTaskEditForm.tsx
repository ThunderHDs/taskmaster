// Importaciones necesarias para React y manejo de estado
import React, { useState } from 'react';
// Iconos de Lucide React para la interfaz de usuario
import { AlertCircle, Tag as TagIcon, X } from 'lucide-react';
// Tipos TypeScript para definir la estructura de datos
import { Task, Tag, Priority } from '../types/task';
// Componente personalizado para selección de rangos de fechas y utilidades de validación
import { DateRangePicker, validateDate, formatDateToISO } from './DateRangePicker';
// Modal para manejar conflictos de fechas entre tareas padre e hijas
import DateConflictModal from './DateConflictModal';
// Utilidades para detectar y resolver conflictos de fechas
import { validateDateConflict, createParentUpdateData, SubtaskData, ConflictResult } from '../utils/dateConflictUtils';

/**
 * Props del componente InlineTaskEditForm
 * Define todas las propiedades necesarias para editar una tarea existente
 */
interface InlineTaskEditFormProps {
  task: Task;                                                                    // Tarea a editar con todos sus datos actuales
  availableTags: Tag[];                                                          // Lista de etiquetas disponibles para asignar
  onSave: (taskData: Partial<Task>) => Promise<void>;                          // Callback para guardar los cambios de la tarea
  onCancel: () => void;                                                         // Callback para cancelar la edición
  isLoading?: boolean;                                                          // Estado de carga para deshabilitar controles
  parentTask?: {                                                                // Información de la tarea padre (si es una subtarea)
    id: string;                                                                 // ID de la tarea padre
    title: string;                                                              // Título de la tarea padre
    startDate?: string;                                                         // Fecha de inicio de la tarea padre
    dueDate?: string;                                                           // Fecha de vencimiento de la tarea padre
  };
  onParentTaskUpdate?: (parentId: string, parentData: Partial<Task>) => Promise<void>; // Callback para actualizar la tarea padre si hay conflictos
}

/**
 * Opciones de prioridad disponibles para las tareas
 * Cada opción incluye el valor interno y la etiqueta mostrada al usuario
 */
const priorityOptions = [
  { value: 'low' as Priority, label: 'Low' },         // Prioridad baja
  { value: 'medium' as Priority, label: 'Medium' },   // Prioridad media
  { value: 'high' as Priority, label: 'High' },       // Prioridad alta
  { value: 'urgent' as Priority, label: 'Urgent' }    // Prioridad urgente
];

/**
 * Componente de formulario inline para editar tareas existentes
 * 
 * Características principales:
 * - Edición en línea sin modal separado
 * - Validación en tiempo real
 * - Detección y resolución de conflictos de fechas
 * - Soporte para tareas padre e hijas
 * - Manejo de etiquetas con colores personalizados
 * 
 * @param props - Propiedades del componente
 * @returns JSX Element del formulario de edición de tareas
 */
const InlineTaskEditForm: React.FC<InlineTaskEditFormProps> = ({
  task,                    // Tarea a editar
  availableTags,           // Etiquetas disponibles para asignar
  onSave,                  // Función para guardar cambios
  onCancel,                // Función para cancelar edición
  isLoading = false,       // Estado de carga
  parentTask,              // Información de tarea padre (opcional)
  onParentTaskUpdate       // Función para actualizar tarea padre (opcional)
}) => {
  /**
   * Estado principal del formulario inicializado con los datos de la tarea existente
   * Incluye validación de fechas para asegurar formato correcto
   */
  const [formData, setFormData] = useState({
    title: task.title,                                    // Título actual de la tarea
    description: task.description || '',                  // Descripción actual (vacía si no existe)
    priority: task.priority,                              // Prioridad actual
    startDate: validateDate(task.startDate),              // Fecha de inicio validada
    dueDate: validateDate(task.dueDate),                  // Fecha de vencimiento validada
    tagIds: task.tags?.map(tag => tag.id) || []           // IDs de etiquetas actuales
  });

  /**
   * Estados para la detección y manejo de conflictos de fechas
   * Necesarios cuando se editan subtareas que pueden entrar en conflicto con la tarea padre
   */
  const [showConflictModal, setShowConflictModal] = useState(false);                    // Controla la visibilidad del modal de conflictos
  const [conflictDetails, setConflictDetails] = useState<ConflictResult | null>(null);   // Detalles del conflicto detectado
  const [pendingTaskData, setPendingTaskData] = useState<any>(null);                    // Datos de la tarea pendientes de guardar
  const [isProcessingConflict, setIsProcessingConflict] = useState(false);              // Estado de procesamiento de conflictos
  
  // Estado para manejar errores de validación por campo
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Maneja la confirmación del usuario para mantener las fechas de la subtarea
   * y ajustar automáticamente las fechas de la tarea padre si es necesario
   * 
   * Flujo de resolución de conflictos:
   * 1. Actualiza la tarea padre con las fechas sugeridas (si aplica)
   * 2. Guarda la subtarea con las fechas que causaron el conflicto
   * 3. Cierra el modal y limpia los estados temporales
   */
  const handleConfirmKeepSubtask = async () => {
    if (!pendingTaskData || !conflictDetails) return;
    
    setIsProcessingConflict(true);
    
    try {
      // Actualizar tarea padre si es necesario y se proporcionaron los callbacks
      if (conflictDetails && parentTask && onParentTaskUpdate) {
        // Crear los datos de actualización para la tarea padre
        const parentUpdateData = createParentUpdateData(
          parentTask,
          conflictDetails.suggestedParentStartDate,
          conflictDetails.suggestedParentEndDate
        );
        
        // Preparar datos en el formato esperado por el callback
        const updateData = {
          startDate: parentUpdateData.startDate,
          dueDate: parentUpdateData.dueDate
        };
        
        console.log('📤 DEBUG - InlineTaskEditForm onParentTaskUpdate:', {
          parentTaskId: parentTask.id,
          updateData
        });
        
        // Ejecutar la actualización de la tarea padre
        await onParentTaskUpdate(parentTask.id, updateData);
      }
      
      // Guardar la subtarea con las fechas que causaron el conflicto
      await onSave(pendingTaskData);
      
      // Limpiar estados del modal de conflictos
      setShowConflictModal(false);
      setConflictDetails(null);
      setPendingTaskData(null);
    } catch (error) {
      console.error('Error handling conflict resolution:', error);
      alert('Error updating task. Please try again.');
    } finally {
      setIsProcessingConflict(false);
    }
  };
  
  /**
   * Maneja la cancelación del modal de conflictos de fechas
   * Limpia los estados temporales pero mantiene el formulario de edición abierto
   * para que el usuario pueda ajustar las fechas manualmente
   */
  const handleCancelConflict = () => {
    setShowConflictModal(false);
    setConflictDetails(null);
    setPendingTaskData(null);
    // No llamar onCancel() aquí para mantener el formulario abierto
  };

  /**
   * Maneja los cambios en los campos de texto del formulario
   * Actualiza el estado del formulario y limpia errores de validación
   * 
   * @param {string} field - Nombre del campo que cambió
   * @param {string} value - Nuevo valor del campo
   */
  const handleInputChange = (field: string, value: string) => {
    // Actualizar el estado del formulario con el nuevo valor
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error de validación cuando el usuario comienza a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };



  /**
   * Valida todos los campos del formulario antes del envío
   * 
   * Validaciones implementadas:
   * - Título: obligatorio y no vacío
   * - Fechas: no pueden estar en el pasado
   * - Rango: fecha de inicio no puede ser posterior a fecha de fin
   * 
   * @returns {boolean} true si el formulario es válido, false en caso contrario
   */
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validación del título (campo obligatorio)
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    // Validaciones de fechas - crear fecha actual usando componentes individuales para evitar problemas de zona horaria
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Validar que la fecha de inicio no esté en el pasado
    if (formData.startDate) {
      if (formData.startDate < today) {
        newErrors.dateRange = 'Start date cannot be in the past';
      }
    }
    
    // Validar que la fecha de fin no esté en el pasado
    if (formData.dueDate) {
      if (formData.dueDate < today) {
        newErrors.dateRange = 'End date cannot be in the past';
      }
    }
    
    // Validación de rango: fecha de inicio no puede ser posterior a fecha de fin
    if (formData.startDate && formData.dueDate) {
      if (formData.startDate > formData.dueDate) {
        newErrors.dateRange = 'Start date cannot be after end date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Maneja el envío del formulario de edición de tareas
   * 
   * Flujo de procesamiento:
   * 1. Valida todos los campos del formulario
   * 2. Aplica lógica de negocio (auto-asignar fecha de inicio si solo hay fecha de fin)
   * 3. Verifica conflictos de fechas si es una subtarea
   * 4. Guarda la tarea o muestra modal de conflictos
   * 
   * @param {React.FormEvent} e - Evento del formulario
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulario y verificar que no esté en estado de carga
    if (!validateForm() || isLoading) {
      return;
    }

    try {
      // Lógica de negocio: auto-asignar fecha actual como fecha de inicio si solo se proporciona fecha de fin
      let startDate = formData.startDate;
      if (!startDate && formData.dueDate) {
        // Crear fecha actual usando componentes individuales para evitar problemas de zona horaria
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
      
      // Preparar datos para guardar, limpiando espacios en blanco y formateando fechas
      const saveData = {
        title: formData.title.trim(),                    // Título sin espacios al inicio/final
        description: formData.description.trim() || null, // Descripción limpia o null si está vacía
        priority: formData.priority,                     // Prioridad seleccionada
        startDate: formatDateToISO(startDate),           // Fecha de inicio en formato ISO
        dueDate: formatDateToISO(formData.dueDate),      // Fecha de fin en formato ISO
        tagIds: formData.tagIds                          // IDs de etiquetas seleccionadas
      };
      
      // Verificar conflictos de fechas si esta es una subtarea (tiene parentTask)
      if (parentTask) {
        // Preparar datos de la subtarea para validación de conflictos
        const subtaskData: SubtaskData = {
          title: saveData.title,
          startDate: saveData.startDate,
          endDate: saveData.dueDate
        };
        
        // Validar si hay conflictos con las fechas de la tarea padre
        const conflictResult = validateDateConflict(subtaskData, parentTask);
        
        if (conflictResult.hasConflict) {
          // Mostrar modal de conflictos para que el usuario decida cómo proceder
          setConflictDetails(conflictResult);
          setPendingTaskData(saveData);
          setShowConflictModal(true);
          return; // Detener el proceso hasta que se resuelva el conflicto
        }
      }
      
      // Guardar la tarea si no hay conflictos
      await onSave(saveData);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  /**
   * Maneja la selección/deselección de etiquetas
   * Alterna el estado de una etiqueta: la agrega si no está seleccionada, la quita si ya está
   * 
   * @param {string} tagId - ID de la etiqueta a alternar
   */
  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)  // Quitar etiqueta si ya está seleccionada
        : [...prev.tagIds, tagId]                 // Agregar etiqueta si no está seleccionada
    }));
  };

  /**
   * Maneja los eventos de teclado en el formulario
   * Permite cancelar la edición con la tecla Escape desde campos de entrada
   * 
   * @param {React.KeyboardEvent} e - Evento de teclado
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Solo manejar Escape si proviene de un input, textarea o select, no de componentes hijos
    if (e.key === 'Escape' && (e.target as HTMLElement).tagName.match(/^(INPUT|TEXTAREA|SELECT)$/)) {
      onCancel();
    }
  };

  return (
    // Contenedor principal del formulario de edición con fondo gris claro y bordes redondeados
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-3 space-y-4">
      {/* Formulario con manejo de envío y eventos de teclado */}
      <form onSubmit={handleSubmit} className="space-y-4" onKeyDown={handleKeyDown}>
        {/* Campo de título - obligatorio */}
        <div>
          <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            id="edit-title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.title ? 'border-red-300' : 'border-gray-300'  // Borde rojo si hay error
            }`}
            placeholder="Enter task title..."
            disabled={isLoading}  // Deshabilitado durante la carga
            autoFocus             // Foco automático al abrir el formulario
          />
          {/* Mensaje de error para el título */}
          {errors.title && (
            <div className="flex items-center mt-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.title}
            </div>
          )}
        </div>

        {/* Campo de descripción - opcional */}
        <div>
          <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="edit-description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3} // Altura fija de 3 líneas
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.description ? 'border-red-300' : 'border-gray-300' // Borde rojo si hay error
            }`}
            placeholder="Enter task description..."
            disabled={isLoading}  // Deshabilitado durante la carga
          />
          {/* Mensaje de error para la descripción */}
          {errors.description && (
            <div className="flex items-center mt-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.description}
            </div>
          )}
        </div>

        {/* Campo de prioridad - selector desplegable */}
        <div>
          <label htmlFor="edit-priority" className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            id="edit-priority"
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}  // Deshabilitado durante la carga
          >
            {/* Renderizar opciones de prioridad dinámicamente */}
            {priorityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de rango de fechas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <DateRangePicker
            startDate={formData.startDate}    // Fecha de inicio actual
            endDate={formData.dueDate}        // Fecha de fin actual
            onDateChange={(start, end) => {
              // Actualizar fechas en el estado del formulario
              setFormData({ ...formData, startDate: start, dueDate: end });
              
              // Limpiar errores de rango de fechas cuando el usuario hace cambios
              if (errors.dateRange) {
                setErrors({ ...errors, dateRange: '' });
              }
            }}
            error={errors.dateRange}  // Mostrar error si existe
          />
          {/* Mensaje de error para el rango de fechas */}
          {errors.dateRange && (
            <div className="flex items-center mt-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.dateRange}
            </div>
          )}
        </div>

        {/* Sección de etiquetas - solo se muestra si hay etiquetas disponibles */}
        {availableTags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            {/* Contenedor flexible para las etiquetas con espaciado */}
            <div className="flex flex-wrap gap-2">
              {/* Renderizar cada etiqueta disponible como un botón toggleable */}
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"  // Evitar envío del formulario
                  onClick={() => handleTagToggle(tag.id)}  // Alternar selección de etiqueta
                  disabled={isLoading}  // Deshabilitado durante la carga
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                    formData.tagIds.includes(tag.id)
                      ? 'text-white border-transparent'  // Estilo para etiqueta seleccionada
                      : 'text-gray-700 border-gray-300 bg-white hover:bg-gray-50'  // Estilo para etiqueta no seleccionada
                  }`}
                  style={{
                    // Aplicar color de fondo personalizado solo si la etiqueta está seleccionada
                    backgroundColor: formData.tagIds.includes(tag.id) ? tag.color : undefined
                  }}
                >
                  <TagIcon className="w-3 h-3 mr-1" />  {/* Icono de etiqueta */}
                  {/* Nombre de la etiqueta */}
                    {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Botones de acción del formulario */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          {/* Botón Cancelar - descarta cambios y cierra el formulario */}
          <button
            type="button"  // No envía el formulario
            onClick={onCancel}  // Ejecuta callback de cancelación
            disabled={isLoading}  // Deshabilitado durante la carga
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          {/* Botón Actualizar - envía el formulario para guardar cambios */}
          <button
            type="submit"  // Envía el formulario
            disabled={isLoading}  // Deshabilitado durante la carga
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {/* Texto dinámico basado en el estado de carga */}
            {isLoading ? 'Saving...' : 'Update Task'}
          </button>
        </div>
      </form>

      {/* Modal de conflictos de fechas - se muestra cuando hay conflictos entre subtarea y tarea padre */}
      <DateConflictModal
        isOpen={showConflictModal}  // Controla la visibilidad del modal
        subtask={pendingTaskData ? {  // Datos de la subtarea que causa el conflicto
          title: pendingTaskData.title,
          startDate: pendingTaskData.startDate,
          endDate: pendingTaskData.dueDate
        } : undefined}
        parentTask={parentTask}  // Información de la tarea padre
        conflictDetails={conflictDetails}  // Detalles específicos del conflicto detectado
        onConfirmKeepSubtask={handleConfirmKeepSubtask}  // Callback para mantener fechas de subtarea
        onCancel={handleCancelConflict}  // Callback para cancelar y cerrar modal
        isLoading={isProcessingConflict}  // Estado de carga durante resolución de conflictos
      />
    </div>
  );
};

export default InlineTaskEditForm;
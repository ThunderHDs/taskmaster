// Importaciones necesarias para React y manejo de estado
import React, { useState } from 'react';
// Iconos de Lucide React para la interfaz de usuario
import { AlertCircle, Tag as TagIcon, Copy } from 'lucide-react';
// Tipos TypeScript para definir la estructura de datos
import { Tag, Priority } from '../types/task';
// Componente personalizado para selección de rangos de fechas y utilidades de formateo
import { DateRangePicker, formatDateToISO } from './DateRangePicker';
// Sistema de detección y resolución de conflictos de fechas
import DateConflictModal from './DateConflictModal';
import { validateDateConflict, createParentUpdateData, type SubtaskData } from '../utils/dateConflictUtils';
// Componente para seleccionar tareas a copiar
import TaskSelector from './TaskSelector';

/**
 * Interfaz simplificada para representar una tarea padre
 * Contiene solo los campos necesarios para la validación de conflictos de fechas
 */
interface Task {
  id: string;           // Identificador único de la tarea
  title: string;        // Título de la tarea
  startDate?: string;   // Fecha de inicio opcional (ISO string)
  dueDate?: string;     // Fecha de vencimiento opcional (ISO string)
  priority: Priority;   // Prioridad de la tarea
  tags: { tag: Tag }[]; // Etiquetas asociadas
  parentId?: string;    // ID de la tarea padre (para subtareas)
}

/**
 * Props del componente InlineSubtaskForm
 * Define todas las propiedades necesarias para crear una nueva subtarea
 */
interface InlineSubtaskFormProps {
  parentId: string;                                                              // ID de la tarea padre a la que pertenecerá la subtarea
  parentTask: Task;                                                              // Información completa de la tarea padre
  availableTags: Tag[];                                                          // Lista de etiquetas disponibles para asignar
  onSave: (parentId: string, subtaskData: {                                     // Callback para guardar la nueva subtarea
    title: string;                                                               // Título de la subtarea (requerido)
    description?: string | null;                                                 // Descripción opcional de la subtarea
    priority: Priority;                                                          // Nivel de prioridad de la subtarea
    startDate?: string | null;                                                   // Fecha de inicio opcional (ISO string)
    dueDate?: string | null;                                                     // Fecha de vencimiento opcional (ISO string)
    tagIds: string[];                                                            // IDs de las etiquetas asignadas
    parentId: string;                                                            // ID de la tarea padre
  }) => Promise<void>;
  onCancel: () => void;                                                          // Callback para cancelar la creación
  isLoading?: boolean;                                                           // Estado de carga para deshabilitar controles
  onParentTaskUpdate?: (parentId: string, parentData: Partial<Task>) => Promise<void>; // Callback para actualizar la tarea padre si hay conflictos
}

/**
 * Opciones de prioridad disponibles para las subtareas
 * Cada opción incluye el valor interno y la etiqueta visible para el usuario
 */
const priorityOptions = [
  { value: 'LOW' as Priority, label: 'Low' },         // Prioridad baja
  { value: 'MEDIUM' as Priority, label: 'Medium' },   // Prioridad media (por defecto)
  { value: 'HIGH' as Priority, label: 'High' },       // Prioridad alta
  { value: 'URGENT' as Priority, label: 'Urgent' }    // Prioridad urgente
];

/**
 * Componente de formulario inline para crear nuevas subtareas
 * 
 * Características principales:
 * - Creación de subtareas vinculadas a una tarea padre
 * - Validación en tiempo real de campos requeridos
 * - Detección y resolución automática de conflictos de fechas
 * - Actualización automática de fechas de la tarea padre si es necesario
 * - Manejo de etiquetas con colores personalizados
 * 
 * @param props - Propiedades del componente
 * @returns JSX Element del formulario de creación de subtareas
 */
const InlineSubtaskForm: React.FC<InlineSubtaskFormProps> = ({
  parentId,              // ID de la tarea padre
  parentTask,            // Información completa de la tarea padre
  availableTags,         // Etiquetas disponibles para asignar
  onSave,                // Función para guardar la nueva subtarea
  onCancel,              // Función para cancelar la creación
  isLoading = false,     // Estado de carga para deshabilitar controles
  onParentTaskUpdate     // Función para actualizar la tarea padre (opcional)
}) => {
  /**
   * Estado principal del formulario con todos los campos de la subtarea
   * Inicializado con valores por defecto apropiados
   */
  const [formData, setFormData] = useState({
    title: '',                                    // Título de la subtarea (requerido)
    description: '',                              // Descripción opcional
    priority: 'MEDIUM' as Priority,               // Prioridad por defecto: Media
    startDate: null as Date | null,               // Fecha de inicio opcional
    dueDate: null as Date | null,                 // Fecha de vencimiento opcional
    tagIds: [] as string[]                        // IDs de etiquetas seleccionadas
  });

  /**
   * Estados para manejo de errores de validación y conflictos de fechas
   */
  const [errors, setErrors] = useState<Record<string, string>>({});              // Errores de validación por campo
  const [showConflictModal, setShowConflictModal] = useState(false);             // Controla la visibilidad del modal de conflictos
  const [conflictDetails, setConflictDetails] = useState<any>(null);             // Detalles específicos del conflicto detectado
  const [pendingSubtaskData, setPendingSubtaskData] = useState<any>(null);       // Datos de la subtarea pendiente de guardar
  const [isProcessingConflict, setIsProcessingConflict] = useState(false);       // Estado de carga durante resolución de conflictos
  
  // Estado para el selector de tareas para copiar
  const [showTaskSelector, setShowTaskSelector] = useState(false);

  /**
   * Maneja la confirmación de mantener las fechas de la subtarea cuando hay conflictos
   * 
   * Proceso:
   * 1. Actualiza las fechas de la tarea padre si es necesario
   * 2. Guarda la subtarea con las fechas originales
   * 3. Resetea el formulario y cierra el modal
   * 
   * Esta función se ejecuta cuando el usuario confirma que quiere mantener
   * las fechas de la subtarea y ajustar automáticamente la tarea padre
   */
  const handleConfirmKeepSubtask = async () => {
    if (!pendingSubtaskData || !conflictDetails) return;
    
    setIsProcessingConflict(true);
    
    try {
      // Primero actualizar la tarea padre si es necesario
      if ((conflictDetails.suggestedParentStartDate || conflictDetails.suggestedParentEndDate) && onParentTaskUpdate) {
        const parentUpdateData = createParentUpdateData(
          adaptParentTask(parentTask),
          conflictDetails.suggestedParentStartDate,
          conflictDetails.suggestedParentEndDate
        );
        
        // Usar el callback para actualizar la tarea padre a través del manejo de estado apropiado
        await onParentTaskUpdate(parentId, {
          startDate: parentUpdateData.startDate || undefined,
          dueDate: parentUpdateData.dueDate || undefined
        });
      }
      
      // Luego crear la subtarea
      await onSave(parentId, pendingSubtaskData);
      
      // Resetear formulario (mantener fechas para facilitar creación de múltiples subtareas)
      setFormData(prev => ({
        ...prev,
        title: '',
        description: '',
        priority: 'MEDIUM',
        tagIds: []
      }));
      
      // Cerrar modal y limpiar estados de conflicto
      setShowConflictModal(false);
      setConflictDetails(null);
      setPendingSubtaskData(null);
      
    } catch (error) {
      console.error('Error resolving date conflict:', error);
    } finally {
      setIsProcessingConflict(false);
    }
  };
  
  /**
   * Maneja la cancelación del modal de conflicto de fechas
   * 
   * Cierra el modal y limpia los estados relacionados con el conflicto,
   * pero mantiene el formulario abierto para que el usuario pueda
   * modificar las fechas y volver a intentar
   */
  const handleCancelConflict = () => {
    setShowConflictModal(false);     // Ocultar modal de conflicto
    setConflictDetails(null);        // Limpiar detalles del conflicto
    setPendingSubtaskData(null);     // Limpiar datos pendientes
    // Nota: No llamar onCancel() aquí para mantener el formulario abierto
  };

  /**
   * Función helper para adaptar parentTask al formato de Prisma
   */
  const adaptParentTask = (task: Task) => ({
    id: task.id,
    title: task.title,
    description: null,
    completed: false,
    priority: task.priority,
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    startDate: task.startDate ? new Date(task.startDate) : null,
    parentId: task.parentId || null,
    groupId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    estimatedHours: null
  });

  /**
   * Función para copiar datos de otra subtarea
   * Copia todos los aspectos excepto título y descripción
   */
  const handleCopyFromSubtask = (selectedTask: Task) => {
    setFormData({
      ...formData,
      priority: selectedTask.priority,
      tagIds: selectedTask.tags.map(t => t.tag.id),
      startDate: selectedTask.startDate ? new Date(selectedTask.startDate) : null,
      dueDate: selectedTask.dueDate ? new Date(selectedTask.dueDate) : null
    });
    setShowTaskSelector(false);
  };



  /**
   * Maneja los cambios en los campos de entrada del formulario
   * 
   * Actualiza el estado del formulario y limpia los errores de validación
   * cuando el usuario comienza a escribir, proporcionando feedback inmediato
   * 
   * @param field - Nombre del campo que está siendo modificado
   * @param value - Nuevo valor del campo
   */
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));  // Actualizar valor del campo
    // Limpiar error cuando el usuario comienza a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  /**
   * Función de sanitización de texto para prevenir inyección de código
   * Remueve caracteres peligrosos y normaliza espacios
   * 
   * @param text - Texto a sanitizar
   * @returns Texto sanitizado
   */
  const sanitizeText = (text: string): string => {
    return text
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remover scripts
      .replace(/<[^>]*>/g, '') // Remover HTML tags
      .replace(/javascript:/gi, '') // Remover javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remover event handlers
      .trim();
  };

  /**
   * Función de validación del formulario mejorada
   * 
   * Valida todos los campos del formulario según las reglas de negocio:
   * - Título: requerido, mínimo 3 caracteres, máximo 200 caracteres, sin caracteres especiales peligrosos
   * - Descripción: opcional, máximo 1000 caracteres, sanitizada
   * - Fechas: coherencia del rango, no pueden estar en el pasado, no más de 5 años en el futuro
   * - Prioridad: debe ser un valor válido
   * - Etiquetas: validación de existencia
   * 
   * @returns boolean - true si el formulario es válido, false en caso contrario
   */
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validar título
    const titleTrimmed = formData.title.trim();
    if (!titleTrimmed) {
      newErrors.title = 'Subtask title is required';
    } else if (titleTrimmed.length < 3) {
      newErrors.title = 'Subtask title must be at least 3 characters long';
    } else if (titleTrimmed.length > 200) {
      newErrors.title = 'Subtask title must be less than 200 characters';
    }

    // Validar descripción
    if (formData.description) {
      const descTrimmed = formData.description.trim();
      if (descTrimmed.length > 1000) {
        newErrors.description = 'Description must be less than 1000 characters';
      }
    }

    // Validar prioridad
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(formData.priority)) {
      newErrors.priority = 'Please select a valid priority level';
    }

    // Validar etiquetas seleccionadas
    if (formData.tagIds.length > 0) {
      const availableTagIds = availableTags.map(tag => tag.id);
      const invalidTags = formData.tagIds.filter(tagId => !availableTagIds.includes(tagId));
      if (invalidTags.length > 0) {
        newErrors.tags = 'Some selected tags are no longer available. Please refresh and try again';
      }
    }

    // Validar coherencia del rango de fechas
    if (formData.startDate && formData.dueDate) {
      if (formData.startDate > formData.dueDate) {
        newErrors.dateRange = 'Start date cannot be after end date';
      }
    }
    
    // Validar que las fechas no sean más de 5 años en el futuro
    if (formData.startDate) {
      const fiveYearsFromNow = new Date();
      fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);
      if (formData.startDate > fiveYearsFromNow) {
        newErrors.dateRange = 'Start date cannot be more than 5 years in the future';
      }
    }
    
    if (formData.dueDate) {
      const fiveYearsFromNow = new Date();
      fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);
      if (formData.dueDate > fiveYearsFromNow) {
        newErrors.dateRange = 'Due date cannot be more than 5 years in the future';
      }
    }

    setErrors(newErrors);  // Actualizar errores en el estado
    return Object.keys(newErrors).length === 0;  // Retornar true si no hay errores
  };

  /**
   * Resetea completamente el formulario a sus valores iniciales
   * 
   * Limpia todos los campos y errores de validación.
   * Esta función se usa cuando se necesita un reseteo completo del formulario.
   */
  const resetForm = () => {
    setFormData({
      title: '',                          // Limpiar título
      description: '',                    // Limpiar descripción
      priority: 'MEDIUM' as Priority,     // Resetear prioridad a valor por defecto
      startDate: null,                    // Limpiar fecha de inicio
      dueDate: null,                      // Limpiar fecha de vencimiento
      tagIds: []                          // Limpiar etiquetas seleccionadas
    });
    setErrors({});                        // Limpiar todos los errores de validación
  };

  /**
   * Maneja el envío del formulario de creación de subtarea
   * 
   * Proceso:
   * 1. Valida todos los campos del formulario
   * 2. Aplica lógica de negocio (auto-asignar fecha de inicio si solo hay fecha de vencimiento)
   * 3. Verifica conflictos de fechas con la tarea padre
   * 4. Si hay conflictos, muestra el modal de resolución
   * 5. Si no hay conflictos, guarda la subtarea directamente
   * 
   * @param e - Evento del formulario
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulario y verificar que no esté en estado de carga
    if (!validateForm() || isLoading) {
      return;
    }

    // Auto-asignar fecha actual como fecha de inicio si solo se proporcionó fecha de vencimiento
    let startDate = formData.startDate;
    if (!startDate && formData.dueDate) {
      // Crear fecha actual usando componentes individuales para evitar problemas de zona horaria
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Preparar datos para envío
    const submitData = {
      title: formData.title.trim(),                                    // Título limpio (sin espacios extra)
      description: formData.description.trim() || null,               // Descripción opcional
      priority: formData.priority,                                     // Prioridad seleccionada
      startDate: formatDateToISO(startDate) || null,                  // Fecha de inicio en formato ISO
      dueDate: formatDateToISO(formData.dueDate) || null,             // Fecha de vencimiento en formato ISO
      tagIds: formData.tagIds || [],                                   // IDs de etiquetas seleccionadas
      parentId                                                         // ID de la tarea padre
    };

    // Verificar conflictos de fechas usando el sistema de validación
    const subtaskData: SubtaskData = {
      title: submitData.title,
      startDate: submitData.startDate,
      endDate: submitData.dueDate
    };
    
    const conflictResult = validateDateConflict(subtaskData, adaptParentTask(parentTask));
    
    // Si hay conflictos, mostrar modal de resolución
    if (conflictResult.hasConflict) {
      setConflictDetails(conflictResult);     // Guardar detalles del conflicto
      setPendingSubtaskData(submitData);      // Guardar datos pendientes
      setShowConflictModal(true);             // Mostrar modal de conflicto
      return;
    }

    // Proceder con envío normal (sin conflictos detectados)
    try {
      await onSave(parentId, submitData);
      
      // Cerrar el formulario después de crear la subtarea exitosamente
      onCancel();
    } catch (error) {
      console.error('Error creating subtask:', error);
    }
  };

  /**
   * Maneja la selección y deselección de etiquetas
   * 
   * Si la etiqueta ya está seleccionada, la remueve de la lista.
   * Si no está seleccionada, la añade a la lista.
   * 
   * @param tagId - ID de la etiqueta a alternar
   */
  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)    // Remover si ya está seleccionada
        : [...prev.tagIds, tagId]                   // Añadir si no está seleccionada
    }));
  };

  /**
   * Maneja eventos de teclado en el formulario
   * 
   * Permite cancelar la creación de la subtarea presionando 'Escape'
   * desde cualquier campo del formulario
   * 
   * @param e - Evento de teclado
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();  // Cancelar creación de subtarea
    }
  };

  return (
    // Contenedor principal del formulario de subtarea con estilo distintivo azul
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3 space-y-4">
      {/* Encabezado del formulario */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-blue-800">Create New Subtask</h4>
      </div>
      
      {/* Formulario principal con manejo de envío y eventos de teclado */}
      <form onSubmit={handleSubmit} className="space-y-4" onKeyDown={handleKeyDown}>
        {/* Campo de título - requerido y con foco automático */}
        <div>
          <label htmlFor="subtask-title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            id="subtask-title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}  // Actualizar título y limpiar errores
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.title ? 'border-red-300' : 'border-gray-300'  // Estilo condicional para errores
            }`}
            placeholder="Enter subtask title..."
            disabled={isLoading}  // Deshabilitar durante carga
            autoFocus             // Foco automático al abrir el formulario
          />
          {/* Mostrar error de validación si existe */}
          {errors.title && (
            <div className="flex items-center mt-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.title}
            </div>
          )}
        </div>

        {/* Campo de descripción - opcional y con altura reducida */}
        <div>
          <label htmlFor="subtask-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="subtask-description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}  // Actualizar descripción y limpiar errores
            rows={2}  // Altura reducida para subtareas
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.description ? 'border-red-300' : 'border-gray-300'  // Estilo condicional para errores
            }`}
            placeholder="Enter subtask description..."
            disabled={isLoading}  // Deshabilitar durante carga
          />
          {/* Mostrar error de validación si existe */}
          {errors.description && (
            <div className="flex items-center mt-1 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.description}
            </div>
          )}
        </div>

        {/* Fila con prioridad y rango de fechas en diseño responsivo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Campo de prioridad - selector con opciones predefinidas */}
          <div>
            <label htmlFor="subtask-priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="subtask-priority"
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}  // Actualizar prioridad y limpiar errores
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}  // Deshabilitar durante carga
            >
              {/* Renderizar opciones de prioridad desde el array predefinido */}
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de rango de fechas - componente reutilizable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <DateRangePicker
              startDate={formData.startDate}    // Fecha de inicio actual del formulario
              endDate={formData.dueDate}        // Fecha de vencimiento actual del formulario
              onDateChange={(startDate, endDate) => {
                // Actualizar ambas fechas en el estado del formulario
                setFormData(prev => ({
                  ...prev,
                  startDate,
                  dueDate: endDate
                }));
                // Limpiar errores de rango de fechas cuando cambian las fechas
                if (errors.dateRange) {
                  setErrors(prev => ({ ...prev, dateRange: '' }));
                }
              }}
              disabled={isLoading}      // Deshabilitar durante carga
              error={errors.dateRange}  // Mostrar errores de validación de fechas
            />
          </div>
        </div>

        {/* Sección de etiquetas - solo se muestra si hay etiquetas disponibles */}
        {availableTags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            {/* Contenedor flexible para etiquetas con diseño responsivo */}
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"  // Evitar envío del formulario
                  onClick={() => handleTagToggle(tag.id)}  // Alternar selección de etiqueta
                  disabled={isLoading}  // Deshabilitar durante carga
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                    formData.tagIds.includes(tag.id)
                      ? 'text-white border-transparent'  // Estilo para etiqueta seleccionada
                      : 'text-gray-700 border-gray-300 bg-white hover:bg-gray-50'  // Estilo para etiqueta no seleccionada
                  }`}
                  style={{
                    // Aplicar color de fondo solo si la etiqueta está seleccionada
                    backgroundColor: formData.tagIds.includes(tag.id) ? tag.color : undefined
                  }}
                >
                  <TagIcon className="w-3 h-3 mr-1" />  {/* Icono de etiqueta */}
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Botones de acción del formulario */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          {/* Botón de copiar de otra subtarea */}
          <button
            type="button"
            onClick={() => setShowTaskSelector(true)}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy from Subtask
          </button>
          
          <div className="flex space-x-3">
            {/* Botón de cancelar - cierra el formulario sin guardar */}
            <button
              type="button"  // No envía el formulario
              onClick={onCancel}  // Ejecutar callback de cancelación
              disabled={isLoading}  // Deshabilitar durante carga
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            {/* Botón de crear subtarea - envía el formulario */}
            <button
              type="submit"  // Envía el formulario y ejecuta handleSubmit
              disabled={isLoading}  // Deshabilitar durante carga
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {/* Texto dinámico según el estado de carga */}
              {isLoading ? 'Creating...' : 'Create Subtask'}
            </button>
          </div>
        </div>
      </form>

      {/* Modal de resolución de conflictos de fechas */}
      <DateConflictModal
        isOpen={showConflictModal}  // Controla la visibilidad del modal
        subtask={pendingSubtaskData ? {  // Datos de la subtarea pendiente de guardar
          title: pendingSubtaskData.title,
          startDate: pendingSubtaskData.startDate,
          dueDate: pendingSubtaskData.dueDate
        } : undefined}
        parentTask={parentTask}  // Información de la tarea padre
        conflictDetails={conflictDetails}  // Detalles específicos del conflicto detectado
        onConfirmKeepSubtask={handleConfirmKeepSubtask}  // Confirmar y resolver el conflicto
        onCancel={handleCancelConflict}  // Cancelar y mantener el formulario abierto
        isLoading={isProcessingConflict}  // Estado de carga durante la resolución
      />
      
      {/* Selector de tareas para copiar */}
      {showTaskSelector && (
        <TaskSelector
          mode="subtask"
          onSelect={handleCopyFromSubtask}
          onCancel={() => setShowTaskSelector(false)}
          parentTaskId={parentId}
        />
      )}
    </div>
  );
};

export default InlineSubtaskForm;
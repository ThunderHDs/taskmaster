'use client';

// Importaciones necesarias para React y componentes de UI
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Tag as TagIcon, AlertCircle, Plus, X } from 'lucide-react';
import { DateRangePicker, validateDate, formatDateToISO } from './DateRangePicker';

/**
 * Interfaces de TypeScript para definir la estructura de datos
 */

// Interfaz para las etiquetas que se pueden asignar a las tareas
interface Tag {
  id: string;        // Identificador único de la etiqueta
  name: string;      // Nombre visible de la etiqueta
  color: string;     // Color hexadecimal para la visualización
}

// Interfaz completa para una tarea del sistema
interface Task {
  id: string;                                           // Identificador único de la tarea
  title: string;                                        // Título de la tarea (requerido)
  description?: string;                                 // Descripción opcional de la tarea
  completed: boolean;                                   // Estado de completado
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';     // Nivel de prioridad
  dueDate?: string;                                     // Fecha de vencimiento (ISO string)
  startDate?: string;                                   // Fecha de inicio (ISO string)
  parentId?: string;                                    // ID de la tarea padre (para subtareas)
  createdAt: string;                                    // Timestamp de creación
  updatedAt: string;                                    // Timestamp de última actualización
  tags: { tag: Tag }[];                                 // Etiquetas asociadas a la tarea
  subtasks: Task[];                                     // Lista de subtareas
  parent?: Task;                                        // Referencia a la tarea padre
}

// Props del componente InlineTaskForm
interface InlineTaskFormProps {
  onSubmit: (taskData: Partial<Task> & { tagIds: string[] }) => void; // Callback para enviar datos del formulario
  availableTags: Tag[];                                                // Lista de etiquetas disponibles para asignar
  isLoading?: boolean;                                                 // Estado de carga para deshabilitar el formulario
  className?: string;                                                  // Clases CSS adicionales
}

/**
 * Componente de formulario inline para crear nuevas tareas
 * 
 * Características principales:
 * - Modo colapsado: Solo muestra un input simple
 * - Modo expandido: Formulario completo con todos los campos
 * - Validación en tiempo real
 * - Preservación de fechas entre creaciones de tareas
 * - Manejo de etiquetas con colores personalizados
 * 
 * @param props - Propiedades del componente
 * @returns JSX Element del formulario de creación de tareas
 */
const InlineTaskForm: React.FC<InlineTaskFormProps> = ({
  onSubmit,        // Función callback para enviar los datos del formulario
  availableTags,   // Lista de etiquetas disponibles para asignar
  isLoading = false,  // Estado de carga para deshabilitar controles
  className = ''   // Clases CSS adicionales
}) => {
  // Estado para controlar si el formulario está expandido o colapsado
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Estado principal del formulario con todos los campos de la tarea
  const [formData, setFormData] = useState({
    title: '',                                                    // Título de la tarea
    description: '',                                              // Descripción opcional
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT', // Prioridad por defecto
    startDate: null as Date | null,                              // Fecha de inicio
    dueDate: null as Date | null,                                // Fecha de vencimiento
    tagIds: [] as string[]                                        // IDs de etiquetas seleccionadas
  });
  
  // Estado para manejar errores de validación por campo
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Referencias para manipulación directa del DOM
  const titleInputRef = useRef<HTMLInputElement>(null);  // Referencia al input del título
  const formRef = useRef<HTMLDivElement>(null);          // Referencia al contenedor del formulario

  /**
   * Configuración de opciones de prioridad con sus colores correspondientes
   * Cada opción incluye valor, etiqueta y clase CSS para el color
   */
  const priorityOptions = [
    { value: 'LOW', label: 'Low', color: 'text-green-600' },       // Prioridad baja - verde
    { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-600' }, // Prioridad media - amarillo
    { value: 'HIGH', label: 'High', color: 'text-orange-600' },     // Prioridad alta - naranja
    { value: 'URGENT', label: 'Urgent', color: 'text-red-600' }     // Prioridad urgente - rojo
  ];

  /**
   * Efecto para manejar clics fuera del formulario
   * Si el formulario está expandido y el título está vacío, se colapsa automáticamente
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Verificar si el clic fue fuera del formulario
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        // Solo colapsar si está expandido y no hay título
        if (isExpanded && !formData.title.trim()) {
          handleCancel();
        }
      }
    };

    // Agregar listener para clics en el documento
    document.addEventListener('mousedown', handleClickOutside);
    // Cleanup: remover listener al desmontar el componente
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, formData.title]);

  /**
   * Efecto para auto-colapsar el formulario cuando el título se vacía
   * Proporciona una experiencia de usuario más fluida
   */
  useEffect(() => {
    if (isExpanded && !formData.title.trim()) {
      setIsExpanded(false);
    }
  }, [formData.title, isExpanded]);

  /**
   * Función de validación del formulario
   * Valida que los campos requeridos estén completos, las longitudes sean apropiadas
   * y que las fechas sean coherentes y no estén en el pasado
   * 
   * @returns boolean - true si el formulario es válido, false en caso contrario
   */
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validar que el título no esté vacío (campo requerido)
    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    } else if (formData.title.trim().length > 200) {
      // Validar longitud máxima del título
      newErrors.title = 'Task title must be less than 200 characters';
    }

    // Validar longitud máxima de la descripción
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    // Validar coherencia del rango de fechas
    if (formData.startDate && formData.dueDate) {
      if (formData.startDate > formData.dueDate) {
        newErrors.dateRange = 'Start date cannot be after end date';
      }
    }
    
    // Validar que la fecha de inicio no esté en el pasado
    if (formData.startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (formData.startDate < today) {
        newErrors.dateRange = 'Start date cannot be in the past';
      }
    }
    
    // Validar que la fecha de vencimiento no esté en el pasado
    if (formData.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (formData.dueDate < today) {
        newErrors.dateRange = 'End date cannot be in the past';
      }
    }

    // Actualizar estado de errores y retornar si el formulario es válido
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Manejador del envío del formulario
   * Valida los datos, aplica lógica de negocio y envía la tarea
   * Preserva las fechas entre creaciones para mejorar la experiencia del usuario
   * 
   * @param e - Evento del formulario
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevenir el comportamiento por defecto del formulario
    
    console.log('🔥 InlineTaskForm - handleSubmit called');
    console.log('🔥 InlineTaskForm - formData before validation:', {
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      title: formData.title
    });
    
    // Validar formulario antes de proceder
    if (!validateForm()) {
      console.log('🔥 InlineTaskForm - validation failed');
      return;
    }

    // Lógica de negocio: Auto-asignar fecha de inicio si solo se proporciona fecha de vencimiento
    let startDate = formData.startDate;
    if (!startDate && formData.dueDate) {
      // Crear fecha actual usando componentes individuales para evitar problemas de zona horaria
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      console.log('🔥 InlineTaskForm - auto-assigned startDate:', startDate);
    }
    
    // Preparar datos para envío con formato correcto
    const submitData: Partial<Task> & { tagIds: string[] } = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      priority: formData.priority,
      startDate: formatDateToISO(startDate) || undefined,
      dueDate: formatDateToISO(formData.dueDate) || undefined,
      tagIds: formData.tagIds
    };

    console.log('🔥 InlineTaskForm - submitData being sent:', submitData);
    
    // Enviar datos al componente padre
    onSubmit(submitData);
    
    console.log('🔥 InlineTaskForm - NOT calling resetForm - preserving dates');
    // Reseteo parcial: limpiar solo título y descripción pero preservar fechas
    // Esto mejora la experiencia del usuario al crear múltiples tareas con fechas similares
    setFormData(prev => ({
      ...prev,
      title: '',
      description: '',
      priority: 'MEDIUM',
      tagIds: []
      // Keep startDate and dueDate unchanged
    }));
    setIsExpanded(false); // Colapsar formulario
    setErrors({}); // Limpiar errores
  };

  /**
   * Manejador genérico para cambios en los campos del formulario
   * Actualiza el estado y limpia errores de validación automáticamente
   * 
   * @param field - Nombre del campo a actualizar
   * @param value - Nuevo valor del campo
   */
  const handleInputChange = (field: string, value: any) => {
    // Actualizar el campo específico en el estado del formulario
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error de validación cuando el usuario comienza a escribir
    // Esto proporciona feedback inmediato y mejora la experiencia del usuario
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  /**
   * Manejador para la selección/deselección de etiquetas
   * Permite agregar o quitar etiquetas de la lista de etiquetas seleccionadas
   * 
   * @param tagId - ID de la etiqueta a alternar
   */
  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId) // Remover si ya está seleccionada
        : [...prev.tagIds, tagId] // Agregar si no está seleccionada
    }));
  };

  /**
   * Manejador específico para cambios en el input cuando el formulario está colapsado
   * Controla la expansión automática del formulario basada en el contenido del título
   * 
   * @param value - Nuevo valor del título
   */
  const handleCollapsedInputChange = (value: string) => {
    // Actualizar el título en el estado del formulario
    setFormData(prev => ({ ...prev, title: value }));
    
    // Expandir formulario automáticamente cuando el usuario comienza a escribir
    if (value.trim() && !isExpanded) {
      setIsExpanded(true);
      // Enfocar el input del título después de la expansión
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    } else if (!value.trim() && isExpanded) {
      // Colapsar si el título se vacía
      setIsExpanded(false);
    }
    
    // Limpiar error del título cuando el usuario comienza a escribir
    if (errors.title) {
      setErrors(prev => ({ ...prev, title: '' }));
    }
  };

  /**
   * Manejador para cancelar la creación de tarea
   * Colapsa el formulario y limpia los campos excepto las fechas
   * Preserva las fechas para facilitar la creación de múltiples tareas
   */
  const handleCancel = () => {
    setIsExpanded(false); // Colapsar formulario
    // Reseteo parcial: limpiar campos excepto fechas
    setFormData(prev => ({
      ...prev,
      title: '',
      description: '',
      priority: 'MEDIUM',
      tagIds: []
      // Preserve startDate and dueDate para mejorar UX
    }));
    setErrors({}); // Limpiar todos los errores de validación
  };

  /**
   * Función para resetear completamente el formulario
   * Limpia todos los campos incluyendo las fechas
   * Solo se usa para reseteo manual completo
   */
  const resetForm = () => {
    console.log('🔥 InlineTaskForm - resetForm called, clearing all dates');
    console.log('🔥 InlineTaskForm - formData before reset:', {
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      title: formData.title
    });
    
    setIsExpanded(false); // Colapsar formulario
    // Reseteo completo de todos los campos
    setFormData({
      title: '',
      description: '',
      priority: 'MEDIUM',
      startDate: null,
      dueDate: null,
      tagIds: []
    });
    setErrors({}); // Limpiar errores
    
    console.log('🔥 InlineTaskForm - resetForm completed, dates should be null');
  };

  return (
    <div ref={formRef} className={`transition-all duration-300 ${className}`}>
      {!isExpanded ? (
        /* 
         * ESTADO COLAPSADO
         * Muestra un input simple con icono de plus para crear nuevas tareas
         * Se expande automáticamente cuando el usuario comienza a escribir
         */
        <div className="relative group">
          {/* Input principal que controla la expansión del formulario */}
          <input
            type="text"
            placeholder="Add a new task..."
            value={formData.title}
            onChange={(e) => handleCollapsedInputChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm hover:border-blue-400 transition-colors"
          />
          {/* Icono de plus para indicar acción de agregar */}
          <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
        </div>
      ) : (
        /* 
         * ESTADO EXPANDIDO
         * Formulario completo con todos los campos para crear una tarea
         * Incluye validación en tiempo real y manejo de errores
         */
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 
             * CAMPO DE TÍTULO
             * Campo requerido con validación y feedback visual de errores
             * Incluye botón de cancelar en la esquina superior derecha
             */}
            <div>
              {/* Header con label y botón de cancelar */}
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="inline-title" className="block text-sm font-medium text-gray-700">
                  New Task *
                </label>
                {/* Botón para cancelar y colapsar el formulario */}
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Input principal del título con referencia para auto-focus */}
              <input
                ref={titleInputRef} // Referencia para enfocar automáticamente después de expandir
                type="text"
                id="inline-title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-300' // Estilo condicional para mostrar errores
                }`}
                placeholder="Enter task title..."
                disabled={isLoading} // Deshabilitar durante operaciones de carga
              />
              {/* Mensaje de error con icono si la validación falla */}
              {errors.title && (
                <div className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.title}
                </div>
              )}
            </div>

            {/* 
             * CAMPO DE DESCRIPCIÓN
             * Campo opcional para agregar detalles adicionales a la tarea
             * Incluye validación de longitud máxima
             */}
            <div>
              <label htmlFor="inline-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              {/* Textarea redimensionable con validación de longitud */}
              <textarea
                id="inline-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={2}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter task description..."
                disabled={isLoading} // Deshabilitar durante carga
              />
              {/* Mensaje de error si excede la longitud máxima */}
              {errors.description && (
                <div className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.description}
                </div>
              )}
            </div>

            {/* 
             * SELECTOR DE PRIORIDAD
             * Permite seleccionar el nivel de prioridad de la tarea
             * Opciones: Low, Medium, High, Urgent con colores correspondientes
             */}
            <div>
              <label htmlFor="inline-priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              {/* Select con opciones de prioridad predefinidas */}
              <select
                id="inline-priority"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading} // Deshabilitar durante operaciones de carga
              >
                {/* Mapear opciones de prioridad con sus etiquetas correspondientes */}
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 
             * SELECTOR DE RANGO DE FECHAS
             * Componente personalizado para seleccionar fecha de inicio y vencimiento
             * Incluye validación de coherencia entre fechas y manejo de errores
             */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              {/* Componente DateRangePicker con callback unificado para manejar cambios */}
              <DateRangePicker
                startDate={formData.startDate}  // Fecha de inicio actual del formulario
                endDate={formData.dueDate}      // Fecha de vencimiento actual del formulario
                onDateChange={(startDate, endDate) => {
                  // Log para debugging del flujo de fechas
                  console.log('🔥 InlineTaskForm - DateRangePicker onDateChange called:', {
                    startDate,
                    endDate,
                    previousStartDate: formData.startDate,
                    previousDueDate: formData.dueDate
                  });
                  
                  // Actualizar ambas fechas simultáneamente en el estado del formulario
                  setFormData(prev => {
                    const newFormData = {
                      ...prev,
                      startDate,
                      dueDate: endDate
                    };
                    console.log('🔥 InlineTaskForm - formData updated to:', newFormData);
                    return newFormData;
                  });
                  
                  // Limpiar errores de rango de fechas cuando las fechas cambian
                  // Esto proporciona feedback inmediato al usuario
                  if (errors.dateRange) {
                    setErrors(prev => ({ ...prev, dateRange: '' }));
                  }
                }}
                placeholder="Select date range" // Texto de ayuda para el usuario
                className={errors.dateRange ? 'border-red-300' : ''} // Estilo condicional para mostrar errores
              />
              {/* Mensaje de error si las fechas no son coherentes o están en el pasado */}
              {errors.dateRange && (
                <div className="flex items-center mt-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.dateRange}
                </div>
              )}
            </div>

            {/* 
             * SELECTOR DE ETIQUETAS
             * Permite asignar múltiples etiquetas a la tarea para mejor organización
             * Solo se muestra si hay etiquetas disponibles en el sistema
             */}
            {availableTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                {/* Contenedor flexible para mostrar etiquetas en múltiples filas si es necesario */}
                <div className="flex flex-wrap gap-2">
                  {/* Mapear todas las etiquetas disponibles como botones toggleables */}
                  {availableTags.map(tag => (
                    <button
                      key={tag.id} // Clave única para cada etiqueta
                      type="button" // Prevenir envío del formulario al hacer clic
                      onClick={() => handleTagToggle(tag.id)} // Toggle de selección de etiqueta
                      disabled={isLoading} // Deshabilitar durante operaciones de carga
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                        formData.tagIds.includes(tag.id)
                          ? 'text-white border-transparent' // Estilo para etiqueta seleccionada
                          : 'text-gray-700 border-gray-300 bg-white hover:bg-gray-50' // Estilo para etiqueta no seleccionada
                      }`}
                      style={{
                        // Aplicar color de fondo personalizado solo si la etiqueta está seleccionada
                        backgroundColor: formData.tagIds.includes(tag.id) ? tag.color : undefined
                      }}
                    >
                      {/* Icono de etiqueta para consistencia visual */}
                      <TagIcon className="w-3 h-3 mr-1" />
                      {/* Nombre de la etiqueta */}
                    {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 
             * BOTONES DE ACCIÓN
             * Controles principales para cancelar o confirmar la creación de la tarea
             * Incluyen estados de carga y validación
             */}
            <div className="flex justify-end space-x-2 pt-2">
              {/* Botón para cancelar y colapsar el formulario */}
              <button
                type="button" // No envía el formulario
                onClick={handleCancel} // Limpia campos y colapsa formulario
                disabled={isLoading} // Deshabilitar durante operaciones de carga
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              {/* Botón principal para crear la tarea */}
              <button
                type="submit" // Envía el formulario al hacer clic
                disabled={isLoading} // Deshabilitar durante operaciones de carga
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {/* Texto dinámico basado en el estado de carga */}
                {isLoading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default InlineTaskForm;
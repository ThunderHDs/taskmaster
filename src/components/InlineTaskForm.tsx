'use client';

// Importaciones necesarias para React y componentes de UI
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Tag as TagIcon, AlertCircle, Plus, X, Users, Copy } from 'lucide-react';
import { DateRangePicker, validateDate, formatDateToISO } from './DateRangePicker';
import TaskSelector from './TaskSelector';

/**
 * Interfaces de TypeScript para definir la estructura de datos
 */

// Definición de la interfaz Tag para las etiquetas de tareas
interface Tag {
  id: string;        // Identificador único de la etiqueta
  name: string;      // Nombre visible de la etiqueta
  color: string;     // Color de la etiqueta en formato hexadecimal
  createdAt: string; // Fecha de creación en formato ISO
  updatedAt: string; // Fecha de última actualización en formato ISO
}

// Definición de la interfaz TaskGroup para los grupos de tareas
interface TaskGroup {
  id: string;        // Identificador único del grupo
  name: string;      // Nombre visible del grupo
  description?: string; // Descripción opcional del grupo
  color: string;     // Color del grupo en formato hexadecimal
}

// Definición de la interfaz Task para las tareas
interface Task {
  id: string;                                                   // Identificador único de la tarea
  title: string;                                                // Título de la tarea
  description?: string;                                         // Descripción opcional
  completed: boolean;                                           // Estado de completado
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';             // Nivel de prioridad
  dueDate?: string;                                             // Fecha de vencimiento opcional
  startDate?: string;                                           // Fecha de inicio opcional
  originalDueDate?: string;                                     // Fecha límite original antes de completar temprano
  parentId?: string;                                            // ID de tarea padre (para subtareas)
  groupId?: string;                                             // ID del grupo al que pertenece
  createdAt: string;                                            // Fecha de creación
  updatedAt: string;                                            // Fecha de última actualización
  tags: { tag: Tag }[];                                         // Etiquetas asociadas
  subtasks: Task[];                                             // Lista de subtareas
  parent?: Task;                                                // Referencia a tarea padre
  group?: TaskGroup;                                            // Referencia al grupo
}

// Props del componente InlineTaskForm
interface InlineTaskFormProps {
  onSubmit: (taskData: Partial<Task> & { tagIds: string[]; groupId?: string; copiedSubtasks?: Task[] }) => void; // Callback para enviar datos del formulario
  availableTags: Tag[];                                                // Lista de etiquetas disponibles para asignar
  availableGroups: TaskGroup[];                                        // Lista de grupos disponibles para asignar
  isLoading?: boolean;                                                 // Estado de carga para deshabilitar el formulario
  className?: string;                                                  // Clases CSS adicionales
  onBulkTaskClick?: () => void;                                        // Callback para abrir el formulario de tareas múltiples
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
  availableGroups, // Lista de grupos disponibles para asignar
  isLoading = false,  // Estado de carga para deshabilitar controles
  className = '',   // Clases CSS adicionales
  onBulkTaskClick  // Callback para abrir el formulario de tareas múltiples
}) => {
  // Estado para controlar si el formulario está expandido o colapsado
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Estado para el selector de tareas para copiar
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  
  // Estado para controlar si se han copiado datos de otra tarea
  const [hasDataCopied, setHasDataCopied] = useState(false);
  
  // Estado para controlar si se deben copiar las subtareas (por defecto true)
  const [shouldCopySubtasks, setShouldCopySubtasks] = useState(true);
  
  // Estado para almacenar las subtareas de la tarea copiada
  const [copiedSubtasks, setCopiedSubtasks] = useState<Task[]>([]);
  
  // Estado principal del formulario con todos los campos de la tarea
  const [formData, setFormData] = useState({
    title: '',                                                    // Título de la tarea
    description: '',                                              // Descripción opcional
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT', // Prioridad por defecto
    startDate: null as Date | null,                              // Fecha de inicio
    dueDate: null as Date | null,                                // Fecha de vencimiento
    tagIds: [] as string[],                                       // IDs de etiquetas seleccionadas
    groupId: '' as string                                         // ID del grupo seleccionado
  });
  
  // Estado para manejar errores de validación del formulario
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Referencia al input del título para control de foco
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // Referencia al input colapsado para control de foco
  const collapsedInputRef = useRef<HTMLInputElement>(null);
  
  // Referencia al contenedor del formulario para detectar clics externos
  const formRef = useRef<HTMLDivElement>(null);

  /**
   * Efecto para manejar clics fuera del formulario
   * Auto-colapsa el formulario cuando se hace clic fuera y el título está vacío
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // Solo procesar si el formulario está expandido
      if (!isExpanded) return;
      
      // Verificar si el clic fue fuera del formulario
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        // Solo colapsar si el título está vacío
        if (!formData.title.trim()) {
          setIsExpanded(false);
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
   * Proporciona una experiencia de usuario más fluida y mantiene el foco
   */
  useEffect(() => {
    if (isExpanded && !formData.title.trim()) {
      setIsExpanded(false);
      // Mantener el foco en el input colapsado después del colapso
      setTimeout(() => {
        collapsedInputRef.current?.focus();
      }, 100);
    }
  }, [formData.title, isExpanded]);

  /**
   * Función de validación del formulario
   * Valida todos los campos según las reglas de negocio
   * 
   * @returns Objeto con errores encontrados (vacío si no hay errores)
   */
  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    
    // Validación del título (campo requerido)
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters long';
    } else if (formData.title.trim().length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }
    
    // Validación de la descripción (opcional pero con límite de longitud)
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }
    
    // Validación de fechas
    if (formData.startDate && formData.dueDate) {
      // Verificar que la fecha de inicio no sea posterior a la fecha de vencimiento
      if (formData.startDate > formData.dueDate) {
        newErrors.dateRange = 'Start date cannot be after due date';
      }
    }
    
    // Validación de fechas en el pasado (opcional según reglas de negocio)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetear horas para comparación solo de fechas
    
    if (formData.startDate && formData.startDate < today) {
      // Permitir fechas en el pasado pero mostrar advertencia
      console.warn('Start date is in the past');
    }
    
    if (formData.dueDate && formData.dueDate < today) {
      // Permitir fechas en el pasado pero mostrar advertencia
      console.warn('Due date is in the past');
    }
    
    return newErrors;
  };

  /**
   * Función para sanitizar texto de entrada
   * Elimina caracteres peligrosos pero preserva espacios normales
   */
  const sanitizeText = (text: string): string => {
    return text
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  };

  /**
   * Resetea completamente el formulario a sus valores iniciales
   * 
   * Limpia todos los campos, errores de validación y estados de copia.
   * Esta función se usa después de crear una tarea exitosamente.
   */
  const resetForm = () => {
    setFormData({
      title: '',                          // Limpiar título
      description: '',                    // Limpiar descripción
      priority: 'MEDIUM',                 // Resetear prioridad a valor por defecto
      startDate: null,                    // Limpiar fecha de inicio
      dueDate: null,                      // Limpiar fecha de vencimiento
      tagIds: [],                         // Limpiar etiquetas seleccionadas
      groupId: ''                         // Limpiar grupo seleccionado
    });
    setErrors({});                        // Limpiar todos los errores de validación
    setIsExpanded(false);                 // Colapsar formulario
    
    // Resetear estados de copia
    setHasDataCopied(false);
    setShouldCopySubtasks(true);
    setCopiedSubtasks([]);
    setShowTaskSelector(false);
  };

  /**
   * Manejador del envío del formulario
   * Valida los datos, aplica lógica de negocio y envía la tarea
   * Preserva las fechas entre creaciones para mejorar la experiencia del usuario
   * 
   * @param e - Evento del formulario
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulario antes del envío
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    // Limpiar errores si la validación es exitosa
    setErrors({});
    
    // Lógica de fechas: si no hay startDate pero sí hay dueDate, asignar startDate como hoy
    let startDate = formData.startDate;
    if (!startDate && formData.dueDate) {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    
    // Preparar datos para envío con formato correcto
    const submitData: Partial<Task> & { tagIds: string[]; groupId?: string; copiedSubtasks?: Task[] } = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      priority: formData.priority,
      startDate: formatDateToISO(startDate) || undefined,
      dueDate: formatDateToISO(formData.dueDate) || undefined,
      tagIds: formData.tagIds,
      groupId: formData.groupId || undefined
    };
    
    // Incluir subtareas copiadas si el usuario lo desea
    if (hasDataCopied && shouldCopySubtasks && copiedSubtasks.length > 0) {
      submitData.copiedSubtasks = copiedSubtasks;
    }
    
    // Enviar datos al componente padre
    onSubmit(submitData);
    // Reseteo completo: limpiar todos los campos después de crear la tarea exitosamente
    // Esto evita que los datos de la tarea anterior permanezcan en el formulario
    resetForm();
  };

  /**
   * Manejador genérico para cambios en los campos del formulario
   * Actualiza el estado, sanitiza texto y limpia errores de validación automáticamente
   * 
   * @param field - Nombre del campo a actualizar
   * @param value - Nuevo valor del campo
   */
  const handleInputChange = (field: string, value: any) => {
    // Sanitizar texto para campos de texto
    let sanitizedValue = value;
    if (field === 'title' || field === 'description') {
      sanitizedValue = typeof value === 'string' ? sanitizeText(value) : value;
    }
    
    // Actualizar el campo específico en el estado del formulario
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
    
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
      // Colapsar si el título se vacía pero mantener el foco en el input colapsado
      setIsExpanded(false);
      // Mantener el foco en el input colapsado después del colapso
      setTimeout(() => {
        collapsedInputRef.current?.focus();
      }, 100);
    }
    
    // Limpiar error del título cuando el usuario comienza a escribir
    if (errors.title) {
      setErrors(prev => ({ ...prev, title: '' }));
    }
  };

  /**
   * Manejador para cancelar la creación de tarea
   * Limpia completamente el formulario y colapsa la vista
   */
  const handleCancel = () => {
    resetForm();
  };

  /**
   * Función para manejar la copia de datos de otra tarea
   */
  const handleCopyFromTask = (task: Task) => {
    console.log('🔥 DEBUG - handleCopyFromTask called with task:', {
      taskId: task.id,
      taskTitle: task.title,
      subtasksCount: task.subtasks?.length || 0,
      subtasks: task.subtasks
    });
    
    setFormData({
      title: task.title, // Se puede modificar después
      description: task.description || '', // Se puede modificar después
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      startDate: task.startDate ? new Date(task.startDate) : null,
      tagIds: task.tags.map(t => t.tag.id),
      groupId: task.groupId || ''
    });
    
    // Almacenar las subtareas de la tarea copiada
    const subtasksToStore = task.subtasks || [];
    setCopiedSubtasks(subtasksToStore);
    
    // Marcar que se han copiado datos
    setHasDataCopied(true);
    
    // Resetear el estado del checkbox a true (por defecto)
    setShouldCopySubtasks(true);
    
    setShowTaskSelector(false);
  };

  // Renderizado del componente
  return (
    <div ref={formRef} className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {!isExpanded ? (
        /* 
         * MODO COLAPSADO
         * Muestra solo un input simple que se expande al hacer clic o escribir
         * Diseño minimalista para no distraer de otras tareas
         */
        <div className="p-2 relative">
          <input
            ref={collapsedInputRef}
            type="text"
            value={formData.title}
            onChange={(e) => handleCollapsedInputChange(e.target.value)}
            placeholder="Add a new task..."
            className="w-full px-2 py-1.5 pr-10 text-sm text-gray-700 border-0 focus:outline-none focus:ring-0 bg-transparent placeholder-gray-400"
            disabled={isLoading} // Deshabilitar durante operaciones de carga
          />
          {/* Botón de múltiples integrado */}
          {onBulkTaskClick && (
            <button
              type="button"
              onClick={onBulkTaskClick}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 focus:outline-none focus:text-blue-600 transition-colors"
              title="Crear múltiples tareas"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        /* 
         * MODO EXPANDIDO
         * Formulario completo con todos los campos disponibles
         * Incluye validación visual y mensajes de error
         */
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Input del título con validación visual */}
            <input
              ref={titleInputRef}
              id="inline-title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter task title..."
              disabled={isLoading} // Deshabilitar durante carga
              autoFocus // Auto-enfocar cuando se expande
            />
            {/* Mensaje de error si la validación falla */}
            {errors.title && (
              <div className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.title}
              </div>
            )}
          </div>

          {/* 
           * CAMPO DE DESCRIPCIÓN
           * Campo opcional para información adicional sobre la tarea
           * Textarea redimensionable con límite de caracteres
           */}
          <div>
            <label htmlFor="inline-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            {/* Textarea con validación de longitud */}
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
              disabled={isLoading} // Deshabilitar durante carga
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* 
           * SELECTOR DE GRUPO
           * Permite asignar la tarea a un grupo específico para mejor organización
           * Solo se muestra si hay grupos disponibles en el sistema
           */}
          {availableGroups.length > 0 && (
            <div>
              <label htmlFor="inline-group" className="block text-sm font-medium text-gray-700 mb-1">
                <Users className="w-4 h-4 inline mr-1" />
                Group
              </label>
              <select
                id="inline-group"
                value={formData.groupId}
                onChange={(e) => handleInputChange('groupId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              >
                <option value="">No group</option>
                {availableGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              {/* Indicador visual del grupo seleccionado */}
              {formData.groupId && (
                <div className="mt-2 flex items-center text-sm text-gray-600">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: availableGroups.find(g => g.id === formData.groupId)?.color }}
                  ></div>
                  {availableGroups.find(g => g.id === formData.groupId)?.name}
                </div>
              )}
            </div>
          )}

          {/* 
           * SELECTOR DE FECHAS
           * Componente personalizado para seleccionar rango de fechas
           * Incluye validación de coherencia entre fechas de inicio y vencimiento
           */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
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
                      // Aplicar color de fondo dinámico solo si la etiqueta está seleccionada
                      backgroundColor: formData.tagIds.includes(tag.id) ? tag.color : undefined
                    }}
                  >
                    <TagIcon className="w-3 h-3 mr-1" /> {/* Icono de etiqueta */}
                    {tag.name} {/* Nombre de la etiqueta */}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 
           * BOTONES DE ACCIÓN
           * Botones para enviar o cancelar la creación de la tarea
           * Incluye estados de carga y validación
           */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="flex flex-col space-y-2">
              {/* Botón de copiar de otra tarea */}
              <button
                type="button"
                onClick={() => setShowTaskSelector(true)}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy from Task
              </button>
              
              {/* Checkbox para copiar subtareas - solo visible después de copiar datos */}
              {(() => {
                console.log('🔥 DEBUG - Checkbox render check:', {
                  hasDataCopied,
                  copiedSubtasksLength: copiedSubtasks.length,
                  shouldShow: hasDataCopied && copiedSubtasks.length > 0
                });
                return hasDataCopied && copiedSubtasks.length > 0;
              })() && (
                <label className="flex items-center space-x-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={shouldCopySubtasks}
                    onChange={(e) => setShouldCopySubtasks(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>
                    ✓ Copy {copiedSubtasks.length} subtask{copiedSubtasks.length !== 1 ? 's' : ''} too
                  </span>
                </label>
              )}
            </div>
            
            <div className="flex space-x-3">
              {/* Botón de cancelar */}
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              {/* Botón de crear tarea */}
              <button
                type="submit"
                disabled={isLoading || !formData.title.trim()} // Deshabilitar si está cargando o el título está vacío
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  // Mostrar spinner durante la carga
                  <>
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Creating...
                  </>
                ) : (
                  // Mostrar icono y texto normal
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Create Task
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
      
      {/* Selector de tareas para copiar */}
      {showTaskSelector && (
        <TaskSelector
          mode="task"
          onSelect={handleCopyFromTask}
          onCancel={() => setShowTaskSelector(false)}
        />
      )}
    </div>
  );
};

export default InlineTaskForm;
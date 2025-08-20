'use client';

// Importaciones necesarias para React y componentes de UI
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Calendar, Tag, Clock, AlertCircle, Plus, MoreVertical } from 'lucide-react';
import InlineTaskEditForm from './InlineTaskEditForm';
import InlineSubtaskForm from './InlineSubtaskForm';

/**
 * Interfaz que define la estructura de una etiqueta (tag)
 * Utilizada para categorizar y organizar las tareas
 */
interface Tag {
  id: string;        // Identificador único de la etiqueta
  name: string;      // Nombre visible de la etiqueta
  color: string;     // Color hexadecimal para la visualización
}

/**
 * Interfaz que define la estructura completa de una tarea
 * Incluye tanto tareas principales como subtareas
 */
interface Task {
  id: string;                                    // Identificador único de la tarea
  title: string;                                 // Título de la tarea
  description?: string;                          // Descripción opcional de la tarea
  completed: boolean;                            // Estado de completado
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; // Nivel de prioridad
  dueDate?: string;                              // Fecha límite (opcional)
  startDate?: string;                            // Fecha de inicio (opcional)
  parentId?: string;                             // ID de la tarea padre (para subtareas)
  createdAt: string;                             // Fecha de creación
  updatedAt: string;                             // Fecha de última actualización
  tags: { tag: Tag }[];                          // Etiquetas asociadas a la tarea
  subtasks: Task[];                              // Lista de subtareas
  parent?: Task;                                 // Referencia a la tarea padre
}

/**
 * Props del componente TaskList
 * Define todas las funciones y datos necesarios para el funcionamiento del componente
 */
interface TaskListProps {
  tasks: Task[];                                 // Lista de tareas a mostrar
  onTaskToggle: (taskId: string, completed: boolean) => void;  // Función para cambiar estado de completado
  onTaskEdit: (task: Task) => void;              // Función para editar una tarea
  onTaskUpdate: (taskId: string, taskData: Partial<Task>) => Promise<void>; // Función para actualizar tarea
  onTaskDelete: (taskId: string) => void;        // Función para eliminar una tarea
  onSubtaskCreate: (parentId: string, subtaskData: {  // Función para crear subtareas
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    tagIds: string[];
  }) => Promise<void>;
  availableTags: Tag[];                          // Lista de etiquetas disponibles
  selectedTags: string[];                        // Etiquetas seleccionadas para filtrar
  priorityFilter: string;                        // Filtro de prioridad activo
  completedFilter: string;                       // Filtro de estado de completado
  isLoading?: boolean;                           // Estado de carga para operaciones asíncronas
}

/**
 * Componente principal TaskList
 * Renderiza una lista de tareas con funcionalidades de edición, filtrado y gestión de subtareas
 * Incluye interacciones como hover, click, edición inline y creación de subtareas
 */
const TaskList: React.FC<TaskListProps> = ({
  tasks,                    // Lista de tareas recibidas como props
  onTaskToggle,            // Callback para cambiar estado de completado
  onTaskEdit,              // Callback para editar tarea (legacy)
  onTaskUpdate,            // Callback para actualizar tarea
  onTaskDelete,            // Callback para eliminar tarea
  onSubtaskCreate,         // Callback para crear subtarea
  availableTags,           // Etiquetas disponibles para asignar
  selectedTags,            // Etiquetas seleccionadas en filtros
  priorityFilter,          // Filtro de prioridad activo
  completedFilter,         // Filtro de estado activo
  isLoading = false        // Estado de carga global
}) => {
  // Estados para gestionar las interacciones de la interfaz de usuario
  
  /** Estado que controla qué tareas están expandidas (mostrando subtareas) */
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  /** Estado que rastrea sobre qué tarea está el cursor (hover effect) */
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  
  /** Estado que rastrea qué tareas han sido clickeadas (para mostrar botón Add Subtask) */
  const [clickedTasks, setClickedTasks] = useState<Set<string>>(new Set());
  
  /** Estado que controla qué menús contextuales están abiertos */
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());
  
  /** Estado para edición de títulos (funcionalidad legacy) */
  const [editingTasks, setEditingTasks] = useState<Set<string>>(new Set());
  
  /** Valores temporales durante la edición de títulos */
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  
  /** Estado que controla qué tareas están siendo editadas con el formulario inline */
  const [inlineEditingTasks, setInlineEditingTasks] = useState<Set<string>>(new Set());
  
  /** Estado que controla para qué tareas se está creando una subtarea */
  const [creatingSubtasks, setCreatingSubtasks] = useState<Set<string>>(new Set());

  /**
   * Effect para manejar clicks globales y ocultar elementos de la UI
   * Se ejecuta una sola vez al montar el componente
   */
  useEffect(() => {
    /**
     * Función que maneja clicks globales en el documento
     * Cierra menús contextuales, botones de Add Subtask y formularios de edición cuando se hace click fuera
     */
    const handleGlobalClick = (event: MouseEvent) => {
      // Verificar si el click está dentro de diferentes elementos de la UI
      const target = event.target as Element;
      const taskContainer = target.closest('[data-task-container]');
      const contextMenu = target.closest('[data-context-menu]');
      const editingInput = target.closest('[data-editing-input]');
      const inlineEditForm = target.closest('[data-inline-edit-form]');
      const inlineSubtaskForm = target.closest('[data-inline-subtask-form]');
      const dateRangePicker = target.closest('[data-date-range-picker]');
      
      if (!taskContainer) {
        // Click fuera de cualquier tarea, limpiar todas las tareas clickeadas
        setClickedTasks(new Set());
      }
      
      if (!contextMenu) {
        // Click fuera de cualquier menú contextual, cerrar todos los menús
        setOpenMenus(new Set());
      }
      
      if (!editingInput && !taskContainer && !inlineEditForm && !inlineSubtaskForm && !dateRangePicker) {
        // Click fuera de inputs de edición, contenedores de tareas, formularios y date picker
        // Cancelar todas las ediciones activas
        setEditingTasks(new Set());
        setEditingValues({});
        setInlineEditingTasks(new Set());
        // No limpiamos creatingSubtasks aquí - se maneja por sus propios handlers
      }
    };

    // Agregar event listeners al documento para clicks y toques
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick);

    // Función de limpieza: remover event listeners al desmontar el componente
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, []); // Array de dependencias vacío = se ejecuta solo una vez

  /**
   * Configuración de colores y etiquetas para los diferentes niveles de prioridad
   * Define los estilos CSS y etiquetas de texto para cada nivel de prioridad
   */
  const priorityConfig = {
    LOW: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Low' },
    MEDIUM: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Medium' },
    HIGH: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'High' },
    URGENT: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Urgent' }
  };

  /**
   * Función que retorna las clases CSS de color de fondo para badges de prioridad
   * @param priority - Nivel de prioridad de la tarea
   * @returns String con las clases CSS para el styling del badge
   */
  const getPriorityColor = (priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Función que retorna las clases CSS de color de texto para títulos de tareas según prioridad
   * @param priority - Nivel de prioridad de la tarea
   * @returns String con la clase CSS para el color del texto del título
   */
  const getPriorityTextColor = (priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') => {
    switch (priority) {
      case 'URGENT':
        return 'text-red-600';
      case 'HIGH':
        return 'text-orange-600';
      case 'MEDIUM':
        return 'text-yellow-600';
      case 'LOW':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  /**
   * Filtrado de tareas basado en los criterios seleccionados
   * Aplica filtros de estado de completado, prioridad y etiquetas
   */
  const filteredTasks = tasks.filter(task => {
    // Filtrar por estado de completado
    if (completedFilter === 'completed' && !task.completed) return false;
    if (completedFilter === 'pending' && task.completed) return false;

    // Filtrar por nivel de prioridad
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

    // Filtrar por etiquetas seleccionadas
    if (selectedTags.length > 0) {
      const taskTagIds = task.tags.map(t => t.tag.id); // Extraer IDs de etiquetas de la tarea
      const hasSelectedTag = selectedTags.some(tagId => taskTagIds.includes(tagId)); // Verificar si tiene alguna etiqueta seleccionada
      if (!hasSelectedTag) return false;
    }

    return true; // La tarea pasa todos los filtros
  });

  /**
   * Función para alternar el estado expandido/colapsado de una tarea
   * Controla si se muestran o no las subtareas de una tarea padre
   * @param taskId - ID de la tarea a expandir/colapsar
   */
  const toggleExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId); // Si está expandida, la colapsamos
    } else {
      newExpanded.add(taskId); // Si está colapsada, la expandimos
    }
    setExpandedTasks(newExpanded);
  };

  /**
   * Función para alternar el estado de click/tap de una tarea
   * Controla la visibilidad del botón "Add Subtask"
   * @param taskId - ID de la tarea clickeada
   * @param event - Evento de mouse para prevenir propagación
   */
  const toggleTaskClick = (taskId: string, event: React.MouseEvent) => {
    // Prevenir propagación del evento para evitar conflictos con otros handlers
    event.stopPropagation();
    
    const newClickedTasks = new Set<string>();
    
    // Si esta tarea no está actualmente clickeada, mostrar su botón y ocultar todos los demás
    if (!clickedTasks.has(taskId)) {
      newClickedTasks.add(taskId);
    }
    // Si esta tarea ya está clickeada, clickearla de nuevo ocultará el botón (newClickedTasks permanece vacío)
    
    setClickedTasks(newClickedTasks);
  };

  /**
   * Función para alternar la visibilidad del menú contextual de una tarea
   * Solo permite un menú abierto a la vez
   * @param taskId - ID de la tarea cuyo menú se va a mostrar/ocultar
   * @param event - Evento de mouse para prevenir propagación
   */
  const toggleContextMenu = (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId); // Si el menú está abierto, lo cerramos
      } else {
        // Cerrar todos los otros menús y abrir este
        newSet.clear();
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  /**
   * Funciones para manejar la edición inline de tareas
   */
  
  /**
   * Inicia el modo de edición inline para una tarea
   * @param task - Tarea a editar
   * @param event - Evento de mouse para prevenir propagación
   */
  const startInlineEditing = (task: Task, event: React.MouseEvent) => {
    event.stopPropagation();
    setInlineEditingTasks(prev => new Set(prev).add(task.id));
    // Cerrar cualquier menú abierto
    setOpenMenus(new Set());
  };

  /**
   * Cancela el modo de edición inline para una tarea
   * @param taskId - ID de la tarea cuya edición se va a cancelar
   */
  const cancelInlineEditing = (taskId: string) => {
    setInlineEditingTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
  };

  /**
   * Guarda los cambios de una tarea editada inline
   * @param taskId - ID de la tarea a actualizar
   * @param taskData - Datos parciales de la tarea a actualizar
   */
  const handleInlineTaskSave = async (taskId: string, taskData: Partial<Task>) => {
    try {
      await onTaskUpdate(taskId, taskData);
      // Solo cerrar el formulario si la actualización fue exitosa
      setInlineEditingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    } catch (error) {
      console.error('Error updating task:', error);
      // Mostrar error al usuario y mantener el formulario abierto
      alert(error instanceof Error ? error.message : 'Failed to update task');
      // No cerrar el formulario para que el usuario pueda intentar de nuevo
    }
  };

  /**
   * Maneja actualizaciones de tareas padre desde resolución de conflictos
   * @param parentId - ID de la tarea padre a actualizar
   * @param parentData - Datos parciales de la tarea padre
   */
  const handleParentTaskUpdate = async (parentId: string, parentData: Partial<Task>) => {
    try {
      await onTaskUpdate(parentId, parentData);
    } catch (error) {
      console.error('Error updating parent task:', error);
      throw error; // Re-lanzar el error para que lo maneje el componente que llama
    }
  };

  /**
   * Funciones para la creación inline de subtareas
   */
  
  /**
   * Inicia el modo de creación de subtarea para una tarea padre
   * @param taskId - ID de la tarea padre donde se creará la subtarea
   */
  const startCreatingSubtask = (taskId: string) => {
    setCreatingSubtasks(prev => {
      const newSet = new Set(prev);
      newSet.add(taskId);
      return newSet;
    });
  };

  /**
   * Cancela el modo de creación de subtarea
   * @param taskId - ID de la tarea padre cuya creación de subtarea se va a cancelar
   */
  const cancelCreatingSubtask = (taskId: string) => {
    setCreatingSubtasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
  };

  /**
   * Maneja la creación de una nueva subtarea
   * @param parentId - ID de la tarea padre
   * @param subtaskData - Datos de la subtarea a crear
   */
  const handleSubtaskCreate = async (parentId: string, subtaskData: {
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    tagIds: string[];
  }) => {
    try {
      await onSubtaskCreate(parentId, subtaskData);
      // Cerrar el formulario de creación solo si fue exitoso
      setCreatingSubtasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(parentId);
        return newSet;
      });
    } catch (error) {
      console.error('Error creating subtask:', error);
      // El formulario permanece abierto para que el usuario pueda intentar de nuevo
    }
  };

  /**
   * Funciones para edición de títulos (funcionalidad legacy - mantenida para compatibilidad)
   * Estas funciones permiten editar solo el título de una tarea de forma rápida
   */
  
  /**
   * Inicia la edición del título de una tarea
   * @param task - Tarea cuyo título se va a editar
   * @param event - Evento de mouse para prevenir propagación
   */
  const startEditingTitle = (task: Task, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingTasks(prev => new Set(prev).add(task.id));
    setEditingValues(prev => ({ ...prev, [task.id]: task.title })); // Inicializar con el título actual
  };

  /**
   * Guarda los cambios del título editado
   * @param taskId - ID de la tarea cuyo título se va a guardar
   */
  const saveEditingTitle = (taskId: string) => {
    const newTitle = editingValues[taskId]?.trim();
    if (newTitle && newTitle !== tasks.find(t => t.id === taskId)?.title) {
      // Encontrar la tarea y actualizarla
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        onTaskEdit({ ...task, title: newTitle });
      }
    }
    cancelEditingTitle(taskId);
  };

  /**
   * Cancela la edición del título y restaura el estado original
   * @param taskId - ID de la tarea cuya edición se va a cancelar
   */
  const cancelEditingTitle = (taskId: string) => {
    setEditingTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
    setEditingValues(prev => {
      const newValues = { ...prev };
      delete newValues[taskId]; // Limpiar el valor temporal
      return newValues;
    });
  };

  /**
   * Maneja las teclas presionadas durante la edición del título
   * @param event - Evento de teclado
   * @param taskId - ID de la tarea siendo editada
   */
  const handleTitleKeyDown = (event: React.KeyboardEvent, taskId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEditingTitle(taskId); // Guardar con Enter
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditingTitle(taskId); // Cancelar con Escape
    }
  };

  /**
   * Actualiza el valor temporal del título durante la edición
   * @param taskId - ID de la tarea siendo editada
   * @param value - Nuevo valor del título
   */
  const handleTitleChange = (taskId: string, value: string) => {
    setEditingValues(prev => ({ ...prev, [taskId]: value }));
  };

  /**
   * Funciones de utilidad para formateo de fechas y verificaciones
   */
  
  /**
   * Formatea un rango de fechas para mostrar en la interfaz
   * Maneja diferentes casos: solo fecha de inicio, solo fecha límite, o ambas
   * @param startDate - Fecha de inicio (opcional)
   * @param endDate - Fecha límite (opcional)
   * @returns String formateado para mostrar o null si no hay fechas
   */
  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return null;
    
    /**
     * Función auxiliar para formatear una fecha individual
     * @param dateString - Fecha en formato string
     * @returns Objeto con mes, día y fecha completa formateada
     */
    const formatDateShort = (dateString: string) => {
      const date = new Date(dateString);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      return { month, day, fullDate: `${day} ${month}` };
    };
    
    // Si solo existe fecha límite (due date)
    if (!startDate && endDate) {
      const { fullDate } = formatDateShort(endDate);
      return `Due ${fullDate}`;
    }
    
    // Si solo existe fecha de inicio
    if (startDate && !endDate) {
      const { fullDate } = formatDateShort(startDate);
      return `From ${fullDate}`;
    }
    
    // Si existen ambas fechas
    if (startDate && endDate) {
      const start = formatDateShort(startDate);
      const end = formatDateShort(endDate);
      
      // Misma fecha
      if (startDate === endDate) {
        return start.fullDate;
      }
      
      // Mismo mes
      if (start.month === end.month) {
        return `${start.day}-${end.day} ${start.month}`;
      }
      
      // Meses diferentes
      return `${start.fullDate} - ${end.fullDate}`;
    }
    
    return null;
  };

  /**
   * Verifica si una tarea está vencida (overdue)
   * @param dueDate - Fecha límite de la tarea
   * @param completed - Estado de completado de la tarea
   * @returns true si la tarea está vencida, false en caso contrario
   */
  const isOverdue = (dueDate: string, completed: boolean) => {
    if (completed) return false; // Las tareas completadas no pueden estar vencidas
    return new Date(dueDate) < new Date(); // Comparar con la fecha actual
  };

  /**
   * Función principal para renderizar una tarea individual
   * Maneja tanto tareas principales como subtareas de forma recursiva
   * @param task - Tarea a renderizar
   * @param level - Nivel de anidación (0 para tareas principales, >0 para subtareas)
   * @returns JSX Element que representa la tarea
   */
  const renderTask = (task: Task, level: number = 0) => {
    // Variables de estado para esta tarea específica
    const hasSubtasks = task.subtasks && task.subtasks.length > 0; // Verificar si tiene subtareas
    const isExpanded = expandedTasks.has(task.id); // Verificar si está expandida
    const overdue = task.dueDate && isOverdue(task.dueDate, task.completed); // Verificar si está vencida

    return (
      // Contenedor principal de la tarea con indentación para subtareas
      <div key={task.id} className={`${level > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
        {/* Tarjeta de la tarea con estilos condicionales */}
        <div 
          className={`bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm hover:shadow-md transition-shadow ${
            task.completed ? 'opacity-75' : '' // Opacidad reducida para tareas completadas
          } ${overdue ? 'border-red-300 bg-red-50' : ''}`} // Estilo especial para tareas vencidas
          data-task-container
          onMouseEnter={() => setHoveredTask(task.id)} // Activar hover effect
          onMouseLeave={() => setHoveredTask(null)}   // Desactivar hover effect
          onClick={(e) => {
            // Solo activar toggleTaskClick si el click no es en el título o input de edición
            const target = e.target as HTMLElement;
            if (!target.closest('[data-title-clickable]') && !target.closest('[data-editing-input]')) {
              toggleTaskClick(task.id, e);
            }
          }}
        >
          {/* Fila principal con contenido de la tarea */}
          <div className="flex items-start justify-between">
            {/* Sección izquierda: botón expandir, checkbox y contenido */}
            <div className="flex items-start space-x-3 flex-1">
              {/* Botón de expandir/colapsar para tareas con subtareas */}
              {hasSubtasks && (
                <button
                  onClick={() => toggleExpanded(task.id)}
                  className="mt-1 p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" /> // Icono para estado expandido
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" /> // Icono para estado colapsado
                  )}
                </button>
              )}

              {/* Checkbox para marcar como completada */}
              <div className="mt-1">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={(e) => onTaskToggle(task.id, e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
              </div>

              {/* Contenido principal de la tarea */}
              <div className="flex-1 min-w-0">
                {/* Título de la tarea (editable o estático) */}
                <div className="flex items-center space-x-2 mb-2">
                  {editingTasks.has(task.id) ? (
                    // Input de edición del título (funcionalidad legacy)
                    <input
                      type="text"
                      value={editingValues[task.id] || ''}
                      onChange={(e) => handleTitleChange(task.id, e.target.value)}
                      onKeyDown={(e) => handleTitleKeyDown(e, task.id)}
                      onBlur={() => saveEditingTitle(task.id)}
                      className={`text-sm font-medium bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded px-1 -mx-1 ${
                        task.completed ? 'line-through text-gray-500' : getPriorityTextColor(task.priority)
                      }`}
                      autoFocus
                      data-editing-input
                    />
                  ) : (
                    // Título clickeable para iniciar edición inline
                    <h3 
                      className={`text-sm font-medium cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1 transition-colors ${
                        task.completed ? 'line-through text-gray-500' : getPriorityTextColor(task.priority) // Color según prioridad
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        startInlineEditing(task, e); // Iniciar edición inline completa
                      }}
                      data-title-clickable
                    >
                      {task.title}
                    </h3>
                  )}
                  
                  {/* Etiquetas de la tarea (movidas desde la posición del badge de prioridad) */}
                  {task.tags && task.tags.length > 0 && (
                    <>
                      {task.tags.map(({ tag }) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: tag.color }} // Color personalizado de la etiqueta
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag.name}
                        </span>
                      ))}
                    </>
                  )}

                  {/* Indicador de tarea vencida */}
                  {overdue && (
                    <div className="flex items-center text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs ml-1">Overdue</span>
                    </div>
                  )}
                </div>

                {/* Descripción de la tarea */}
                {task.description && (
                  <p className={`text-sm text-gray-600 mb-2 ${
                    task.completed ? 'line-through' : '' // Tachado si está completada
                  }`}>
                    {task.description}
                  </p>
                )}
              </div>
            </div>

            {/* Botones de información y acciones */}
            <div className="flex items-center space-x-3 ml-4">
              {/* Rango de fechas y contador de subtareas movidos aquí */}
              <div className="flex items-center space-x-3 text-xs text-gray-500">
                {/* Mostrar rango de fechas si existe fecha de inicio o vencimiento */}
                {(task.startDate || task.dueDate) && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span className={overdue ? 'text-red-600 font-medium' : ''}>
                      {formatDateRange(task.startDate, task.dueDate)}
                    </span>
                  </div>
                )}
                
                {/* Mostrar contador de subtareas completadas si tiene subtareas */}
                {hasSubtasks && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {task.subtasks && task.subtasks.filter(st => st.completed).length}/{task.subtasks && task.subtasks.length} subtasks
                    </span>
                  </div>
                )}
              </div>
              
              {/* Menú contextual con opciones de editar y eliminar */}
              <div className="relative" data-context-menu>
                <button
                  onClick={(e) => toggleContextMenu(task.id, e)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded hover:bg-gray-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {/* Dropdown del menú contextual */}
                {openMenus.has(task.id) && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[100px]">
                    {/* Opción de editar tarea */}
                    <button
                      onClick={(e) => {
                        startInlineEditing(task, e); // Iniciar edición inline
                        setOpenMenus(new Set()); // Cerrar menú
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Edit
                    </button>
                    {/* Opción de eliminar tarea */}
                    <button
                      onClick={() => {
                        onTaskDelete(task.id); // Eliminar tarea
                        setOpenMenus(new Set()); // Cerrar menú
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Formulario de edición inline de tarea - posicionado entre el contenido de la tarea y el botón Add Subtask */}
          {inlineEditingTasks.has(task.id) && (
            <div className="mt-4 border-t pt-4" data-inline-edit-form>
              {/* Formulario completo de edición inline con todos los campos de la tarea */}
              <InlineTaskEditForm
                task={task} // Tarea a editar
                availableTags={availableTags} // Etiquetas disponibles para asignar
                onSave={(taskData) => handleInlineTaskSave(task.id, taskData)} // Guardar cambios
                onCancel={() => cancelInlineEditing(task.id)} // Cancelar edición
                isLoading={isLoading} // Estado de carga para operaciones asíncronas
                parentTask={task.parent ? { // Información de la tarea padre si es una subtarea
                  id: task.parent.id,
                  title: task.parent.title,
                  startDate: task.parent.startDate,
                  dueDate: task.parent.dueDate
                } : undefined}
                onParentTaskUpdate={handleParentTaskUpdate} // Actualizar tarea padre tras resolver conflictos
              />
            </div>
          )}

          {/* Formulario de creación inline de subtarea - posicionado entre el contenido de la tarea y el botón Add Subtask */}
          {creatingSubtasks.has(task.id) && (
            <div className="mt-4 border-t pt-4" data-inline-subtask-form>
              {/* Formulario para crear una nueva subtarea dentro de la tarea actual */}
              <InlineSubtaskForm
                parentId={task.id} // ID de la tarea padre
                parentTask={{ // Información de la tarea padre para validaciones y contexto
                  id: task.id,
                  title: task.title,
                  startDate: task.startDate,
                  dueDate: task.dueDate
                }}
                availableTags={availableTags} // Etiquetas disponibles para la subtarea
                onSave={(subtaskData) => handleSubtaskCreate(task.id, subtaskData)} // Crear nueva subtarea
                onCancel={() => cancelCreatingSubtask(task.id)} // Cancelar creación
                isLoading={isLoading} // Estado de carga
                onParentTaskUpdate={handleParentTaskUpdate} // Actualizar tarea padre si es necesario
              />
            </div>
          )}

          {/* Add Subtask Button - appears on hover or click/tap */}
          {(hoveredTask === task.id || clickedTasks.has(task.id)) && !creatingSubtasks.has(task.id) && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startCreatingSubtask(task.id);
                }}
                className="w-full flex items-center justify-center px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-dashed border-gray-300 hover:border-blue-300"
              >
                <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                Add Subtask
              </button>
            </div>
          )}
        </div>

        {/* Renderizado recursivo de subtareas cuando la tarea está expandida */}
        {hasSubtasks && isExpanded && (
          <div className="ml-4">
            {/* Mapear cada subtarea y renderizarla con nivel de anidación incrementado */}
            {task.subtasks && task.subtasks.map(subtask => renderTask(subtask, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Agrupar tareas por padre (mostrar solo tareas de nivel superior, las subtareas se renderizan dentro de sus padres)
  const topLevelTasks = filteredTasks.filter(task => !task.parentId);

  // Mostrar mensaje cuando no hay tareas que mostrar
  if (topLevelTasks.length === 0) {
    return (
      <div className="text-center py-12">
        {/* Icono de estado vacío */}
        <div className="text-gray-400 mb-4">
          <Clock className="w-12 h-12 mx-auto" />
        </div>
        {/* Título del mensaje de estado vacío */}
        <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
        {/* Descripción contextual basada en si hay tareas o solo están filtradas */}
        <p className="text-gray-500">
          {tasks.length === 0 
            ? "You haven't created any tasks yet. Create your first task to get started!" // No hay tareas en absoluto
            : "No tasks match your current filters. Try adjusting your search criteria." // Hay tareas pero están filtradas
          }
        </p>
      </div>
    );
  }

  // Renderizado principal del componente con la lista de tareas
  return (
    <div className="space-y-4">
      {/* Renderizar cada tarea de nivel superior (las subtareas se renderizan recursivamente) */}
      {topLevelTasks.map(task => renderTask(task))}
    </div>
  );
};

export default TaskList;
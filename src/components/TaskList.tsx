'use client';

// Importaciones necesarias para React y componentes de UI
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { ChevronDown, ChevronRight, Calendar, Tag, CheckSquare, AlertCircle, Plus, MoreVertical, Clock, History, Edit3, Edit } from 'lucide-react';
import { Priority } from '../types/task';
import InlineTaskEditForm from './InlineTaskEditForm';
import InlineSubtaskForm from './InlineSubtaskForm';
import TaskHistory from './TaskHistory';
import BulkEditModal from './BulkEditModal';

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
 * Interfaz que define la estructura de un grupo de tareas
 * Utilizada para agrupar y organizar las tareas por categorías
 */
interface TaskGroup {
  id: string;        // Identificador único del grupo
  name: string;      // Nombre visible del grupo
  description?: string; // Descripción opcional del grupo
  color: string;     // Color hexadecimal para la visualización
  createdAt: string; // Fecha de creación
  updatedAt: string; // Fecha de última actualización
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
  priority: Priority; // Nivel de prioridad
  dueDate?: string;                              // Fecha límite (opcional)
  startDate?: string;                            // Fecha de inicio (opcional)
  originalDueDate?: string;                      // Fecha límite original antes de completar temprano
  parentId?: string;                             // ID de la tarea padre (para subtareas)
  groupId?: string;                              // ID del grupo al que pertenece la tarea
  createdAt: string;                             // Fecha de creación
  updatedAt: string;                             // Fecha de última actualización
  tags: { tag: Tag }[];                          // Etiquetas asociadas a la tarea
  subtasks: Task[];                              // Lista de subtareas
  parent?: Task;                                 // Referencia a la tarea padre
  group?: TaskGroup;                             // Referencia al grupo al que pertenece
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
    priority: Priority;
    dueDate?: string;
    tagIds: string[];
  }) => Promise<void>;
  availableTags: Tag[];                          // Lista de etiquetas disponibles
  availableGroups?: TaskGroup[];                 // Lista de grupos disponibles
  selectedTags: string[];                        // Etiquetas seleccionadas para filtrar
  selectedGroups?: string[];                     // Grupos seleccionados para filtrar
  priorityFilter: string;                        // Filtro de prioridad activo
  completedFilter: string;                       // Filtro de estado de completado
  isLoading?: boolean;                           // Estado de carga para operaciones asíncronas
  isGroupedView?: boolean;                       // Indica si se debe mostrar la vista agrupada
  onTaskStateUpdate?: (taskId: string, updatedTask: Task) => void; // Función para actualizar el estado local de una tarea
  onBulkDelete?: (taskIds: string[]) => void;    // Función para eliminar múltiples tareas
  onBulkEdit?: (taskIds: string[], updates: any) => Promise<void>; // Función para editar múltiples tareas
  onGlobalBulkEdit?: (selectedTasks: Task[]) => void; // Función para manejar edición masiva global
  onClearSelection?: (clearFn: () => void) => void; // Callback para recibir la función de limpiar selección
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
  availableGroups = [],    // Grupos disponibles para asignar
  selectedTags,            // Etiquetas seleccionadas en filtros
  selectedGroups = [],     // Grupos seleccionados en filtros
  priorityFilter,          // Filtro de prioridad activo
  completedFilter,         // Filtro de estado activo
  isLoading = false,       // Estado de carga global
  isGroupedView = false,   // Indica si se debe mostrar la vista agrupada
  onTaskStateUpdate,       // Callback para actualizar estado local de tarea
  onBulkDelete,            // Callback para eliminar múltiples tareas
  onBulkEdit,              // Callback para editar múltiples tareas
  onGlobalBulkEdit,        // Callback para edición masiva global
  onClearSelection         // Callback para limpiar selección múltiple
}) => {
  // Estados para gestionar las interacciones de la interfaz de usuario
  
  /** Estado que controla qué tareas están expandidas (mostrando subtareas) */
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  
  // Debug: Monitorear cambios en las tareas
  useEffect(() => {
    console.log('🔄 TaskList re-renderizado con', tasks.length, 'tareas');
    console.log('🔄 Tareas actuales:', tasks.map(t => ({ id: t.id, title: t.title, subtasks: t.subtasks?.length || 0 })));
  }, [tasks]);
  
  /** Estado que rastrea sobre qué tarea está el cursor (hover effect) */
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  
  /** Estado que rastrea qué tareas han sido clickeadas (para mostrar botón Add Subtask) */
  const [clickedTasks, setClickedTasks] = useState<Set<string>>(new Set());
  
  /** Estado para manejar el delay del hover en el botón Add Subtask */
  const [hoverDelayTask, setHoverDelayTask] = useState<string | null>(null);
  
  /** Estado para manejar las animaciones de completar tareas */
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  
  /** Referencias para los timeouts del hover delay */
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
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
  
  /** Estado que rastrea el progreso anterior de cada tarea para detectar cambios */
  const [previousProgress, setPreviousProgress] = useState<Record<string, number>>({});
  
  /** Estado que controla qué tareas están animando su barra de progreso */
  const [animatingProgress, setAnimatingProgress] = useState<Set<string>>(new Set());
  
  /** Estado que controla qué tareas tienen el historial visible */
  const [visibleHistory, setVisibleHistory] = useState<Set<string>>(new Set());
  
  /** Estado que controla qué tareas están seleccionadas para eliminación múltiple */
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  
  /** Estado que controla si el modo de selección múltiple está activo */
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  
  /** Estado que controla si el modal de edición masiva está abierto */
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState<boolean>(false);
  
  /**
   * Función para limpiar la selección múltiple
   */
  const clearSelection = React.useCallback(() => {
    setSelectedTasks(new Set());
    setIsMultiSelectMode(false);
  }, []);
  
  /**
   * Exponer la función de limpiar selección al componente padre
   * Usamos useRef para evitar problemas de renderizado durante el ciclo de render
   */
  const clearSelectionRef = React.useRef(clearSelection);
  clearSelectionRef.current = clearSelection;
  
  React.useEffect(() => {
    if (onClearSelection) {
      onClearSelection(() => clearSelectionRef.current());
    }
  }, [onClearSelection]);

  // Nota: El cierre automático del modo de selección múltiple se maneja
  // exclusivamente a través de la función clearSelection llamada desde el componente padre

  /**
   * Effect para manejar clicks globales y ocultar elementos de la UI
   * Se ejecuta una sola vez al montar el componente
   */
  useEffect(() => {
    /**
     * Función que maneja el evento personalizado para activar modo de selección múltiple
     */
    const handleToggleMultiSelect = () => {
      toggleMultiSelectMode();
    };

    // Agregar listener para el evento personalizado
    window.addEventListener('toggleMultiSelect', handleToggleMultiSelect);

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
      const historyPanel = target.closest('[data-history-panel]');
      const historyButton = target.closest('[data-history-button]');
      const commentSection = target.closest('[data-comment-section]');
      const commentButton = target.closest('[data-comment-button]');
      const commentForm = target.closest('[data-comment-form]');
      const commentTextarea = target.closest('[data-comment-textarea]');
      const commentCancel = target.closest('[data-comment-cancel]');
      const commentSubmit = target.closest('[data-comment-submit]');
      
      if (!taskContainer) {
        // Click fuera de cualquier tarea, limpiar todas las tareas clickeadas
        setClickedTasks(new Set());
      }
      
      if (!contextMenu) {
        // Click fuera de cualquier menú contextual, cerrar todos los menús
        setOpenMenus(new Set());
      }
      
      if (!historyPanel && !historyButton && !commentSection && !commentButton && !commentForm && !commentTextarea && !commentCancel && !commentSubmit) {
        // Click fuera del panel de historial y botón, cerrar todos los historiales
        setVisibleHistory(new Set());
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
      window.removeEventListener('toggleMultiSelect', handleToggleMultiSelect);
      
      // Limpiar timeout del hover delay si existe
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []); // Array de dependencias vacío = se ejecuta solo una vez

  /**
   * Effect para detectar cambios en el progreso de las tareas y activar animaciones
   * Se ejecuta cada vez que cambia la lista de tareas
   */
  useEffect(() => {
    const newProgress: Record<string, number> = {};
    const tasksToAnimate = new Set<string>();

    // Función recursiva para procesar tareas y subtareas
    const processTask = (task: Task) => {
      if (task.subtasks && task.subtasks.length > 0) {
        const currentProgress = calculateSubtaskProgress(task.subtasks);
        const previousProgressValue = previousProgress[task.id] || 0;
        
        newProgress[task.id] = currentProgress;
        
        // Si el progreso cambió, activar animación
        if (currentProgress !== previousProgressValue && previousProgressValue !== undefined) {
          tasksToAnimate.add(task.id);
        }
      }
      
      // Procesar subtareas recursivamente
      task.subtasks?.forEach(processTask);
    };

    // Procesar todas las tareas
    tasks.forEach(processTask);
    
    // Actualizar el progreso anterior
    setPreviousProgress(prev => {
      // Solo actualizar si hay cambios reales
      const hasChanges = Object.keys(newProgress).some(taskId => 
        newProgress[taskId] !== (prev[taskId] || 0)
      );
      
      if (hasChanges) {
        return newProgress;
      }
      return prev;
    });
    
    // Activar animaciones para tareas que cambiaron
    if (tasksToAnimate.size > 0) {
      setAnimatingProgress(tasksToAnimate);
      
      // Desactivar animaciones después de 1.5 segundos
      setTimeout(() => {
        setAnimatingProgress(new Set());
      }, 1500);
    }
  }, [tasks]); // Solo depende de las tareas, no del progreso anterior

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
   * Función para manejar el toggle del historial de una tarea padre
   * @param taskId - ID de la tarea padre
   */
  const handleHistoryToggle = (taskId: string) => {
    setVisibleHistory(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.clear(); // Solo mostrar un historial a la vez
        newSet.add(taskId);
      }
      return newSet;
    });
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

    // Filtrar por grupos seleccionados
    if (selectedGroups.length > 0) {
      if (!task.groupId || !selectedGroups.includes(task.groupId)) {
        return false;
      }
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
   * Maneja el hover con delay para el botón Add Subtask
   * @param taskId - ID de la tarea sobre la que se hace hover
   */
  const handleTaskHoverEnter = (taskId: string) => {
    setHoveredTask(taskId);
    
    // Limpiar timeout anterior si existe
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Establecer delay de 800ms antes de mostrar el botón Add Subtask
    hoverTimeoutRef.current = setTimeout(() => {
      setHoverDelayTask(taskId);
    }, 800);
  };

  /**
   * Maneja cuando el mouse sale de la tarea
   */
  const handleTaskHoverLeave = () => {
    setHoveredTask(null);
    setHoverDelayTask(null);
    
    // Limpiar timeout si existe
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  /**
   * Función para alternar la selección de una tarea en modo selección múltiple
   * @param taskId - ID de la tarea a seleccionar/deseleccionar
   */
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(taskId)) {
        newSelected.delete(taskId);
      } else {
        newSelected.add(taskId);
      }
      return newSelected;
    });
  };

  /**
   * Función para seleccionar todas las tareas visibles
   */
  const selectAllTasks = () => {
    const allTaskIds = new Set<string>();
    const addTaskIds = (tasks: Task[]) => {
      tasks.forEach(task => {
        allTaskIds.add(task.id);
        if (task.subtasks && task.subtasks.length > 0) {
          addTaskIds(task.subtasks);
        }
      });
    };
    addTaskIds(filteredTasks);
    setSelectedTasks(allTaskIds);
  };

  /**
   * Función para eliminar las tareas seleccionadas
   */
  const deleteSelectedTasks = () => {
    if (selectedTasks.size === 0) return;
    
    // Si no hay función onBulkDelete, usar el comportamiento anterior con window.confirm
    if (!onBulkDelete) {
      const confirmMessage = `¿Estás seguro de que quieres eliminar ${selectedTasks.size} tarea${selectedTasks.size > 1 ? 's' : ''}?`;
      
      if (window.confirm(confirmMessage)) {
        selectedTasks.forEach(taskId => {
          onTaskDelete(taskId);
        });
        setSelectedTasks(new Set());
        setIsMultiSelectMode(false);
      }
      return;
    }
    
    const taskIds = Array.from(selectedTasks);
    onBulkDelete(taskIds);
    
    // Limpiar selección inmediatamente después de llamar onBulkDelete
    // para asegurar que la UI se actualice correctamente
    setSelectedTasks(new Set());
    setIsMultiSelectMode(false);
  };

  /**
   * Función para abrir el modal de edición masiva
   */
  const openBulkEditModal = () => {
    if (selectedTasks.size === 0) return;
    
    // Usar la función global si está disponible, sino usar el modal local
    if (onGlobalBulkEdit) {
      const selectedTasksData = getSelectedTasksData();
      onGlobalBulkEdit(selectedTasksData);
      // Limpiar selección después de abrir el modal global
      setSelectedTasks(new Set());
      setIsMultiSelectMode(false);
    } else {
      setIsBulkEditModalOpen(true);
    }
  };

  /**
   * Función para cerrar el modal de edición masiva
   */
  const closeBulkEditModal = () => {
    setIsBulkEditModalOpen(false);
    // También limpiar selección cuando se cierra el modal
    setSelectedTasks(new Set());
    setIsMultiSelectMode(false);
  };

  /**
   * Función para manejar la edición masiva de tareas
   */
  const handleBulkEdit = async (updates: any) => {
    if (!onBulkEdit || selectedTasks.size === 0) return;
    
    try {
      const taskIds = Array.from(selectedTasks);
      await onBulkEdit(taskIds, updates);
      
      // closeBulkEditModal se encarga de limpiar la selección cuando se cierre el modal
    } catch (error) {
      // Re-lanzar el error para que BulkEditModal lo maneje
      throw error;
    }
  };

  /**
   * Función para obtener las tareas seleccionadas completas incluyendo todas sus subtareas
   */
  const getSelectedTasksData = (): Task[] => {
    const selectedTasksData: Task[] = [];
    
    const findTaskById = (tasks: Task[], id: string): Task | null => {
      for (const task of tasks) {
        if (task.id === id) return task;
        if (task.subtasks) {
          const found = findTaskById(task.subtasks, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    // Función recursiva para agregar una tarea y todas sus subtareas
    const addTaskWithSubtasks = (task: Task) => {
      selectedTasksData.push(task);
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(subtask => {
          addTaskWithSubtasks(subtask);
        });
      }
    };
    
    selectedTasks.forEach(taskId => {
      const task = findTaskById(tasks, taskId);
      if (task) {
        addTaskWithSubtasks(task);
      }
    });
    
    return selectedTasksData;
  };

  /**
   * Función para alternar el modo de selección múltiple
   */
  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(prev => !prev);
    if (isMultiSelectMode) {
      setSelectedTasks(new Set());
    }
  };

  /**
   * Maneja la animación de completar tarea
   * @param taskId - ID de la tarea
   * @param completed - Nuevo estado de completado
   */
  const handleTaskToggleWithAnimation = (taskId: string, completed: boolean) => {
    // Validar que taskId sea válido antes de proceder
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      console.error('Invalid taskId in handleTaskToggleWithAnimation:', taskId);
      return;
    }
    
    console.log(`TaskList: handleTaskToggleWithAnimation called with taskId: ${taskId}, completed: ${completed}`);
    
    if (completed) {
      // Agregar animación de completado
      setCompletingTasks(prev => new Set(prev).add(taskId));
      
      // Ejecutar la función original después de un breve delay para la animación
      setTimeout(() => {
        onTaskToggle(taskId, completed);
        // Remover de la animación después de completar
        setTimeout(() => {
          setCompletingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
        }, 300);
      }, 150);
    } else {
      // Para descompletar, no necesitamos animación especial
      onTaskToggle(taskId, completed);
    }
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
      // Hacer la petición directamente con el header de resolución de conflictos
      const response = await fetch(`/api/tasks/${parentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-conflict-resolution': 'true' // Header para identificar actualizaciones por conflictos
        },
        body: JSON.stringify(parentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update parent task' }));
        throw new Error(errorData.message || 'Failed to update parent task');
      }

      const updatedTask = await response.json();
      
      // Actualizar el estado local usando el callback si está disponible
      if (onTaskStateUpdate) {
        onTaskStateUpdate(parentId, updatedTask);
      }
      
      console.log('Parent task updated successfully by conflict resolution:', updatedTask);
      
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
    priority: Priority;
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
   * Muestra fecha original tachada si la tarea fue completada antes de tiempo
   * @param startDate - Fecha de inicio (opcional)
   * @param endDate - Fecha límite (opcional)
   * @param originalDueDate - Fecha límite original antes de completar (opcional)
   * @param completed - Si la tarea está completada
   * @returns JSX element formateado para mostrar o null si no hay fechas
   */
  const formatDateRange = (startDate?: string, endDate?: string, originalDueDate?: string, completed?: boolean) => {
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
      
      // Si hay fecha original y es diferente, mostrar ambas
      if (completed && originalDueDate && originalDueDate !== endDate) {
        const originalFormatted = formatDateShort(originalDueDate);
        return (
          <span>
            Due <span className="line-through text-gray-400">{originalFormatted.fullDate}</span>{' '}
            <span className="text-green-600 font-medium">{fullDate}</span>
          </span>
        );
      }
      
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
      
      // Si hay fecha original diferente y está completada, mostrar cambio
      if (completed && originalDueDate && originalDueDate !== endDate) {
        const originalEnd = formatDateShort(originalDueDate);
        
        // Misma fecha de inicio
        if (startDate === endDate) {
          return (
            <span>
              <span className="line-through text-gray-400">{start.fullDate} - {originalEnd.fullDate}</span>{' '}
              <span className="text-green-600 font-medium">{start.fullDate} - {end.fullDate}</span>
            </span>
          );
        }
        
        // Mismo mes para las fechas actuales
        if (start.month === end.month) {
          const originalSameMonth = start.month === originalEnd.month;
          return (
            <span>
              <span className="line-through text-gray-400">
                {originalSameMonth ? `${start.day}-${originalEnd.day} ${start.month}` : `${start.fullDate} - ${originalEnd.fullDate}`}
              </span>{' '}
              <span className="text-green-600 font-medium">{start.day}-{end.day} {start.month}</span>
            </span>
          );
        }
        
        // Meses diferentes
        return (
          <span>
            <span className="line-through text-gray-400">{start.fullDate} - {originalEnd.fullDate}</span>{' '}
            <span className="text-green-600 font-medium">{start.fullDate} - {end.fullDate}</span>
          </span>
        );
      }
      
      // Comportamiento normal sin cambios de fecha
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
    const today = new Date();
    const due = new Date(dueDate);
    
    // Normalizar fechas para comparar solo el día (sin horas)
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    return due < today; // Comparar con la fecha actual (solo día)
  };

  /**
   * Verifica si una tarea está en su último día (due today)
   * @param dueDate - Fecha límite de la tarea
   * @param completed - Estado de completado de la tarea
   * @returns true si la tarea vence hoy, false en caso contrario
   */
  const isLastDay = (dueDate: string, completed: boolean) => {
    if (completed) return false; // Las tareas completadas no están en último día
    const today = new Date();
    const due = new Date(dueDate);
    
    // Normalizar fechas para comparar solo el día (sin horas)
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    return due.getTime() === today.getTime(); // Comparar si es el mismo día
  };

  /**
   * Calcula el porcentaje de progreso de las subtareas completadas
   * @param subtasks - Array de subtareas
   * @returns Porcentaje de subtareas completadas (0-100)
   */
  const calculateSubtaskProgress = (subtasks: Task[]) => {
    if (!subtasks || subtasks.length === 0) return 0;
    const completedCount = subtasks.filter(subtask => subtask.completed).length;
    return Math.round((completedCount / subtasks.length) * 100);
  };

  /**
   * Genera los estilos CSS para la barra de progreso de fondo
   * @param progress - Porcentaje de progreso (0-100)
   * @param taskId - ID de la tarea para verificar si está animando
   * @returns Objeto con estilos CSS para el gradiente de fondo
   */
  const getProgressBarStyles = (progress: number, taskId: string) => {
    if (progress === 0) return {};
    
    const isAnimating = animatingProgress.has(taskId);
    
    return {
      backgroundImage: `linear-gradient(to right, 
        rgba(34, 197, 94, 0.08) 0%, 
        rgba(34, 197, 94, 0.12) ${Math.max(progress - 5, 0)}%, 
        rgba(34, 197, 94, 0.18) ${progress}%, 
        rgba(34, 197, 94, 0.05) ${Math.min(progress + 2, 100)}%, 
        transparent ${Math.min(progress + 5, 100)}%, 
        transparent 100%
      )`,
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      transition: isAnimating ? 'all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'all 0.3s ease-out'
    };
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
    const lastDay = task.dueDate && isLastDay(task.dueDate, task.completed); // Verificar si es el último día
    const subtaskProgress = hasSubtasks ? calculateSubtaskProgress(task.subtasks) : 0; // Calcular progreso de subtareas
    const progressBarStyles = hasSubtasks ? getProgressBarStyles(subtaskProgress, task.id) : {}; // Estilos de barra de progreso

    return (
      // Contenedor principal de la tarea con indentación para subtareas
      <div key={task.id} className={`${level > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
        {/* Tarjeta de la tarea con estilos condicionales y barra de progreso */}
        <div 
          className={`bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-300 ${
            task.completed ? 'opacity-75' : '' // Opacidad reducida para tareas completadas
          } ${overdue ? 'border-red-300 bg-red-50' : lastDay ? 'border-orange-300 bg-orange-50' : ''} ${
            completingTasks.has(task.id) ? 'transform scale-105 bg-green-50 border-green-300 shadow-lg' : ''
          }`} // Estilo especial para tareas vencidas (rojo), último día (naranja) y animación de completado
          style={progressBarStyles} // Aplicar estilos de barra de progreso como fondo
          data-task-container
          onMouseEnter={() => handleTaskHoverEnter(task.id)} // Activar hover effect con delay
          onMouseLeave={handleTaskHoverLeave}   // Desactivar hover effect
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
              {/* Checkbox para selección múltiple (solo visible en modo selección múltiple) */}
              {isMultiSelectMode && (
                <div className="mt-1">
                  <input
                    type="checkbox"
                    checked={selectedTasks.has(task.id)}
                    onChange={() => toggleTaskSelection(task.id)}
                    className="w-4 h-4 text-blue-600 bg-blue-100 border-blue-300 rounded focus:ring-blue-500 focus:ring-2 transition-all duration-200 cursor-pointer"
                  />
                </div>
              )}
              
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
                  onChange={(e) => {
                    if (task.id && typeof task.id === 'string' && task.id.trim() !== '') {
                      handleTaskToggleWithAnimation(task.id, e.target.checked);
                    } else {
                      console.error('Invalid task.id in checkbox onChange:', task.id, 'Task:', task);
                    }
                  }}
                  disabled={isMultiSelectMode}
                  className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 transition-all duration-200 ${
                    task.id && completingTasks.has(task.id) ? 'transform scale-110' : ''
                  } ${isMultiSelectMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                  
                  {/* Etiquetas de la tarea y porcentaje de progreso */}
                  <div className="flex items-center space-x-2">
                    {/* Etiquetas de la tarea */}
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
                    
                    {/* Indicador del grupo (solo en vista normal, no agrupada) */}
                    {!isGroupedView && task.group && (
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                        style={{ 
                          backgroundColor: `${task.group.color}20`, 
                          borderColor: task.group.color,
                          color: task.group.color
                        }}
                        title={`Grupo: ${task.group.name}${task.group.description ? ` - ${task.group.description}` : ''}`}
                      >
                        <div 
                          className="w-2 h-2 rounded-full mr-1" 
                          style={{ backgroundColor: task.group.color }}
                        />
                        {task.group.name}
                      </span>
                    )}
                    
                    {/* Porcentaje de progreso de subtareas */}
                      {hasSubtasks && (
                        <span 
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 transition-all duration-500 hover:bg-green-200 hover:scale-105 animate-in fade-in slide-in-from-left-2"
                          style={{
                            animation: 'progressFadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                            animationDelay: '0.2s',
                            animationFillMode: 'both'
                          }}
                        >
                          {subtaskProgress}%
                        </span>
                      )}
                  </div>

                  {/* Indicador de tarea vencida o último día */}
                  {overdue && (
                    <div className="flex items-center text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs ml-1">Overdue</span>
                    </div>
                  )}
                  {lastDay && !overdue && (
                    <div className="flex items-center text-orange-600">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs ml-1">Último día</span>
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
                    <span className={overdue ? 'text-red-600 font-medium' : lastDay ? 'text-orange-600 font-medium' : ''}>
                      {formatDateRange(task.startDate, task.dueDate, task.originalDueDate, task.completed)}
                    </span>
                  </div>
                )}
                
                {/* Mostrar contador de subtareas completadas si tiene subtareas */}
                {hasSubtasks && (
                  <div className="flex items-center space-x-1">
                    <CheckSquare className="w-3 h-3" />
                    <span>
                      {task.subtasks && task.subtasks.filter(st => st.completed).length}/{task.subtasks && task.subtasks.length} subtasks
                    </span>
                  </div>
                )}
              </div>
              
              {/* Botones de acción */}
              <div className="flex items-center gap-1">

                {/* Botón de historial - solo para tareas padre */}
                {!task.parentId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHistoryToggle(task.id);
                    }}
                    className={`p-1 transition-colors rounded hover:bg-gray-100 ${
                      visibleHistory.has(task.id) 
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    data-history-button
                    title="Ver historial"
                  >
                    <History className="w-4 h-4" />
                  </button>
                )}
                
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
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[100px]">
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
                      onClick={(e) => {
                        e.stopPropagation();
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
          </div>

          {/* Formulario de edición inline de tarea - posicionado entre el contenido de la tarea y el botón Add Subtask */}
          {inlineEditingTasks.has(task.id) && (
            <div className="mt-4 border-t pt-4" data-inline-edit-form>
              {/* Formulario completo de edición inline con todos los campos de la tarea */}
              <InlineTaskEditForm
                task={task} // Tarea a editar
                availableTags={availableTags} // Etiquetas disponibles para asignar
                availableGroups={availableGroups} // Grupos disponibles para asignar
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
                  dueDate: task.dueDate,
                  priority: task.priority,
                  tags: task.tags
                }}
                availableTags={availableTags} // Etiquetas disponibles para la subtarea
                onSave={(subtaskData) => handleSubtaskCreate(task.id, subtaskData)} // Crear nueva subtarea
                onCancel={() => cancelCreatingSubtask(task.id)} // Cancelar creación
                isLoading={isLoading} // Estado de carga
                onParentTaskUpdate={handleParentTaskUpdate} // Actualizar tarea padre si es necesario
              />
            </div>
          )}

          {/* Add Subtask Button - limitado a máximo 2 niveles de anidación */}
          {(hoverDelayTask === task.id || clickedTasks.has(task.id)) && !creatingSubtasks.has(task.id) && level < 2 && (
            <div className="mt-3 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startCreatingSubtask(task.id);
                }}
                className="w-full flex items-center justify-center px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200 border border-dashed border-gray-300 hover:border-blue-300 hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                Add Subtask
              </button>
            </div>
          )}
          
          {/* Panel de historial - solo para tareas padre */}
          {!task.parentId && visibleHistory.has(task.id) && (
            <div className="mt-4 border-t pt-4" data-history-panel>
              <TaskHistory 
                taskId={task.id}
                isVisible={true}
                onClose={() => handleHistoryToggle(task.id)}
              />
            </div>
          )}
        </div>

        {/* Renderizado recursivo de subtareas cuando la tarea está expandida - máximo 2 niveles */}
        {hasSubtasks && isExpanded && level <= 2 && (
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

  // Barra de acciones para selección múltiple
  const renderMultiSelectBar = () => {
    if (!isMultiSelectMode) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedTasks.size} tarea{selectedTasks.size !== 1 ? 's' : ''} seleccionada{selectedTasks.size !== 1 ? 's' : ''}
            </span>
            <button
              onClick={selectAllTasks}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Seleccionar todas
            </button>
            <button
              onClick={clearSelection}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Deseleccionar todas
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={openBulkEditModal}
              disabled={selectedTasks.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium flex items-center space-x-2"
            >
              <Edit3 className="h-4 w-4" />
              <span>Editar seleccionadas</span>
            </button>
            <button
              onClick={deleteSelectedTasks}
              disabled={selectedTasks.size === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
            >
              Eliminar seleccionadas
            </button>
            <button
              onClick={toggleMultiSelectMode}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Renderizado principal del componente con la lista de tareas
  if (isGroupedView) {
    // Vista agrupada: organizar tareas por grupos
    const tasksByGroup = new Map<string, Task[]>();
    const tasksWithoutGroup: Task[] = [];

    // Clasificar tareas por grupo
    topLevelTasks.forEach(task => {
      if (task.groupId && task.group) {
        if (!tasksByGroup.has(task.groupId)) {
          tasksByGroup.set(task.groupId, []);
        }
        tasksByGroup.get(task.groupId)!.push(task);
      } else {
        tasksWithoutGroup.push(task);
      }
    });

    return (
      <div>
        {/* Barra de acciones para selección múltiple */}
        {renderMultiSelectBar()}
        
        <div className="space-y-6">
          {/* Renderizar grupos con tareas */}
          {Array.from(tasksByGroup.entries()).map(([groupId, groupTasks]) => {
            const group = groupTasks[0].group!;
            return (
              <div key={groupId} className="border border-gray-200 rounded-lg overflow-visible">
                {/* Encabezado del grupo */}
                <div 
                  className="px-4 py-3 border-b border-gray-200" 
                  style={{ backgroundColor: `${group.color}15`, borderLeftColor: group.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Botón de edición masiva del grupo */}
                      <button
                        onClick={() => {
                          // Seleccionar todas las tareas de nivel 0 del grupo
                          const topLevelGroupTasks = groupTasks.filter(task => !task.parentId);
                          
                          // Usar la función global si está disponible, sino usar el modal local
                          if (onGlobalBulkEdit) {
                            onGlobalBulkEdit(topLevelGroupTasks);
                          } else {
                            const taskIds = topLevelGroupTasks.map(task => task.id);
                            // Limpiar selección actual
                            setSelectedTasks(new Set());
                            // Seleccionar las tareas del grupo
                            setSelectedTasks(new Set(taskIds));
                            // Abrir modal de edición masiva local
                            setIsBulkEditModalOpen(true);
                          }
                        }}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        title="Editar todas las tareas del grupo"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: group.color }}
                      >
                        {groupTasks.length} {groupTasks.length === 1 ? 'tarea' : 'tareas'}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Tareas del grupo */}
                <div className="p-4 space-y-4">
                  {groupTasks.map(task => renderTask(task))}
                </div>
              </div>
            );
          })}

          {/* Tareas sin grupo */}
          {tasksWithoutGroup.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-visible">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Sin grupo</h3>
                    <p className="text-sm text-gray-600 mt-1">Tareas que no pertenecen a ningún grupo</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                    {tasksWithoutGroup.length} {tasksWithoutGroup.length === 1 ? 'tarea' : 'tareas'}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {tasksWithoutGroup.map(task => renderTask(task))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista normal: lista simple de tareas
  return (
    <div>
      {/* Barra de acciones para selección múltiple */}
      {renderMultiSelectBar()}
      
      <div className="space-y-4">
        {/* Renderizar cada tarea de nivel superior (las subtareas se renderizan recursivamente) */}
        {topLevelTasks.map(task => renderTask(task))}
      </div>
      
      {/* Modal de edición masiva ahora se maneja globalmente */}
    </div>
  );

};

export default TaskList;
import React, { useState } from 'react';
import {ChevronDown, ChevronRight, Calendar, CheckSquare, Clock, History, MoreVertical, Tag, AlertCircle, Plus, Edit, Edit3, Users, Eye, EyeOff} from 'lucide-react';
import { safeDate, safeNow } from '@/utils/dateUtils';
import TaskHistory from './TaskHistory';
import GroupHistory from './GroupHistory';
import { InlineTaskEditForm } from './InlineTaskEditForm';
import InlineSubtaskForm from './InlineSubtaskForm';

// Función para obtener el color de texto según la prioridad
const getPriorityTextColor = (priority) => {
  switch (priority) {
    case 'URGENT': return 'text-red-600';
    case 'HIGH': return 'text-orange-600';
    case 'MEDIUM': return 'text-yellow-600';
    case 'LOW': return 'text-green-600';
    default: return 'text-gray-600';
  }
};

const TaskList = ({
  tasks,
  availableTags,
  availableGroups,
  groups,
  statusFilter,
  priorityFilter,
  isGroupedView,
  isMultiSelectMode,
  setIsMultiSelectMode,
  isLoading,
  selectedTags,
  selectedGroups,
  visibleHistory,
  onTaskDelete,
  onBulkDelete,
  onGlobalBulkEdit,
  handleHistoryToggle,
  onTaskEdit,
  onTaskUpdate,
  onTaskStateUpdate,
  onTaskToggle,
  onSubtaskCreate
}) => {

  const [expandedTasks, setExpandedTasks] = React.useState(new Set());
  const hoverTimeoutRef = React.useRef(null);
  const [animatingProgress, setAnimatingProgress] = React.useState(new Set());
  const [clickedTasks, setClickedTasks] = React.useState(new Set());
  const [hoveredTask, setHoveredTask] = React.useState(null);
  const [hoverDelayTask, setHoverDelayTask] = React.useState(null);
  const [completingTasks, setCompletingTasks] = React.useState(new Set());
  const [longPressTimers, setLongPressTimers] = React.useState(new Map());
  const [longPressActive, setLongPressActive] = React.useState(new Set());
  const [creatingSubtasks, setCreatingSubtasks] = React.useState(new Set());
  const [inlineEditingTasks, setInlineEditingTasks] = React.useState(new Set());
  const [editingTasks, setEditingTasks] = React.useState(new Set());
  const [editingValues, setEditingValues] = React.useState(new Set());
  const [openMenus, setOpenMenus] = React.useState(new Set());
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = React.useState(false);
  const [selectedTasks, setSelectedTasks] = React.useState(new Set());
  
  // Estado para el historial de grupos
  const [visibleGroupHistory, setVisibleGroupHistory] = useState(new Set());

  // Calculate group progress percentage
  const calculateGroupProgress = (group) => {
    if (!group.taskStats || group.taskStats.total === 0) return 0;
    return Math.round((group.taskStats.completed / group.taskStats.total) * 100);
  };

  // Generate progress bar styles similar to TaskList
  const getGroupProgressBarStyles = (progress) => {
    if (progress === 0) return {};
    
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
      transition: 'all 0.3s ease-out'
    };
  };

  // Toggle group history visibility
  const toggleGroupHistory = (groupId) => {
    setVisibleGroupHistory(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // useEffect para escuchar el evento personalizado toggleMultiSelect
  React.useEffect(() => {
    const handleToggleMultiSelect = () => {
      toggleMultiSelectMode();
    };

    window.addEventListener('toggleMultiSelect', handleToggleMultiSelect);

    return () => {
      window.removeEventListener('toggleMultiSelect', handleToggleMultiSelect);
    };
  }, [isMultiSelectMode]); // Dependencia para que tenga acceso al estado actual

  // Función para guardar tareas expandidas en localStorage
  const saveExpandedTasksToStorage = (expandedSet) => {
    try {
      const expandedArray = Array.from(expandedSet);
      localStorage.setItem('expandedTasks', JSON.stringify(expandedArray));
    } catch (error) {
      console.error('Error saving expanded tasks to storage:', error);
    }
  };

  /**
   * Función para alternar el estado expandido/colapsado de una tarea
   * Controla si se muestran o no las subtareas de una tarea padre
   * @param taskId - ID de la tarea a expandir/colapsar
   */
  const toggleExpanded = (taskId: string) => {
    console.log(`🔍 TaskList: toggleExpanded called for taskId: ${taskId}`);
    console.log(`🔍 TaskList: Current expandedTasks:`, Array.from(expandedTasks));
    
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId); // Si está expandida, la colapsamos
      console.log(`🔍 TaskList: Collapsing task ${taskId}`);
    } else {
      newExpanded.add(taskId); // Si está colapsada, la expandimos
      console.log(`🔍 TaskList: Expanding task ${taskId}`);
    }
    
    console.log(`🔍 TaskList: New expandedTasks:`, Array.from(newExpanded));
    
    // Actualizar el estado y guardarlo en localStorage
    setExpandedTasks(newExpanded);
    saveExpandedTasksToStorage(newExpanded);
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
    addTaskIds(tasks);
    setSelectedTasks(allTaskIds);
  };

  /**
   * Función para deseleccionar todas las tareas
   */
  const clearSelection = () => {
    setSelectedTasks(new Set());
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
   * Maneja el inicio de presión larga en el botón de estado
   * @param taskId - ID de la tarea
   * @param currentStatus - Estado actual de la tarea
   */
  const handleLongPressStart = (taskId: string, currentStatus: 'pending' | 'ongoing' | 'completed') => {
    // Limpiar cualquier timer existente para esta tarea
    const existingTimer = longPressTimers.get(taskId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Crear nuevo timer para detectar presión larga (1 segundo)
    const timer = setTimeout(() => {
      // Marcar como presión larga activa
      setLongPressActive(prev => new Set(prev).add(taskId));
      
      // Cambiar directamente a 'pending' independientemente del estado actual
      console.log(`Long press detected for task ${taskId}, changing to pending from ${currentStatus}`);
      onTaskToggle(taskId, 'pending');
      
      // Limpiar el estado de presión larga después de un breve delay
      setTimeout(() => {
        setLongPressActive(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      }, 200);
    }, 1000); // 1 segundo para activar presión larga

    // Guardar el timer
    setLongPressTimers(prev => new Map(prev).set(taskId, timer));
  };

  /**
   * Maneja el fin de presión (mouseup, mouseleave, touchend)
   * @param taskId - ID de la tarea
   */
  const handleLongPressEnd = (taskId: string) => {
    const timer = longPressTimers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      setLongPressTimers(prev => {
        const newMap = new Map(prev);
        newMap.delete(taskId);
        return newMap;
      });
    }
  };

  /**
   * Maneja el click normal en el botón de estado
   * @param taskId - ID de la tarea
   * @param currentStatus - Estado actual de la tarea
   */
  const handleStatusButtonClick = (taskId: string, currentStatus: 'pending' | 'ongoing' | 'completed') => {
    // Solo procesar click normal si no hay presión larga activa
    if (!longPressActive.has(taskId)) {
      handleTaskToggleWithAnimation(taskId, currentStatus);
    }
  };

  /**
   * Maneja la animación de cambio de estado de tarea
   * @param taskId - ID de la tarea
   * @param currentStatus - Estado actual de la tarea
   */
  const handleTaskToggleWithAnimation = (taskId: string, currentStatus: 'pending' | 'ongoing' | 'completed') => {
    // Validar que taskId sea válido antes de proceder
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      console.error('Invalid taskId in handleTaskToggleWithAnimation:', taskId);
      return;
    }
    
    // Determinar el siguiente estado basado en el estado actual
    let nextStatus: 'pending' | 'ongoing' | 'completed';
    switch (currentStatus) {
      case 'pending':
        nextStatus = 'ongoing';
        break;
      case 'ongoing':
        nextStatus = 'completed';
        break;
      case 'completed':
        nextStatus = 'pending';
        break;
      default:
        nextStatus = 'pending';
    }
    
    console.log(`TaskList: handleTaskToggleWithAnimation called with taskId: ${taskId}, currentStatus: ${currentStatus}, nextStatus: ${nextStatus}`);
    
    if (nextStatus === 'completed') {
      // Agregar animación de completado
      setCompletingTasks(prev => new Set(prev).add(taskId));
      
      // Ejecutar la función original después de un breve delay para la animación
      setTimeout(() => {
        onTaskToggle(taskId, nextStatus);
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
      // Para otros cambios de estado, no necesitamos animación especial
      onTaskToggle(taskId, nextStatus);
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
  const formatDateRange = (startDate?: string, endDate?: string, originalDueDate?: string, isCompleted?: boolean) => {
    if (!startDate && !endDate) return null;
    
    /**
     * Función auxiliar para formatear una fecha individual
     * @param dateString - Fecha en formato string
     * @returns Objeto con mes, día y fecha completa formateada
     */
    const formatDateShort = (dateString: string) => {
      const date = safeDate(dateString);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      return { month, day, fullDate: `${day} ${month}` };
    };
    
    // Si solo existe fecha límite (due date)
    if (!startDate && endDate) {
      const { fullDate } = formatDateShort(endDate);
      
      // Si hay fecha original y es diferente, mostrar ambas
      if (isCompleted && originalDueDate && originalDueDate !== endDate) {
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
      if (isCompleted && originalDueDate && originalDueDate !== endDate) {
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
  const isOverdue = (dueDate: string, status: string) => {
    if (!dueDate || status === 'completed') return false; // Las tareas completadas no pueden estar vencidas
    const today = safeNow();
    const due = safeDate(dueDate);
    
    // Validar que la fecha sea válida
    if (isNaN(due.getTime())) return false;
    
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
  const isLastDay = (dueDate: string, status: string) => {
    if (!dueDate || status === 'completed') return false; // Las tareas completadas no están en último día
    const today = safeNow();
    const due = safeDate(dueDate);
    
    // Validar que la fecha sea válida
    if (isNaN(due.getTime())) return false;
    
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
    const completedCount = subtasks.filter(subtask => subtask.status === 'completed').length;
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
    const overdue = task.dueDate && isOverdue(task.dueDate, task.status); // Verificar si está vencida
    const lastDay = task.dueDate && isLastDay(task.dueDate, task.status); // Verificar si es el último día
    const subtaskProgress = hasSubtasks ? calculateSubtaskProgress(task.subtasks) : 0; // Calcular progreso de subtareas
    const progressBarStyles = hasSubtasks ? getProgressBarStyles(subtaskProgress, task.id) : {}; // Estilos de barra de progreso

    return (
      // Contenedor principal de la tarea con indentación para subtareas
      <div key={task.id} className={`${level > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
        {/* Tarjeta de la tarea con estilos condicionales y barra de progreso */}
        <div 
          className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-300 ${
            task.status === 'completed' ? 'opacity-75' : '' // Opacidad reducida para tareas completadas
          } ${overdue ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20' : lastDay ? 'border-orange-300 bg-orange-50 dark:border-orange-600 dark:bg-orange-900/20' : ''} ${
            completingTasks.has(task.id) ? 'transform scale-105 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-600 shadow-lg' : ''
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
          <div className="flex items-center justify-between">
            {/* Sección izquierda: botón expandir, checkbox y contenido */}
            <div className="flex items-center space-x-3 flex-1">
              {/* Checkbox para selección múltiple (solo visible en modo selección múltiple) */}
              {isMultiSelectMode && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedTasks.has(task.id)}
                    onChange={() => toggleTaskSelection(task.id)}
                    className="w-4 h-4 text-blue-600 bg-blue-100 border-blue-300 rounded focus:ring-blue-500 focus:ring-2 transition-all duration-200 cursor-pointer"
                  />
                </div>
              )}
              
              {/* Botón de expandir/colapsar para tareas con subtareas o placeholder para alineación */}
              <div className="w-6 h-6 flex items-center justify-center">
                {hasSubtasks ? (
                  <button
                    onClick={() => toggleExpanded(task.id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" /> // Icono para estado expandido
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" /> // Icono para estado colapsado
                    )}
                  </button>
                ) : (
                  // Placeholder invisible para mantener alineación
                  <div className="w-6 h-6"></div>
                )}
              </div>

              {/* Indicador de estado de la tarea (tres estados) */}
              <div className="flex items-center">
                <button
                  onMouseDown={() => {
                    if (task.id && typeof task.id === 'string' && task.id.trim() !== '') {
                      handleLongPressStart(task.id, task.status || 'pending');
                    }
                  }}
                  onMouseUp={() => {
                    if (task.id && typeof task.id === 'string' && task.id.trim() !== '') {
                      handleLongPressEnd(task.id);
                    }
                  }}
                  onMouseLeave={() => {
                    if (task.id && typeof task.id === 'string' && task.id.trim() !== '') {
                      handleLongPressEnd(task.id);
                    }
                  }}
                  onTouchStart={() => {
                    if (task.id && typeof task.id === 'string' && task.id.trim() !== '') {
                      handleLongPressStart(task.id, task.status || 'pending');
                    }
                  }}
                  onTouchEnd={() => {
                    if (task.id && typeof task.id === 'string' && task.id.trim() !== '') {
                      handleLongPressEnd(task.id);
                    }
                  }}
                  onClick={() => {
                    if (task.id && typeof task.id === 'string' && task.id.trim() !== '') {
                      handleStatusButtonClick(task.id, task.status || 'pending');
                    } else {
                      console.error('Invalid task.id in status button onClick:', task.id, 'Task:', task);
                    }
                  }}
                  disabled={isMultiSelectMode}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    task.id && completingTasks.has(task.id) ? 'transform scale-110' : ''
                  } ${
                    task.id && longPressActive.has(task.id) ? 'transform scale-95 bg-red-100 border-red-400' : ''
                  } ${isMultiSelectMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'} ${
                    task.status === 'pending' 
                      ? 'border-gray-300 bg-white hover:border-gray-400' 
                      : task.status === 'ongoing'
                      ? 'border-yellow-400 bg-yellow-100 hover:border-yellow-500'
                      : 'border-green-500 bg-green-100 hover:border-green-600'
                  }`}
                  title={
                    task.status === 'pending' 
                      ? 'Pendiente - Click para marcar como En Proceso | Mantén presionado 1s para mantener como Pendiente' 
                      : task.status === 'ongoing'
                      ? 'En Proceso - Click para marcar como Completada | Mantén presionado 1s para marcar como Pendiente'
                      : 'Completada - Click para marcar como Pendiente | Mantén presionado 1s para marcar como Pendiente'
                  }
                >
                  {task.status === 'pending' && (
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  )}
                  {task.status === 'ongoing' && (
                    <Clock className="w-3 h-3 text-yellow-600" />
                  )}
                  {task.status === 'completed' && (
                    <CheckSquare className="w-3 h-3 text-green-600" />
                  )}
                </button>
              </div>

              {/* Contenido principal de la tarea */}
              <div className="flex-1 min-w-0">
                {/* Título de la tarea (editable o estático) */}
                <div className="flex items-center space-x-2">
                  {editingTasks.has(task.id) ? (
                    // Input de edición del título (funcionalidad legacy)
                    <input
                      type="text"
                      value={editingValues[task.id] || ''}
                      onChange={(e) => handleTitleChange(task.id, e.target.value)}
                      onKeyDown={(e) => handleTitleKeyDown(e, task.id)}
                      onBlur={() => saveEditingTitle(task.id)}
                      className={`text-sm font-medium bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded px-1 -mx-1 ${
                        task.status === 'completed' ? 'line-through text-gray-500' : getPriorityTextColor(task.priority)
                      }`}
                      autoFocus
                      data-editing-input
                    />
                  ) : (
                    // Título clickeable para iniciar edición inline
                    <h3 
                      className={`text-sm font-medium cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1 transition-colors ${
                        task.status === 'completed' ? 'line-through text-gray-500' : getPriorityTextColor(task.priority) // Color según prioridad
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
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 transition-all duration-500 hover:bg-green-200 dark:hover:bg-green-900/50 hover:scale-105 animate-in fade-in slide-in-from-left-2"
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
                  <p className={`text-sm text-gray-600 mt-1 ${
                    task.status === 'completed' ? 'line-through' : '' // Tachado si está completada
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
                      {formatDateRange(task.startDate, task.dueDate, task.originalDueDate, task.status === 'completed')}
                    </span>
                  </div>
                )}
                
                {/* Mostrar contador de subtareas completadas si tiene subtareas */}
                {hasSubtasks && (
                  <div className="flex items-center space-x-1">
                    <CheckSquare className="w-3 h-3" />
                    <span>
                      {task.subtasks && task.subtasks.filter(st => st.status === 'completed').length}/{task.subtasks && task.subtasks.length} subtasks
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
                    className={`p-1 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      visibleHistory && visibleHistory.has && visibleHistory.has(task.id) 
                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' 
                        : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
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
                    className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                
                {/* Dropdown del menú contextual */}
                {openMenus.has(task.id) && (
                  <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 min-w-[100px]">
                    {/* Opción de editar tarea */}
                    <button
                      onClick={(e) => {
                        startInlineEditing(task, e); // Iniciar edición inline
                        setOpenMenus(new Set()); // Cerrar menú
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
                      className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
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
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 animate-in fade-in duration-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startCreatingSubtask(task.id);
                }}
                className="w-full flex items-center justify-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-all duration-200 border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                Add Subtask
              </button>
            </div>
          )}
          
          {/* Panel de historial - solo para tareas padre */}
          {!task.parentId && visibleHistory && visibleHistory.has && visibleHistory.has(task.id) && (
            <div className="mt-4 border-t pt-4" data-history-panel>
              <TaskHistory 
                taskId={task.id}
                taskTitle={task.title}
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
  const topLevelTasks = tasks.filter(task => !task.parentId);

  // Mostrar mensaje cuando no hay tareas que mostrar
  if (topLevelTasks.length === 0) {
    return (
      <div className="text-center py-12">
        {/* Icono de estado vacío */}
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <Clock className="w-12 h-12 mx-auto" />
        </div>
        {/* Título del mensaje de estado vacío */}
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No tasks found</h3>
        {/* Descripción contextual basada en si hay tareas o solo están filtradas */}
        <p className="text-gray-500 dark:text-gray-400">
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
      <div className="fixed bottom-4 right-4 z-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 max-w-sm">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {selectedTasks.size} seleccionada{selectedTasks.size !== 1 ? 's' : ''}
            </span>
            <button
              onClick={toggleMultiSelectMode}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={selectAllTasks}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30"
            >
              Todas
            </button>
            <button
              onClick={clearSelection}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30"
            >
              Ninguna
            </button>
          </div>
          <div className="flex gap-1">
            <button
              onClick={openBulkEditModal}
              disabled={selectedTasks.size === 0}
              className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
            >
              <Edit3 className="h-3 w-3" />
              <span>Editar</span>
            </button>
            <button
              onClick={deleteSelectedTasks}
              disabled={selectedTasks.size === 0}
              className="flex-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Eliminar
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
            const taskGroup = groupTasks[0].group!;
            
            // Obtener los datos completos del grupo desde la lista de grupos (incluye taskStats)
            const fullGroup = groups.find(g => g.id === groupId) || taskGroup;
            
            // DEBUG: Log para verificar los datos del grupo
            console.log('🔍 DEBUG Group Data:', {
              groupId,
              groupName: taskGroup.name,
              taskGroupStats: taskGroup.taskStats,
              fullGroupStats: fullGroup.taskStats,
              groupTasksLength: groupTasks.length,
              fullGroup: fullGroup
            });
            
            const progress = calculateGroupProgress(fullGroup);
            const progressBarStyles = getGroupProgressBarStyles(progress);
            const isHistoryVisible = visibleGroupHistory.has(groupId);
            
            // DEBUG: Log para verificar el cálculo de progreso
            console.log('📊 DEBUG Progress Calculation:', {
              groupName: fullGroup.name,
              progress,
              hasTaskStats: !!fullGroup.taskStats,
              taskStatsTotal: fullGroup.taskStats?.total,
              taskStatsCompleted: fullGroup.taskStats?.completed
            });
            
            // Verificar si la barra de progreso debería mostrarse
            const shouldShowProgressBar = fullGroup.taskStats && fullGroup.taskStats.total > 0;
            console.log('🎯 DEBUG Progress Bar Visibility:', {
              groupName: fullGroup.name,
              shouldShowProgressBar,
              taskStatsExists: !!fullGroup.taskStats,
              totalTasks: fullGroup.taskStats?.total || 0
            });
            
            return (
              <div key={groupId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible">
                {/* Encabezado del grupo */}
                <div 
                  className="px-4 py-3 border-b border-gray-200 dark:border-gray-700" 
                  style={{ 
                    backgroundColor: `${fullGroup.color}15`, 
                    borderLeftColor: fullGroup.color, 
                    borderLeftWidth: '4px',
                    ...progressBarStyles
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{fullGroup.name}</h3>
                      </div>
                      {fullGroup.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{fullGroup.description}</p>
                      )}
                      
                      {/* Información de progreso */}
                      {fullGroup.taskStats && fullGroup.taskStats.total > 0 && (
                        <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="text-green-600 dark:text-green-400">
                            {fullGroup.taskStats.completed} completed
                          </span>
                          {/* Número de progreso con el mismo estilo que las tareas */}
                          <span 
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 transition-all duration-500 hover:bg-green-200 dark:hover:bg-green-900/50 hover:scale-105"
                            style={{
                              animation: 'progressFadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                              animationDelay: '0.2s',
                              animationFillMode: 'both'
                            }}
                          >
                            {progress}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Botón de historial del grupo */}
                      <button
                        onClick={() => toggleGroupHistory(groupId)}
                        className={`p-2 rounded-md transition-colors ${
                          isHistoryVisible 
                            ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400' 
                            : 'text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                        }`}
                        title={isHistoryVisible ? "Ocultar historial del grupo" : "Ver historial del grupo"}
                      >
                        {isHistoryVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      
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
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        title="Editar todas las tareas del grupo"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      
                      <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: fullGroup.color }}
                      >
                        {groupTasks.length} {groupTasks.length === 1 ? 'tarea' : 'tareas'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Panel de historial del grupo */}
                {isHistoryVisible && (
                  <div className="border-b border-gray-200 dark:border-gray-700">
                    <GroupHistory 
                      groupId={groupId} 
                      isVisible={true}
                      onClose={() => toggleGroupHistory(groupId)}
                    />
                  </div>
                )}
                
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

// Función de comparación personalizada para React.memo
const arePropsEqual = (prevProps: any, nextProps: any) => {
  // Comparar props primitivas
  const primitiveProps = [
    'statusFilter', 'priorityFilter', 'isGroupedView', 
    'isMultiSelectMode', 'isLoading'
  ];
  
  for (const prop of primitiveProps) {
    if (prevProps[prop] !== nextProps[prop]) {
      console.log(`🔄 TaskList re-render: ${prop} changed`);
      return false;
    }
  }
  
  // Comparar visibleHistory (Set)
  if (prevProps.visibleHistory && prevProps.visibleHistory.size !== undefined && 
      nextProps.visibleHistory && nextProps.visibleHistory.size !== undefined &&
      prevProps.visibleHistory.size !== nextProps.visibleHistory.size) {
    console.log('🔄 TaskList re-render: visibleHistory size changed');
    return false;
  }
  
  // Verificar si los elementos del Set son diferentes
  if (prevProps.visibleHistory && typeof prevProps.visibleHistory[Symbol.iterator] === 'function') {
    for (const item of prevProps.visibleHistory) {
      if (!nextProps.visibleHistory || !nextProps.visibleHistory.has || !nextProps.visibleHistory.has(item)) {
        console.log('🔄 TaskList re-render: visibleHistory content changed');
        return false;
      }
    }
  }
  
  // Comparar arrays de tags y groups
  if (JSON.stringify(prevProps.selectedTags) !== JSON.stringify(nextProps.selectedTags)) {
    console.log('🔄 TaskList re-render: selectedTags changed');
    return false;
  }
  
  if (JSON.stringify(prevProps.selectedGroups) !== JSON.stringify(nextProps.selectedGroups)) {
    console.log('🔄 TaskList re-render: selectedGroups changed');
    return false;
  }
  
  // Comparar tasks - solo re-renderizar si realmente cambiaron
  if (prevProps.tasks.length !== nextProps.tasks.length) {
    console.log('🔄 TaskList re-render: tasks length changed');
    return false;
  }
  
  // Comparación profunda de tasks
  for (let i = 0; i < prevProps.tasks.length; i++) {
    const prevTask = prevProps.tasks[i];
    const nextTask = nextProps.tasks[i];
    
    if (prevTask.id !== nextTask.id || 
        prevTask.title !== nextTask.title ||
        prevTask.completed !== nextTask.completed ||
        prevTask.priority !== nextTask.priority ||
        prevTask.dueDate !== nextTask.dueDate ||
        prevTask.startDate !== nextTask.startDate ||
        prevTask.subtasks?.length !== nextTask.subtasks?.length) {
      console.log('🔄 TaskList re-render: task changed', { 
        prevTask: prevTask.id, 
        nextTask: nextTask.id,
        prevSubtasks: prevTask.subtasks?.length || 0,
        nextSubtasks: nextTask.subtasks?.length || 0
      });
      return false;
    }
    
    // Comparar subtareas si existen
    if (prevTask.subtasks && nextTask.subtasks) {
      for (let j = 0; j < Math.max(prevTask.subtasks.length, nextTask.subtasks.length); j++) {
        const prevSubtask = prevTask.subtasks[j];
        const nextSubtask = nextTask.subtasks[j];
        
        if (!prevSubtask || !nextSubtask || prevSubtask.id !== nextSubtask.id) {
          console.log('🔄 TaskList re-render: subtask changed', { 
            taskId: prevTask.id,
            prevSubtaskId: prevSubtask?.id,
            nextSubtaskId: nextSubtask?.id
          });
          return false;
        }
      }
    }
  }
  
  return true;
};

// Exportar el componente con React.memo para optimización de rendimiento
export default React.memo(TaskList, arePropsEqual);
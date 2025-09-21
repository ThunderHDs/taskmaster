'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Plus, Filter, Tag as TagIcon, Search, Settings, RefreshCw, Calendar as CalendarIcon, Clock, Users, CheckSquare, Edit } from 'lucide-react';
import { isSameDay, isWithinInterval, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import Link from 'next/link';
import TaskList from '@/components/TaskList';
import TaskForm from '@/components/TaskForm';
import BulkTaskForm from '@/components/BulkTaskForm';
import TagManager from '@/components/TagManager';
import GroupManager from '@/components/GroupManager';
import InlineTaskForm from '@/components/InlineTaskForm';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import BulkDeleteModal from '@/components/BulkDeleteModal';
import BulkEditModal from '@/components/BulkEditModal';
import CalendarView from '@/components/CalendarView';
import CalendarHeader from '@/components/CalendarHeader';
import Calendar from '@/components/Calendar';
import { TaskFilters } from '@/components/TaskFilters';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import UndoToast from '@/components/UndoToast';
import { useFilterStore } from '@/stores/useFilterStore';
import { useUIStore } from '@/stores/useUIStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { canHaveSubtasks } from '@/lib/utils';
import { logger } from '@/lib/logger';

// Interfaces
interface Tag {
  id: string;
  name: string;
  color: string;
  _count?: {
    tasks: number;
  };
}

interface TaskGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

interface ConflictData {
  id?: string;
  type: 'OVERLAP' | 'OVERLOAD';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  conflictingTaskId: string;
  conflictingTaskTitle: string;
  suggestions: string[];
}

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  startDate?: string;
  originalDueDate?: string;
  parentId?: string;
  groupId?: string;
  createdAt: string;
  updatedAt: string;
  estimatedHours?: number | null;
  tags: { tag: Tag }[];
  subtasks: Task[];
  parent?: Task;
  group?: TaskGroup;
  conflicts?: ConflictData[];
}

const HomePage: React.FC = () => {
  // State management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states (using UIStore)
  const {
    modals: {
      isTaskFormOpen,
      isTagManagerOpen,
      isGroupManagerOpen,
      editingTask
    },
    openTaskForm,
    closeTaskForm,
    openTagManager,
    closeTagManager,
    openGroupManager,
    closeGroupManager
  } = useUIStore();
  const [parentTask, setParentTask] = useState<Task | null>(null);
  
  // Force re-render state
  const [forceRerender, setForceRerender] = useState(0);

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Bulk delete modal states
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [tasksToDelete, setTasksToDelete] = useState<Task[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [clearSelectionFn, setClearSelectionFn] = useState<(() => void) | null>(null);
  
  // Función memoizada para evitar re-renders innecesarios
  const handleClearSelectionFn = useCallback((fn: () => void) => {
    setClearSelectionFn(() => fn);
  }, []);
  
  // Bulk task creation states
  const [showBulkTaskForm, setShowBulkTaskForm] = useState(false);
  
  // Bulk edit modal states (global)
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditTasks, setBulkEditTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const {
    selectedTags,
    selectedGroups,
    selectedPriorities,
    showCompleted,
    showOverdue,
    dateFilter
  } = useFilterStore();

  // Task store
  const { setTasks: setTasksInStore, setAvailableTags: setTagsInStore, setAvailableGroups: setGroupsInStore } = useTaskStore();

  const [showFilters, setShowFilters] = useState(false);
  // Multi-select mode - usando el store
  const { isMultiSelectMode, setIsMultiSelectMode } = useTaskStore();

  // Clear search query (filters are handled by store)
  const clearAllFilters = () => {
    useFilterStore.getState().clearAllFilters();
    setSearchQuery('');
  };

  // Calendar states
  const [isCalendarMode, setIsCalendarMode] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  
  // Group view states - usando el store
  const { isGroupedView, setIsGroupedView } = useTaskStore();

  // Undo/Redo functionality
  const { 
    addAction, 
    undoFromToast, 
    isUndoing, 
    isRedoing, 
    showToast, 
    hideToast, 
    toastState 
  } = useUndoRedo();



  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Sincronizar tasks con el store de Zustand cuando cambien
  useEffect(() => {
    console.log('🔄 SYNC: Updating Zustand store with', tasks.length, 'tasks');
    setTasksInStore(tasks);
  }, [tasks, setTasksInStore]);

  // Sincronizar tags con el store de Zustand cuando cambien
  useEffect(() => {
    setTagsInStore(tags);
  }, [tags, setTagsInStore]);

  // Sincronizar groups con el store de Zustand cuando cambien
  useEffect(() => {
    setGroupsInStore(groups);
  }, [groups, setGroupsInStore]);

  // Load tasks, tags and groups from API
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [tasksResponse, tagsResponse, groupsResponse] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/tags'),
        fetch('/api/groups')
      ]);
      
      // Parse JSON responses with error handling
      let tasksData = [];
      let tagsData = [];
      let groupsData = [];
      
      if (tasksResponse.ok) {
        try {
          const text = await tasksResponse.text();
          tasksData = text ? JSON.parse(text) : [];
        } catch (parseError) {
          logger.error('Error parsing tasks response:', parseError);
          tasksData = [];
        }
      } else {
        logger.error('Tasks API failed:', tasksResponse.status, tasksResponse.statusText);
      }
      
      if (tagsResponse.ok) {
        try {
          const text = await tagsResponse.text();
          tagsData = text ? JSON.parse(text) : [];
        } catch (parseError) {
          logger.error('Error parsing tags response:', parseError);
          tagsData = [];
        }
      } else {
        logger.error('Tags API failed:', tagsResponse.status, tagsResponse.statusText);
      }
      
      if (groupsResponse.ok) {
        try {
          const text = await groupsResponse.text();
          groupsData = text ? JSON.parse(text) : [];
        } catch (parseError) {
          logger.error('Error parsing groups response:', parseError);
          groupsData = [];
        }
      } else {
        logger.error('Groups API failed:', groupsResponse.status, groupsResponse.statusText);
      }
      
      setTasks(tasksData);
      setTags(tagsData);
      setGroups(groupsData);
      
      // Removed synchronous store updates - now handled by useEffect
    } catch (error) {
      logger.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Bulk edit function
  const handleBulkEdit = async (taskIds: string[], updates: any) => {
    try {
      logger.debug('handleBulkEdit called with:', { taskIds, updates });
      
      const requestBody = {
        taskIds,
        updates
      };

      
      const response = await fetch('/api/tasks/bulk', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar las tareas');
      }

      const result = await response.json();

      
      // Actualizar las tareas en el estado local
      setTasks(prevTasks => {
        const updatedTasksMap = new Map(result.tasks.map((task: Task) => [task.id, task]));
        
        const updateTaskRecursively = (task: Task): Task => {
          if (updatedTasksMap.has(task.id)) {
            const updatedTask = updatedTasksMap.get(task.id)!;
            // Preservar las subtareas existentes si no vienen en la actualización
            return {
              ...updatedTask,
              subtasks: updatedTask.subtasks && updatedTask.subtasks.length > 0 
                ? updatedTask.subtasks.map(updateTaskRecursively)
                : task.subtasks ? task.subtasks.map(updateTaskRecursively) : []
            };
          }
          
          if (task.subtasks && task.subtasks.length > 0) {
            return {
              ...task,
              subtasks: task.subtasks.map(updateTaskRecursively)
            };
          }
          
          return task;
        };
        
        const newTasks = prevTasks.map(updateTaskRecursively);

        return newTasks;
      });
      

    } catch (error) {
      logger.error('Error updating tasks:', error);
      setError(error instanceof Error ? error.message : 'Error al actualizar las tareas');
      throw error;
    }
  };

  // Bulk task creation function
  const handleBulkTaskCreate = async (bulkData: {
    titles: string[];
    description?: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    startDate?: string;
    dueDate?: string;
    tagIds: string[];
    groupId?: string;
    subtasks: string[];
  }) => {
    try {
      const response = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bulkData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear las tareas');
      }

      const result = await response.json();
      
      // Agregar las nuevas tareas al estado
      const updatedTasks = [...tasks, ...result.tasks];
      setTasks(updatedTasks);
      // Removed setTasksInStore - now handled by useEffect
      
      // Cerrar el formulario
      setShowBulkTaskForm(false);
      
      logger.debug(result.message);
      return result;
    } catch (error) {
      logger.error('Error creating bulk tasks:', error);
      setError(error instanceof Error ? error.message : 'Error al crear las tareas');
      throw error;
    }
  };

  // Global bulk edit handlers
  const handleGlobalBulkEdit = (selectedTasksArray: Task[]) => {
    // Extraer los IDs de las tareas seleccionadas
    const taskIds = selectedTasksArray.map(task => task.id);
    setSelectedTasks(taskIds);
    setBulkEditTasks(selectedTasksArray);
    setShowBulkEditModal(true);
  };

  const handleBulkEditSave = async (data: {
    commonUpdates: any;
    individualUpdates: { [taskId: string]: any };
    subtaskUpdates: { [subtaskId: string]: any };
  }) => {
    try {
      logger.debug('🔧 handleBulkEditSave - Datos recibidos:', data);
      
      // Preparar los datos en el formato esperado por la API
      const updates = {
        // Campos comunes (se aplican a todas las tareas si no hay override individual)
        ...data.commonUpdates,
        // Actualizaciones específicas por tarea
        individualUpdates: data.individualUpdates || {},
        // Actualizaciones de subtareas por ID de subtarea
        subtaskUpdates: data.subtaskUpdates || {}
      };
      
      logger.debug('🔧 handleBulkEditSave - Updates preparados:', updates);
      
      // Usar selectedTasks en lugar de bulkEditTasks
      await handleBulkEdit(selectedTasks, updates);
      
      // Cerrar el modal y limpiar selección
      setShowBulkEditModal(false);
      setSelectedTasks([]);
    } catch (error) {
      logger.error('Error en edición masiva:', error);
      throw error;
    }
  };

  const handleBulkEditClose = () => {
    setShowBulkEditModal(false);
    setBulkEditTasks([]);
  };

  // Estado para evitar múltiples actualizaciones simultáneas
  const [processingTasks, setProcessingTasks] = useState<Set<string>>(new Set());

  // Función para completar todas las subtareas cuando se completa la tarea padre
  const completeAllSubtasks = useCallback(async (parentTaskId: string) => {
    if (processingTasks.has(parentTaskId)) {
      logger.debug(`Parent task ${parentTaskId} is already being processed, skipping subtask completion`);
      return;
    }

    try {
      // Función auxiliar para buscar tareas por ID
      const findTaskById = (tasks: Task[], id: string): Task | null => {
        for (const task of tasks) {
          if (task.id === id) return task;
          if (task.subtasks && task.subtasks.length > 0) {
            const found = findTaskById(task.subtasks, id);
            if (found) return found;
          }
        }
        return null;
      };

      // Obtener el estado actual de las tareas usando useRef para evitar setState durante renderizado
      const parentTask = findTaskById(tasks, parentTaskId);
      
      if (!parentTask) {
        logger.debug(`Parent task ${parentTaskId} not found`);
        return;
      }

      if (!parentTask.subtasks || parentTask.subtasks.length === 0) {
        logger.debug(`Parent task ${parentTaskId} has no subtasks to complete`);
        return;
      }

      // Encontrar subtareas incompletas
      const incompleteSubtasks = parentTask.subtasks.filter(subtask => !subtask.completed);
      
      if (incompleteSubtasks.length === 0) {
        logger.debug(`All subtasks of parent task ${parentTaskId} are already completed`);
        return;
      }

      logger.debug(`Completing ${incompleteSubtasks.length} subtasks for parent task ${parentTaskId}`);
      
      setProcessingTasks(prev => new Set(prev).add(parentTaskId));
      
      try {
        // Completar todas las subtareas incompletas
        const completionPromises = incompleteSubtasks.map(async (subtask) => {
          const response = await fetch(`/api/tasks/${subtask.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed: true }),
          });

          if (!response.ok) {
            throw new Error(`Failed to complete subtask ${subtask.id}: ${response.status}`);
          }

          return await response.json();
        });

        const updatedSubtasks = await Promise.all(completionPromises);
        logger.debug(`Successfully completed ${updatedSubtasks.length} subtasks for parent task ${parentTaskId}`);
        
        // Actualizar el estado local
        setTasks(currentTasks => {
          const updateTaskInTree = (tasks: Task[]): Task[] => {
            return tasks.map(t => {
              if (t.id === parentTaskId && t.subtasks) {
                return {
                  ...t,
                  subtasks: t.subtasks.map(subtask => {
                    const updatedSubtask = updatedSubtasks.find(us => us.id === subtask.id);
                    if (updatedSubtask) {
                      return {
                        ...subtask,
                        completed: true,
                        dueDate: updatedSubtask.dueDate,
                        originalDueDate: updatedSubtask.originalDueDate
                      };
                    }
                    return subtask;
                  })
                };
              }
              if (t.subtasks && t.subtasks.length > 0) {
                return {
                  ...t,
                  subtasks: updateTaskInTree(t.subtasks)
                };
              }
              return t;
            });
          };
          const updatedTasks = updateTaskInTree(currentTasks);
          // Removed setTasksInStore - now handled by useEffect
          return updatedTasks;
        });
        
      } catch (error) {
        logger.error(`Error completing subtasks for parent task ${parentTaskId}:`, error);
      } finally {
        setProcessingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(parentTaskId);
          return newSet;
        });
      }
    } catch (error) {
      logger.error(`Error in completeAllSubtasks for ${parentTaskId}:`, error);
    }
  }, [tasks, processingTasks]);

  // Función para verificar y completar tarea padre si todas sus subtareas están completadas
  const checkAndCompleteParentTask = useCallback(async (parentTaskId: string, updatedTasks?: Task[]) => {
    console.log(`🔥 ENTERING checkAndCompleteParentTask with parentTaskId: ${parentTaskId}`);
    
    if (processingTasks.has(parentTaskId)) {
      console.log(`⏸️ Task ${parentTaskId} is already being processed, skipping`);
      logger.debug(`Parent task ${parentTaskId} is already being processed, skipping check`);
      return;
    }

    try {
      // Función auxiliar para buscar tareas por ID
      const findTaskById = (tasks: Task[], id: string): Task | null => {
        for (const task of tasks) {
          if (task.id === id) return task;
          if (task.subtasks && task.subtasks.length > 0) {
            const found = findTaskById(task.subtasks, id);
            if (found) return found;
          }
        }
        return null;
      };

      // Usar las tareas actualizadas si se proporcionan, sino usar el estado actual
      const tasksToCheck = updatedTasks || tasks;
      console.log(`🔍 Using ${updatedTasks ? 'updated' : 'current'} tasks for checking parent task ${parentTaskId}`);
      
      // Obtener el estado actual de las tareas directamente
      const parentTask = findTaskById(tasksToCheck, parentTaskId);
      
      if (!parentTask) {
        logger.debug(`Parent task ${parentTaskId} not found`);
        return;
      }

      if (parentTask.completed) {
        logger.debug(`Parent task ${parentTaskId} is already completed`);
        return;
      }

      // Verificar si todas las subtareas están completadas
      const hasSubtasks = parentTask.subtasks && parentTask.subtasks.length > 0;
      const allSubtasksCompleted = hasSubtasks && 
        parentTask.subtasks.every(subtask => subtask.completed);
      
      console.log(`🔍 Parent task ${parentTaskId} check:`, {
        hasSubtasks,
        subtasksCount: parentTask.subtasks?.length || 0,
        completedSubtasks: parentTask.subtasks?.filter(s => s.completed).length || 0,
        allSubtasksCompleted,
        subtasksDetails: parentTask.subtasks?.map(s => ({ id: s.id, title: s.title, completed: s.completed }))
      });

      console.log(`🚨 DEBUG: allSubtasksCompleted = ${allSubtasksCompleted}, will ${allSubtasksCompleted ? 'PROCEED' : 'SKIP'} with API call`);

      if (allSubtasksCompleted) {
        console.log(`🚀 PROCEEDING with auto-completion for task ${parentTaskId}`);
        const taskLevel = parentTask.parentId ? (parentTask.parent?.parentId ? 'level 2' : 'level 1') : 'level 0';
        console.log(`✅ All subtasks completed for ${taskLevel} parent task ${parentTaskId}, auto-completing...`);
        
        setProcessingTasks(prev => new Set(prev).add(parentTaskId));
        
        try {
          const response = await fetch(`/api/tasks/${parentTaskId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed: true }),
          });

          if (response.ok) {
            const updatedTask = await response.json();
            logger.debug(`Parent task ${parentTaskId} auto-completed successfully:`, updatedTask);
            
            // Actualizar el estado
            setTasks(currentTasks => {
              const updateTaskInTree = (tasks: Task[]): Task[] => {
                return tasks.map(t => {
                  if (t.id === parentTaskId) {
                    return {
                      ...t,
                      completed: true,
                      dueDate: updatedTask.dueDate,
                      originalDueDate: updatedTask.originalDueDate
                    };
                  }
                  if (t.subtasks && t.subtasks.length > 0) {
                    return {
                      ...t,
                      subtasks: updateTaskInTree(t.subtasks)
                    };
                  }
                  return t;
                });
              };
              const updatedTasks = updateTaskInTree(currentTasks);
              
              // 🔥 FIXED: Mover la sincronización del store a un useEffect para evitar actualizaciones síncronas
              // La sincronización se hará automáticamente por el useEffect que observa cambios en tasks
              
              return updatedTasks;
            });
            
            // Continuar el efecto dominó si esta tarea también tiene padre
            if (parentTask.parentId) {
              logger.debug(`Continuing domino effect: checking grandparent task ${parentTask.parentId}`);
              setTimeout(() => {
                checkAndCompleteParentTask(parentTask.parentId!);
              }, 150);
            }
          } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            logger.error(`Failed to auto-complete parent task ${parentTaskId}:`, errorData);
          }
        } catch (error) {
          logger.error(`Error auto-completing parent task ${parentTaskId}:`, error);
        } finally {
          setProcessingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(parentTaskId);
            return newSet;
          });
        }
      } else {
        logger.debug(`Not all subtasks completed for parent task ${parentTaskId}, skipping auto-complete`);
      }
    } catch (error) {
      logger.error(`Error in checkAndCompleteParentTask for ${parentTaskId}:`, error);
    }
  }, [tasks, processingTasks]);

  // Función auxiliar para actualizar subtareas recursivamente (solo actualiza estado, no hace peticiones HTTP)
  const updateTaskRecursively = (task: Task, taskId: string, updatedTask: any): { updatedTask: Task, tasksToAutoComplete: string[] } => {
    // Validaciones de entrada
    if (!task || !taskId || !updatedTask) {
      logger.warn('Invalid parameters in updateTaskRecursively:', { task: !!task, taskId, updatedTask: !!updatedTask });
      return { updatedTask: task, tasksToAutoComplete: [] };
    }

    if (task.id === taskId) {
      logger.debug(`Updating task ${taskId} with new data:`, updatedTask);
      return { 
        updatedTask: { 
          ...task, 
          completed: updatedTask.completed,
          dueDate: updatedTask.dueDate,
          originalDueDate: updatedTask.originalDueDate
        },
        tasksToAutoComplete: []
      };
    }
    
    if (task.subtasks && task.subtasks.length > 0) {
      let allTasksToAutoComplete: string[] = [];
      const updatedSubtasks = task.subtasks.map(subtask => {
        const result = updateTaskRecursively(subtask, taskId, updatedTask);
        allTasksToAutoComplete = [...allTasksToAutoComplete, ...result.tasksToAutoComplete];
        return result.updatedTask;
      });
      
      // Verificar si todas las subtareas están completadas para auto-completar la tarea padre
      const allSubtasksCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(subtask => subtask.completed);
      const shouldAutoComplete = allSubtasksCompleted && !task.completed && task.id !== taskId;
      
      console.log(`🔍 Auto-complete check for task ${task.id}:`, {
        title: task.title,
        hasSubtasks: updatedSubtasks.length > 0,
        subtasksCount: updatedSubtasks.length,
        completedSubtasks: updatedSubtasks.filter(s => s.completed).length,
        allSubtasksCompleted,
        taskAlreadyCompleted: task.completed,
        isTargetTask: task.id === taskId,
        shouldAutoComplete,
        // Detalles de cada condición
        condition1_allSubtasksCompleted: allSubtasksCompleted,
        condition2_taskNotCompleted: !task.completed,
        condition3_notTargetTask: task.id !== taskId,
        subtaskDetails: updatedSubtasks.map(s => ({ id: s.id, title: s.title, completed: s.completed }))
      });
      
      if (shouldAutoComplete) {
        console.log(`✅ Marking task ${task.id} (${task.title}) for auto-completion because all subtasks are completed`);
        allTasksToAutoComplete.push(task.id);
      }
      
      return {
        updatedTask: {
          ...task,
          subtasks: updatedSubtasks
        },
        tasksToAutoComplete: allTasksToAutoComplete
      };
    }
    
    return { updatedTask: task, tasksToAutoComplete: [] };
  };

  // Task handlers
  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    // Validar que taskId sea válido
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      logger.error('Invalid taskId provided to handleTaskToggle:', taskId);
      return;
    }
    
    // Evitar múltiples actualizaciones simultáneas de la misma tarea
    if (processingTasks.has(taskId) || isUndoing || isRedoing) {
      return;
    }

    setProcessingTasks(prev => new Set(prev).add(taskId));

    // Función auxiliar para buscar tarea
    const findTask = (tasks: Task[]): Task | null => {
      for (const task of tasks) {
        if (task.id && taskId && String(task.id).trim() === String(taskId).trim()) {
          return task;
        }
        
        if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
          const found = findTask(task.subtasks);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };
    
    const previousTaskState = findTask(tasks);

    if (!previousTaskState) {
      logger.warn(`Task ${taskId} not found in local state, attempting to fetch from database...`);
      
      try {
        // Intentar obtener la tarea desde la API
        const response = await fetch(`/api/tasks/${taskId}`);
        if (response.ok) {
          const fetchedTask = await response.json();
          
          // Actualizar el estado local con la tarea obtenida
          setTasks(prevTasks => {
            // Verificar si la tarea ya existe para evitar duplicados
            const exists = prevTasks.some(t => t.id === taskId);
            if (!exists) {
              return [...prevTasks, fetchedTask];
            }
            return prevTasks;
          });
          
          previousTaskState = fetchedTask;
        } else {
          logger.error(`Task ${taskId} not found in database either (${response.status})`);
          setProcessingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          return;
        }
      } catch (error) {
        logger.error(`Error fetching task ${taskId}:`, error);
        setProcessingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        return;
      }
    }

    try {
      // Validar que taskId no esté vacío
      if (!taskId || taskId.trim() === '') {
        throw new Error('Invalid task ID provided');
      }

      // Validar que completed sea un booleano
      if (typeof completed !== 'boolean') {
        throw new Error('Invalid completed value provided');
      }

      logger.debug(`Attempting to toggle task ${taskId} to ${completed ? 'completed' : 'pending'}`);

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed }),
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to update task';
        try {
          const responseText = await response.text();
          let errorData;
          
          if (responseText) {
            try {
              errorData = JSON.parse(responseText);
            } catch {
              errorData = { message: responseText };
            }
          } else {
            errorData = { message: 'Empty response from server' };
          }
          
          logger.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            errorData: errorData
          });
          
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          logger.error('Failed to parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const updatedTask = await response.json();

      // Preparar datos para el sistema undo/redo ANTES de procesar subtareas
      let subtasksToComplete: Task[] = [];
      if (completed && previousTaskState.subtasks && previousTaskState.subtasks.length > 0) {
        subtasksToComplete = previousTaskState.subtasks.filter(subtask => !subtask.completed);
      }

      // Registrar la acción en el historial de undo/redo
      if (!isUndoing && !isRedoing) {
        const hasSubtasksToComplete = subtasksToComplete.length > 0;
        const actionDescription = hasSubtasksToComplete 
          ? `${completed ? 'Completar' : 'Descompletar'} tarea y ${subtasksToComplete.length} subtarea(s): ${previousTaskState.title}`
          : `${completed ? 'Completar' : 'Descompletar'} tarea: ${previousTaskState.title}`;

        addAction({
          type: 'TASK_TOGGLE',
          description: actionDescription,
          data: {
            taskId,
            previousState: { 
              completed: previousTaskState.completed,
              dueDate: previousTaskState.dueDate,
              originalDueDate: previousTaskState.originalDueDate
            },
            newState: { completed },
            subtasksToRevert: subtasksToComplete.map(subtask => ({
              id: subtask.id,
              completed: subtask.completed,
              dueDate: subtask.dueDate,
              originalDueDate: subtask.originalDueDate
            }))
          },
          undo: async () => {
            // Deshacer la tarea padre Y todas las subtareas que se completaron automáticamente
            try {
              // 1. Primero deshacer las subtareas si las había
              if (hasSubtasksToComplete) {
                const subtaskPromises = subtasksToComplete.map(async (subtask) => {
                  const response = await fetch(`/api/tasks/${subtask.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                      completed: subtask.completed,
                      dueDate: subtask.dueDate,
                      originalDueDate: subtask.originalDueDate
                    }),
                  });
                  
                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }
                  
                  return await response.json();
                });
                
                await Promise.all(subtaskPromises);
              }

              // 2. Luego deshacer la tarea padre
              const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  completed: previousTaskState.completed,
                  dueDate: previousTaskState.dueDate,
                  originalDueDate: previousTaskState.originalDueDate
                }),
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const updatedTask = await response.json();
              
              // 3. Actualizar el estado local
              setTasks(prevTasks => {
                return prevTasks.map(task => {
                  const result = updateTaskRecursively(task, taskId, updatedTask);
                  return result.updatedTask;
                });
              });
            } catch (error) {
              logger.error('Error in undo operation:', error);
              throw error;
            }
          },
          redo: async () => {
            // Rehacer la tarea padre Y completar automáticamente las subtareas
            try {
              // 1. Primero rehacer la tarea padre
              const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ completed }),
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              
              const updatedTask = await response.json();
              
              // 2. Si se está completando y había subtareas, completarlas también
              if (completed && hasSubtasksToComplete) {
                const subtaskPromises = subtasksToComplete.map(async (subtask) => {
                  const response = await fetch(`/api/tasks/${subtask.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ completed: true }),
                  });
                  
                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }
                  
                  return await response.json();
                });
                
                await Promise.all(subtaskPromises);
              }
              
              // 3. Actualizar el estado local
              setTasks(prevTasks => {
                return prevTasks.map(task => {
                  const result = updateTaskRecursively(task, taskId, updatedTask);
                  return result.updatedTask;
                });
              });
            } catch (error) {
              logger.error('Error in redo operation:', error);
              throw error;
            }
          }
        });
      }
      
      // Actualizar el estado y obtener las tareas que necesitan auto-completarse
      let tasksToAutoComplete: string[] = [];
      let updatedTasksForState: Task[] = [];
      
      // 🔥 FIRST: Procesar las tareas y capturar el array ANTES de setTasks
      setTasks(prevTasks => {
        updatedTasksForState = prevTasks.map(task => {
          const result = updateTaskRecursively(task, taskId, updatedTask);
          tasksToAutoComplete = [...tasksToAutoComplete, ...result.tasksToAutoComplete];
          return result.updatedTask;
        });
        
        console.log('🔥 CAPTURED tasksToAutoComplete BEFORE setState:', tasksToAutoComplete);
        
        // 🔥 CRITICAL: Procesar auto-completados INMEDIATAMENTE después de capturar
        if (tasksToAutoComplete.length > 0) {
          console.log(`🚀 AUTOCOMPLETION: Found ${tasksToAutoComplete.length} tasks to auto-complete:`, tasksToAutoComplete);
          
          // Usar setTimeout para asegurar que el estado se actualice primero
          setTimeout(async () => {
            try {
              // Procesar tareas padre directamente de forma secuencial
              const uniqueTasksToComplete = [...new Set(tasksToAutoComplete)].filter(taskId => !processingTasks.has(taskId));
              
              console.log(`🚀 AUTOCOMPLETION: After filtering, processing ${uniqueTasksToComplete.length} unique tasks:`, uniqueTasksToComplete);
              
              if (uniqueTasksToComplete.length > 0) {
                // Procesar cada tarea padre de forma secuencial
                for (const parentTaskId of uniqueTasksToComplete) {
                  try {
                    console.log(`🚀 AUTOCOMPLETION: Starting auto-completion for parent task ${parentTaskId}`);
                    await checkAndCompleteParentTask(parentTaskId, updatedTasksForState);
                    // Pequeña pausa entre procesamiento
                    await new Promise(resolve => setTimeout(resolve, 100));
                  } catch (error) {
                    console.error(`Error processing parent task ${parentTaskId}:`, error);
                  }
                }
              }
            } catch (error) {
              console.error('Error in sequential auto-completion:', error);
            }
          }, 100);
        } else {
          console.log(`🚀 AUTOCOMPLETION: No tasks to auto-complete for taskId ${taskId}`);
        }
        
        // 🔥 CRITICAL: Sincronizar con el store de Zustand para que TaskListContainer vea los cambios
        // Removed setTasksInStore - now handled by useEffect
        
        return updatedTasksForState;
      });
    } catch (error) {
      logger.error('Error in handleTaskToggle:', {
        taskId,
        completed,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Re-lanzar el error solo si es crítico
      if (error instanceof Error && error.message.includes('Invalid')) {
        throw error;
      }
    } finally {
      // Limpiar el estado de procesamiento
      setProcessingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  // Función auxiliar para actualizar tareas recursivamente (para handleTaskUpdate)
  const updateTaskDataRecursively = (task: Task, taskId: string, updatedTask: any): Task => {
    if (task.id === taskId) {
      return { ...task, ...updatedTask };
    }
    
    if (task.subtasks && task.subtasks.length > 0) {
      return {
        ...task,
        subtasks: task.subtasks.map(subtask => 
          updateTaskDataRecursively(subtask, taskId, updatedTask)
        )
      };
    }
    
    return task;
  };

  const handleTaskUpdate = async (taskId: string, taskData: Partial<Task>) => {
    logger.debug('🔥 HomePage - handleTaskUpdate called', { taskId, taskData });
    try {
      logger.debug('📡 HomePage - Making API call to update task...');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update task' }));
        throw new Error(errorData.message || 'Failed to update task');
      }

      const updatedTask = await response.json();
      
      const updatedTasks = tasks.map(task => updateTaskDataRecursively(task, taskId, updatedTask));
      setTasks(updatedTasks);
      
      // Update Zustand store to sync with TaskListContainer
    } catch (error) {
      logger.error('Error updating task:', error);
      throw error;
    }
  };

  const handleTaskStateUpdate = (taskId: string, updatedTask: Task) => {
    setTasks(prevTasks => 
      prevTasks.map(task => updateTaskDataRecursively(task, taskId, updatedTask))
    );
  };

  const handleTaskSubmit = async (taskData: Partial<Task> & { tagIds: string[]; groupId?: string; copiedSubtasks?: Task[] }) => {
    
    try {
      const { tagIds, groupId, copiedSubtasks, ...taskFields } = taskData;
      
      const payload = {
        ...taskFields,
        tagIds: tagIds || [],
        groupId: groupId || null
      };

      if (editingTask) {
        // Update existing task
        const response = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to update task');
        }

        const updatedTask = await response.json();
        
        // ✅ Actualización inmediata del estado sin flushSync
        const updatedTasks = tasks.map(task => {
          if (task.id === editingTask.id) {
            return updatedTask;
          }
          
          if (task.subtasks && task.subtasks.length > 0) {
            return {
              ...task,
              subtasks: task.subtasks.map(subtask => 
                subtask.id === editingTask.id ? updatedTask : subtask
              )
            };
          }
          
          return task;
        });
        
        setTasks(updatedTasks);
        // Removed setTasksInStore - now handled by useEffect
      } else {
        // Create new task
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to create task');
        }

        const newTask = await response.json();
        
        // Crear subtareas copiadas si existen
        if (copiedSubtasks && copiedSubtasks.length > 0) {
          const createdSubtasks = [];
          
          for (const subtask of copiedSubtasks) {
            const subtaskPayload = {
               title: subtask.title,
               description: subtask.description,
               priority: subtask.priority,
               startDate: subtask.startDate,
               dueDate: subtask.dueDate,
               estimatedHours: subtask.estimatedHours,
               parentId: newTask.id,
               tagIds: subtask.tags?.map(t => t.tag.id) || [],
               completed: false // Las subtareas copiadas empiezan como no completadas
             };
            
            const subtaskResponse = await fetch('/api/tasks', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(subtaskPayload),
            });
            
            if (subtaskResponse.ok) {
              const createdSubtask = await subtaskResponse.json();
              createdSubtasks.push(createdSubtask);
            }
          }
          
          // Actualizar la tarea con las subtareas creadas
          newTask.subtasks = createdSubtasks;
        }
        
        if (parentTask) {
          // Add as subtask
          // ✅ Actualización inmediata del estado sin flushSync
          const updatedTasks = tasks.map(task => 
            task.id === parentTask.id 
              ? { ...task, subtasks: [...(task.subtasks || []), newTask] }
              : task
          );
          setTasks(updatedTasks);
          // Removed setTasksInStore - now handled by useEffect
        } else {
          // Add as main task
          // ✅ Actualización inmediata del estado sin flushSync
          const updatedTasks = [newTask, ...tasks];
          setTasks(updatedTasks);
          // Removed setTasksInStore - now handled by useEffect
        }
      }

      // Close form and reset states
      closeTaskForm();
      // editingTask is now managed by UIStore
      setParentTask(null);
    } catch (error) {
      logger.error('Error submitting task:', error);
    }
  };

  const handleTaskEdit = (task: Task) => {
    openTaskForm(task);
  };

  const handleTaskDelete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId) || 
                 tasks.flatMap(t => t.subtasks || []).find(st => st.id === taskId);
    
    if (task) {
      setTaskToDelete(task);
      setShowDeleteModal(true);
    }
  };

  const confirmTaskDelete = async () => {
    if (!taskToDelete) return;

    try {
      setDeleteLoading(true);
      
      const response = await fetch(`/api/tasks/${taskToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      // Remove task from state
      logger.debug('🔍 Estado antes de eliminar:', tasks.length, 'tareas');
      logger.debug('🔍 Eliminando tarea con ID:', taskToDelete.id);
      logger.debug('🔍 Tarea a eliminar:', taskToDelete);
      
      setTasks(prevTasks => {
        logger.debug('🔍 Estado previo en setTasks:', prevTasks.length, 'tareas');
        
        const filteredTasks = prevTasks.filter(task => task.id !== taskToDelete.id);
        logger.debug('🔍 Después de filtrar tareas principales:', filteredTasks.length, 'tareas');
        
        // Función recursiva para eliminar subtareas anidadas
        const removeTaskRecursively = (tasks: Task[], targetId: string): Task[] => {
          return tasks
            .filter(task => task.id !== targetId)
            .map(task => ({
              ...task,
              subtasks: removeTaskRecursively(task.subtasks || [], targetId)
            }));
        };
        
        const updatedTasks = removeTaskRecursively(filteredTasks, taskToDelete.id);
        
        logger.debug('🔍 Estado final después de eliminar subtareas:', updatedTasks.length, 'tareas');
        logger.debug('🔍 Tareas actualizadas:', updatedTasks.map(t => ({ id: t.id, title: t.title, subtasks: t.subtasks?.length || 0 })));
        
        // Verificar si la tarea eliminada realmente se removió
        const taskStillExists = updatedTasks.some(t => t.id === taskToDelete.id);
        const subtaskStillExists = updatedTasks.some(t => 
          t.subtasks && t.subtasks.some(st => st.id === taskToDelete.id)
        );
        logger.debug('🔍 ¿Tarea principal aún existe?:', taskStillExists);
        logger.debug('🔍 ¿Subtarea aún existe?:', subtaskStillExists);
        
        return updatedTasks;
      });
      
      // Forzar re-renderizado completo
      setForceRerender(prev => prev + 1);

      setShowDeleteModal(false);
      setTaskToDelete(null);
    } catch (error) {
      logger.error('Error deleting task:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelTaskDelete = () => {
    setShowDeleteModal(false);
    setTaskToDelete(null);
  };

  // Bulk delete functions
  const handleBulkDelete = (taskIds: string[]) => {
    const tasksToDelete = taskIds.map(id => {
      return tasks.find(t => t.id === id) || 
             tasks.flatMap(t => t.subtasks || []).find(st => st.id === id);
    }).filter(Boolean) as Task[];
    
    if (tasksToDelete.length > 0) {
      setTasksToDelete(tasksToDelete);
      setShowBulkDeleteModal(true);
    }
  };

  const confirmBulkDelete = async () => {
    if (tasksToDelete.length === 0) return;

    try {
      setBulkDeleteLoading(true);
      
      // Delete all tasks in parallel
      const deletePromises = tasksToDelete.map(async (task) => {
        try {
          const response = await fetch(`/api/tasks/${task.id}`, {
            method: 'DELETE',
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`Failed to delete task "${task.title}": ${errorData.error || 'Unknown error'}`);
          }
          
          return { success: true, taskId: task.id, task };
        } catch (error) {
          logger.error(`Error deleting task ${task.id}:`, error);
          return { success: false, taskId: task.id, task, error: error.message };
        }
      });

      const results = await Promise.all(deletePromises);
      
      // Separate successful and failed deletions
      const successfulDeletions = results.filter(result => result.success);
      const failedDeletions = results.filter(result => !result.success);
      
      // Remove successfully deleted tasks from state
      if (successfulDeletions.length > 0) {
        const successfulTaskIds = new Set(successfulDeletions.map(result => result.taskId));
        setTasks(prevTasks => {
          return prevTasks
            .filter(task => !successfulTaskIds.has(task.id))
            .map(task => ({
              ...task,
              subtasks: (task.subtasks || []).filter(subtask => !successfulTaskIds.has(subtask.id))
            }));
        });
      }
      
      // Handle errors if any
      if (failedDeletions.length > 0) {
        const errorMessages = failedDeletions.map(result => 
          `• ${result.task.title}: ${result.error}`
        ).join('\n');
        
        setError(`Failed to delete ${failedDeletions.length} task(s):\n${errorMessages}`);
        
        // If some deletions were successful, show a partial success message
        if (successfulDeletions.length > 0) {
          logger.debug(`Successfully deleted ${successfulDeletions.length} tasks, failed to delete ${failedDeletions.length} tasks`);
        }
      } else {
        // All deletions were successful
        logger.debug(`Successfully deleted ${successfulDeletions.length} tasks`);
      }

      setShowBulkDeleteModal(false);
      setTasksToDelete([]);
      // La limpieza de selección se maneja desde el modal después de la eliminación
    } catch (error) {
      logger.error('Error in bulk delete operation:', error);
      setError(`Error during bulk delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const cancelBulkDelete = () => {
    setShowBulkDeleteModal(false);
    setTasksToDelete([]);
    // Limpiar la selección múltiple
    if (clearSelectionFn) {
      clearSelectionFn();
    }
  };

  const handleSubtaskCreate = (parentId: string) => {
    const parent = tasks.find(t => t.id === parentId);
    if (parent) {
      setParentTask(parent);
      openTaskForm();
    }
  };

  const handleInlineSubtaskCreate = async (parentId: string, subtaskData: {
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    tagIds: string[];
  }) => {
    try {
      // Encontrar la tarea padre para validar el nivel de profundidad
      const findParentTask = (taskList: Task[], id: string): Task | null => {
        for (const task of taskList) {
          if (task.id === id) return task;
          if (task.subtasks) {
            const found = findParentTask(task.subtasks, id);
            if (found) return found;
          }
        }
        return null;
      };

      const parentTask = findParentTask(tasks, parentId);
      if (!parentTask) {
        throw new Error('Parent task not found');
      }

      // Validar que la tarea padre puede tener subtareas (no está en el nivel máximo)
      if (!canHaveSubtasks(parentTask, tasks)) {
        throw new Error('Maximum subtask depth reached. Cannot create subtasks beyond 2 levels.');
      }
      
      // Validar que subtaskData exista y usar valores por defecto para propiedades faltantes
      if (!subtaskData) {
        logger.error('❌ Subtask data is missing - subtaskData is falsy:', subtaskData);
        throw new Error('Subtask data is missing');
      }
      
      // Validar campos requeridos específicos
      if (!subtaskData.title || subtaskData.title.trim() === '') {
        logger.error('❌ Subtask title is missing or empty:', subtaskData.title);
        throw new Error('Subtask title is required');
      }

      const payload = {
        ...subtaskData,
        priority: (subtaskData.priority || 'MEDIUM').toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH',
        parentId,
        tagIds: subtaskData.tagIds || []
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create subtask');
      }

      const newSubtask = await response.json();
      
      // ✅ ACTUALIZAR EL ESTADO INMEDIATAMENTE para cada subtarea
      // Función recursiva para actualizar subtareas anidadas
      const updateTaskRecursively = (task: Task): Task => {
        if (task.id === parentId) {
          const updatedTask = { ...task, subtasks: [...(task.subtasks || []), newSubtask] };
          
          // Lógica automática: si se agrega una subtarea a una tarea completada, descompletarla
          if (task.completed) {
            handleTaskToggle(parentId, false);
          }
          
          return updatedTask;
        }
        
        // Si la tarea tiene subtareas, buscar recursivamente
        if (task.subtasks && task.subtasks.length > 0) {
          const updatedSubtasks = task.subtasks.map(updateTaskRecursively);
          // Solo actualizar si alguna subtarea cambió
          if (updatedSubtasks.some((subtask, index) => subtask !== task.subtasks[index])) {
            return { ...task, subtasks: updatedSubtasks };
          }
        }
        
        return task;
      };
      
      // ✅ Usar función de actualización de estado para evitar problemas de concurrencia
      flushSync(() => {
        setTasks(prevTasks => prevTasks.map(updateTaskRecursively));
      });
      
      // ✅ RETORNAR la subtarea creada para que Promise.all funcione correctamente
      return newSubtask;
      
    } catch (error) {
      logger.error('Error creating subtask:', error);
      throw error;
    }
  };

  // ✅ Nueva función para manejar la creación de múltiples subtareas
  const handleBulkSubtaskCreate = async (parentId: string, subtasksData: Array<{
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    tagIds: string[];
  }>) => {
    try {
      // Crear todas las subtareas en paralelo
      const newSubtasks = await Promise.all(
        subtasksData.map(subtaskData => handleInlineSubtaskCreate(parentId, subtaskData))
      );

      // Función recursiva para actualizar subtareas anidadas
      const updateTaskRecursively = (task: Task): Task => {
        if (task.id === parentId) {
          const updatedTask = { ...task, subtasks: [...(task.subtasks || []), ...newSubtasks] };
          
          // Lógica automática: si se agrega una subtarea a una tarea completada, descompletarla
          if (task.completed) {
            handleTaskToggle(parentId, false);
          }
          
          return updatedTask;
        }
        
        // Si la tarea tiene subtareas, buscar recursivamente
        if (task.subtasks && task.subtasks.length > 0) {
          const updatedSubtasks = task.subtasks.map(updateTaskRecursively);
          // Solo actualizar si alguna subtarea cambió
          if (updatedSubtasks.some((subtask, index) => subtask !== task.subtasks[index])) {
            return { ...task, subtasks: updatedSubtasks };
          }
        }
        
        return task;
      };
      
      // ✅ Actualizar el estado una sola vez con todas las subtareas
      React.startTransition(() => {
        const updatedTasks = tasks.map(updateTaskRecursively);
        setTasks(updatedTasks);
      });
      
    } catch (error) {
      logger.error('Error creating bulk subtasks:', error);
      throw error;
    }
  };

  // Group handlers
  const handleCreateGroup = async (groupData: { name: string; description?: string; color: string }) => {
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      });

      if (!response.ok) {
        throw new Error('Failed to create group');
      }

      const newGroup = await response.json();
      setGroups(prevGroups => [...prevGroups, newGroup]);
    } catch (error) {
      logger.error('Error creating group:', error);
    }
  };

  const handleUpdateGroup = async (groupId: string, groupData: { name: string; description?: string; color: string }) => {
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      });

      if (!response.ok) {
        throw new Error('Failed to update group');
      }

      const updatedGroup = await response.json();
      setGroups(prevGroups => prevGroups.map(group => group.id === groupId ? updatedGroup : group));
    } catch (error) {
      logger.error('Error updating group:', error);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete group');
      }

      setGroups(prevGroups => prevGroups.filter(group => group.id !== groupId));
      setSelectedGroups(prevSelected => prevSelected.filter(id => id !== groupId));
      // Reload tasks to update any that were in this group
      loadData();
    } catch (error) {
      logger.error('Error deleting group:', error);
    }
  };

  // Tag handlers
  const handleCreateTag = async (tagData: { name: string; color: string }) => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tagData),
      });

      if (!response.ok) {
        throw new Error('Failed to create tag');
      }

      const newTag = await response.json();
      setTags(prevTags => [...prevTags, newTag]);
    } catch (error) {
      logger.error('Error creating tag:', error);
    }
  };

  const handleUpdateTag = async (tagId: string, tagData: { name: string; color: string }) => {
    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tagData),
      });

      if (!response.ok) {
        throw new Error('Failed to update tag');
      }

      const updatedTag = await response.json();
      setTags(prevTags => prevTags.map(tag => tag.id === tagId ? updatedTag : tag));
    } catch (error) {
      logger.error('Error updating tag:', error);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tag');
      }

      setTags(prevTags => prevTags.filter(tag => tag.id !== tagId));
      setSelectedTags(prevSelected => prevSelected.filter(id => id !== tagId));
    } catch (error) {
      logger.error('Error deleting tag:', error);
    }
  };

  // Filter tasks based on current filters and calendar mode
  const filteredTasks = tasks.filter(task => {
    // Calendar mode: filter by selected date
    if (isCalendarMode && selectedCalendarDate) {
      const selectedDateStr = selectedCalendarDate.toISOString().split('T')[0];
      
      // Incluir tareas que inician en esta fecha
      const startsOnDate = task.startDate && task.startDate.split('T')[0] === selectedDateStr;
      // Incluir tareas que vencen en esta fecha
      const duesOnDate = task.dueDate && task.dueDate.split('T')[0] === selectedDateStr;
      // Incluir tareas que están en progreso (entre fecha de inicio y vencimiento)
      const inProgress = task.startDate && task.dueDate && 
        task.startDate.split('T')[0] <= selectedDateStr && 
        task.dueDate.split('T')[0] >= selectedDateStr;
      
      // Si no coincide con ninguna condición, no mostrar en modo calendario
      if (!startsOnDate && !duesOnDate && !inProgress) {
        return false;
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = task.title.toLowerCase().includes(query);
      const descriptionMatch = task.description?.toLowerCase().includes(query);
      const groupMatch = task.group?.name?.toLowerCase().includes(query);
      const tagMatch = task.tags.some(t => t.tag.name.toLowerCase().includes(query));
      
      if (!titleMatch && !descriptionMatch && !groupMatch && !tagMatch) {
        return false;
      }
    }

    // Priority filter
    if (selectedPriorities.size > 0 && !selectedPriorities.has(task.priority)) {
      return false;
    }

    // Completed filter
    if (!showCompleted && task.completed) {
      return false;
    }

    // Overdue filter
    if (showOverdue) {
      const now = new Date();
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      if (!dueDate || dueDate > now || task.completed) {
        return false;
      }
    }

    // Tags filter
    if (selectedTags.size > 0) {
      const taskTagIds = task.tags.map(t => t.tag.id);
      if (!taskTagIds.some(tagId => selectedTags.has(tagId))) {
        return false;
      }
    }

    // Groups filter
    if (selectedGroups.size > 0) {
      if (!task.groupId || !selectedGroups.has(task.groupId)) {
        return false;
      }
    }

    return true;
  });

  // Calculate statistics
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length,
    overdue: tasks.filter(t => 
      !t.completed && t.dueDate && new Date(t.dueDate) < new Date()
    ).length
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">TaskMaster 1.5</h1>
            </div>

            {/* Header Controls */}
            <div className="flex items-center space-x-2">
              {/* Calendar Mode Toggle */}
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-gray-600" />
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCalendarMode}
                    onChange={(e) => setIsCalendarMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>

              </div>
              
              {/* Group Mode Toggle - Show in both calendar and list modes */}
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-600" />
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGroupedView}
                    onChange={(e) => setIsGroupedView(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>

              </div>
              

              

              <button
                onClick={() => openTagManager()}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <TagIcon className="w-4 h-4" />
              </button>
              

              

              <button
                onClick={() => openGroupManager()}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <Users className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Filter className="w-4 h-4" />
              </button>
              
              {/* Multi-select Mode Toggle */}
              {!isCalendarMode && filteredTasks.length > 0 && (
                <button
                  onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md transition-colors ${
                    isMultiSelectMode 
                      ? 'text-blue-700 bg-blue-50 border-blue-300 hover:bg-blue-100' 
                      : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              

              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-32 sm:w-48 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Filters Section - Conditional */}
      {showFilters && (
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <TaskFilters
              tasks={tasks}
              filteredTasks={filteredTasks}
              availableTags={tags}
              availableGroups={groups}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isCalendarMode ? (
          /* Calendar Mode - Two Column Layout */
          <div className="flex gap-6 h-full">
            {/* Left Column - Calendar */}
            <div className="w-80 flex-shrink-0">
              <Calendar
              selectedDate={selectedCalendarDate}
              onDateSelect={setSelectedCalendarDate}
              tasks={tasks}
            />
            </div>

            {/* Right Column - Tasks for Selected Date */}
            <div className="flex-1 min-w-0">
              {/* Date Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Tareas para {selectedCalendarDate.toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h2>

              </div>

              {/* Add New Task */}
              <div className="mb-6">
                <InlineTaskForm
                  onSubmit={handleTaskSubmit}
                  availableTags={tags}
                  availableGroups={groups}
                  isLoading={loading}
                  onBulkTaskClick={() => setShowBulkTaskForm(true)}
                />
              </div>

              {/* Clear Filters */}
              {(searchQuery || selectedTags.size > 0 || selectedGroups.size > 0 || selectedPriorities.size > 0 || showOverdue || dateFilter !== 'all') && (
                <div className="mt-4">
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-blue-600 hover:text-blue-800 py-2 px-4 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}

              {/* Task List */}
              <div>
              <TaskList
              key={`main-tasklist-${tasks.length}-${forceRerender}`}
              tasks={filteredTasks}
              onTaskToggle={handleTaskToggle}
              onTaskEdit={handleTaskEdit}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              onSubtaskCreate={handleInlineSubtaskCreate}
              availableTags={tags}
              availableGroups={groups}
              selectedTags={selectedTags}
              selectedGroups={selectedGroups}
              isLoading={loading}
              isGroupedView={isGroupedView}
              onTaskStateUpdate={handleTaskStateUpdate}
              onBulkDelete={handleBulkDelete}
              onBulkEdit={handleGlobalBulkEdit}
              onGlobalBulkEdit={handleGlobalBulkEdit}
              onClearSelection={handleClearSelectionFn}
              isMultiSelectMode={isMultiSelectMode}
              setIsMultiSelectMode={setIsMultiSelectMode}
                />
              </div>

              {/* Tareas sin fecha definida */}
              {(() => {
                const tasksWithoutDate = tasks.filter(task => !task.dueDate && !task.startDate && !task.parentId);
                // Aplicar filtros de completadas para determinar si mostrar la sección
                const filteredTasksWithoutDate = tasksWithoutDate.filter(task => {
                  if (!showCompleted && task.completed) return false;
                  return true;
                });
                return filteredTasksWithoutDate.length > 0 && (
                  <div className="mt-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-gray-500" />
                        Tareas sin fecha definida
                      </h3>
                      <TaskList
                        key={`no-date-tasklist-${tasksWithoutDate.length}-${forceRerender}`}
                        tasks={tasksWithoutDate}
                        onTaskToggle={handleTaskToggle}
                        onTaskEdit={handleTaskEdit}
                        onTaskUpdate={handleTaskUpdate}
                        onTaskDelete={handleTaskDelete}
                        onSubtaskCreate={handleInlineSubtaskCreate}
                        availableTags={tags}
                        availableGroups={groups}
                        selectedTags={[]}
                        selectedGroups={[]}
                        isLoading={loading}
                        isGroupedView={isGroupedView}
                        onTaskStateUpdate={handleTaskStateUpdate}
                        onBulkDelete={handleBulkDelete}
                        onBulkEdit={handleGlobalBulkEdit}
                        onGlobalBulkEdit={handleGlobalBulkEdit}
                        onClearSelection={handleClearSelectionFn}
                        isMultiSelectMode={isMultiSelectMode}
                        setIsMultiSelectMode={setIsMultiSelectMode}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          /* Normal Mode - Single Column Layout */
          <div className="space-y-6">
            {/* Task Form */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <InlineTaskForm
                onSubmit={handleTaskSubmit}
                availableTags={tags}
                availableGroups={groups}
                isLoading={loading}
                onBulkTaskClick={() => setShowBulkTaskForm(true)}
              />
            </div>



            {/* Task List and Statistics */}
            <div className="flex gap-6">
              <div className="flex-1">
                <TaskList
                  key={`list-view-tasklist-${filteredTasks.length}-${forceRerender}`}
                  tasks={filteredTasks}
                  onTaskToggle={handleTaskToggle}
                  onTaskEdit={handleTaskEdit}
                  onTaskUpdate={handleTaskUpdate}
                  onTaskDelete={handleTaskDelete}
                  onSubtaskCreate={handleInlineSubtaskCreate}
                  availableTags={tags}
                  availableGroups={groups}
                  selectedTags={selectedTags}
                  selectedGroups={selectedGroups}
                  selectedPriorities={selectedPriorities}
                  showCompleted={showCompleted}
                  isLoading={loading}
                  isGroupedView={isGroupedView}
                  onTaskStateUpdate={handleTaskStateUpdate}
                  onBulkDelete={handleBulkDelete}
                  onBulkEdit={handleGlobalBulkEdit}
                  onGlobalBulkEdit={handleGlobalBulkEdit}
                  onClearSelection={handleClearSelectionFn}
                  isMultiSelectMode={isMultiSelectMode}
                  setIsMultiSelectMode={setIsMultiSelectMode}
                />
              </div>
              
              {/* Statistics Panel */}
              <div className="w-full lg:w-80 lg:flex-shrink-0 transition-all duration-300 ease-in-out">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Estadísticas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                      <div className="text-sm text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                      <div className="text-sm text-gray-500">Completadas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                      <div className="text-sm text-gray-500">Pendientes</div>
                    </div>
                    {stats.overdue > 0 && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                        <div className="text-sm text-gray-500">Vencidas</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={() => {
          closeTaskForm();
          // editingTask is now managed by UIStore
          setParentTask(null);
        }}
        onSubmit={handleTaskSubmit}
        task={editingTask}
        parentTask={parentTask}
        availableTags={tags}
        availableGroups={groups}
      />

      <TagManager
        isOpen={isTagManagerOpen}
        onClose={() => closeTagManager()}
        tags={tags}
        onCreateTag={handleCreateTag}
        onUpdateTag={handleUpdateTag}
        onDeleteTag={handleDeleteTag}
      />

      <GroupManager
        isOpen={isGroupManagerOpen}
        onClose={() => closeGroupManager()}
        groups={groups}
        onCreateGroup={handleCreateGroup}
        onUpdateGroup={handleUpdateGroup}
        onDeleteGroup={handleDeleteGroup}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onCancel={cancelTaskDelete}
        onConfirm={confirmTaskDelete}
        task={taskToDelete}
        isLoading={deleteLoading}
      />

      <BulkTaskForm
        isOpen={showBulkTaskForm}
        onClose={() => setShowBulkTaskForm(false)}
        onSubmit={handleBulkTaskCreate}
        availableTags={tags}
        availableGroups={groups}
      />

      <BulkDeleteModal
        isOpen={showBulkDeleteModal}
        onCancel={cancelBulkDelete}
        onConfirm={confirmBulkDelete}
        onClearSelection={() => {
          if (clearSelectionFn) {
            try {
              clearSelectionFn();
            } catch (error) {
              logger.error('Error executing clearSelectionFn:', error);
            }
          }
          // Forzar cierre del modal como fallback
          setTimeout(() => {
            setShowBulkDeleteModal(false);
          }, 100);
        }}
        tasks={tasksToDelete}
        isLoading={bulkDeleteLoading}
      />

      <BulkEditModal
        isOpen={showBulkEditModal}
        onClose={handleBulkEditClose}
        onSave={handleBulkEditSave}
        allTasks={tasks}
        availableTags={tags}
        availableGroups={groups}
      />

      {/* Toast de notificación para deshacer */}
      <UndoToast
        isVisible={toastState.isVisible}
        message={toastState.message}
        onUndo={undoFromToast}
        onDismiss={hideToast}
        duration={5000}
      />
    </div>
  );
};

export default HomePage;

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Filter, Tag as TagIcon, Search, Settings, RefreshCw, Calendar as CalendarIcon, Clock, Users, CheckSquare, Edit } from 'lucide-react';
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
import ThemeToggle from '@/components/ThemeToggle';
import Calendar from '@/components/Calendar';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import UndoToast from '@/components/UndoToast';

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
  status: 'pending' | 'ongoing' | 'completed';
  completed: boolean; // Mantenido por compatibilidad temporal
  ongoingDate?: string;
  completedDate?: string;
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

  // Modal states
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
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

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string[]>(['pending']); // Cambiado a array
  const [showFilters, setShowFilters] = useState(false);

  // Calendar states
  const [isCalendarMode, setIsCalendarMode] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  
  // Group view states
  const [isGroupedView, setIsGroupedView] = useState(false);
  
  // Multi-select mode state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  // Visible history state for tasks
  const [visibleHistory, setVisibleHistory] = useState(new Set());

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

  // Load tasks, tags and groups from API
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [tasksResponse, tagsResponse, groupsResponse] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/tags?includeTaskCount=true'),
        fetch('/api/groups?includeTaskCount=true')
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
          console.error('Error parsing tasks response:', parseError);
          tasksData = [];
        }
      } else {
        console.error('Tasks API failed:', tasksResponse.status, tasksResponse.statusText);
      }
      
      if (tagsResponse.ok) {
        try {
          const text = await tagsResponse.text();
          tagsData = text ? JSON.parse(text) : [];
        } catch (parseError) {
          console.error('Error parsing tags response:', parseError);
          tagsData = [];
        }
      } else {
        console.error('Tags API failed:', tagsResponse.status, tagsResponse.statusText);
      }
      
      if (groupsResponse.ok) {
        try {
          const text = await groupsResponse.text();
          groupsData = text ? JSON.parse(text) : [];
          
          // DEBUG: Log para verificar los datos de grupos recibidos de la API
          console.log('🔍 DEBUG Groups API Response:', {
            groupsCount: groupsData.length,
            firstGroup: groupsData[0],
            groupsWithTaskStats: groupsData.filter(g => g.taskStats).length
          });
          
        } catch (parseError) {
          console.error('Error parsing groups response:', parseError);
          groupsData = [];
        }
      } else {
        console.error('Groups API failed:', groupsResponse.status, groupsResponse.statusText);
      }
      
      setTasks(tasksData);
      setTags(tagsData);
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Función para recargar solo las estadísticas de los grupos
  const refreshGroupStats = async () => {
    try {
      const groupsResponse = await fetch('/api/groups?includeTaskCount=true');
      
      if (groupsResponse.ok) {
        const text = await groupsResponse.text();
        const groupsData = text ? JSON.parse(text) : [];
        
        console.log('🔍 Refreshing group stats:', {
          groupsCount: groupsData.length,
          groupsWithTaskStats: groupsData.filter(g => g.taskStats).length
        });
        
        setGroups(groupsData);
      } else {
        console.error('Failed to refresh group stats:', groupsResponse.status, groupsResponse.statusText);
      }
    } catch (error) {
      console.error('Error refreshing group stats:', error);
    }
  };

  // Bulk edit function
  const handleBulkEdit = async (taskIds: string[], updates: any) => {
    try {
      console.log('handleBulkEdit called with:', { taskIds, updates });
      
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
      console.error('Error updating tasks:', error);
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
      setTasks(prevTasks => [...prevTasks, ...result.tasks]);
      
      // Cerrar el formulario
      setShowBulkTaskForm(false);
      
      console.log(result.message);
      return result;
    } catch (error) {
      console.error('Error creating bulk tasks:', error);
      setError(error instanceof Error ? error.message : 'Error al crear las tareas');
      throw error;
    }
  };

  // Global bulk edit handlers
  const handleGlobalBulkEdit = (selectedTasks: Task[]) => {
    setBulkEditTasks(selectedTasks);
    setShowBulkEditModal(true);
  };

  const handleBulkEditSave = async (updates: any) => {
    try {
      const taskIds = bulkEditTasks.map(task => task.id);
      await handleBulkEdit(taskIds, updates);
      setShowBulkEditModal(false);
      setBulkEditTasks([]);
      // Limpiar selección si existe
      if (clearSelectionFn) {
        clearSelectionFn();
      }
    } catch (error) {
      console.error('Error in bulk edit:', error);
      throw error;
    }
  };

  const handleBulkEditClose = () => {
    setShowBulkEditModal(false);
    setBulkEditTasks([]);
  };

  // Estado para evitar múltiples actualizaciones simultáneas
  const [processingTasks, setProcessingTasks] = useState<Set<string>>(new Set());

  // Función para verificar y completar tarea padre si todas sus subtareas están completadas
  const checkAndCompleteParentTask = useCallback(async (parentTaskId: string) => {
    if (processingTasks.has(parentTaskId)) {
      console.log(`Parent task ${parentTaskId} is already being processed, skipping check`);
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

      // Obtener el estado actual de las tareas usando setTasks con función callback
      let parentTask: Task | null = null;
      setTasks(currentTasks => {
        parentTask = findTaskById(currentTasks, parentTaskId);
        return currentTasks; // No modificar el estado, solo obtener la referencia actual
      });
      
      if (!parentTask) {
        console.log(`Parent task ${parentTaskId} not found`);
        return;
      }

      if (parentTask.status === 'completed') {
        console.log(`Parent task ${parentTaskId} is already completed`);
        return;
      }

      // Verificar si todas las subtareas están completadas
      const allSubtasksCompleted = parentTask.subtasks && parentTask.subtasks.length > 0 && 
        parentTask.subtasks.every(subtask => subtask.status === 'completed');

      if (allSubtasksCompleted) {
        const taskLevel = parentTask.parentId ? (parentTask.parent?.parentId ? 'level 2' : 'level 1') : 'level 0';
        console.log(`All subtasks completed for ${taskLevel} parent task ${parentTaskId}, auto-completing...`);
        
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
            console.log(`Parent task ${parentTaskId} auto-completed successfully:`, updatedTask);
            
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
              return updateTaskInTree(currentTasks);
            });
            
            // Continuar el efecto dominó si esta tarea también tiene padre
            if (parentTask.parentId) {
              console.log(`Continuing domino effect: checking grandparent task ${parentTask.parentId}`);
              setTimeout(() => {
                checkAndCompleteParentTask(parentTask.parentId!);
              }, 150);
            }
          } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error(`Failed to auto-complete parent task ${parentTaskId}:`, errorData);
          }
        } catch (error) {
          console.error(`Error auto-completing parent task ${parentTaskId}:`, error);
        } finally {
          setProcessingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(parentTaskId);
            return newSet;
          });
        }
      } else {
        console.log(`Not all subtasks completed for parent task ${parentTaskId}, skipping auto-complete`);
      }
    } catch (error) {
      console.error(`Error in checkAndCompleteParentTask for ${parentTaskId}:`, error);
    }
  }, [tasks, processingTasks]);

  // Función auxiliar para actualizar subtareas recursivamente (solo actualiza estado, no hace peticiones HTTP)
  const updateTaskRecursively = (task: Task, taskId: string, updatedTask: any): { updatedTask: Task, tasksToAutoComplete: string[] } => {
    // Validaciones de entrada
    if (!task || !taskId || !updatedTask) {
      console.warn('Invalid parameters in updateTaskRecursively:', { task: !!task, taskId, updatedTask: !!updatedTask });
      return { updatedTask: task, tasksToAutoComplete: [] };
    }

    if (task.id === taskId) {
      console.log(`Updating task ${taskId} with new data:`, updatedTask);
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
      const allSubtasksCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(subtask => subtask.status === 'completed');
      const shouldAutoComplete = allSubtasksCompleted && task.status !== 'completed' && task.id !== taskId;
      
      if (shouldAutoComplete) {
        console.log(`Marking task ${task.id} for auto-completion because all subtasks are completed`);
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

  // Task handlers - Versión optimizada para evitar re-renders innecesarios
  const handleTaskToggle = useCallback(async (taskId: string, newStatus: 'pending' | 'ongoing' | 'completed') => {
    console.log(`🔍 Page: handleTaskToggle called for taskId: ${taskId}, newStatus: ${newStatus}`);
    console.log(`handleTaskToggle called with taskId: "${taskId}", newStatus: ${newStatus}`);
    
    // Validar que taskId sea válido
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      console.error('Invalid taskId provided to handleTaskToggle:', taskId);
      return;
    }
    
    // Evitar múltiples actualizaciones simultáneas de la misma tarea
    if (processingTasks.has(taskId) || isUndoing || isRedoing) {
      console.log(`Task ${taskId} is already being processed or undo/redo in progress, skipping...`);
      return;
    }

    setProcessingTasks(prev => new Set(prev).add(taskId));

    try {
      // 1. ACTUALIZACIÓN OPTIMISTA LOCAL INMEDIATA (solo la tarea específica)
      let previousTaskState: any = null;
      
      setTasks(prevTasks => {
        const updateTaskOptimistically = (task: Task): Task => {
          if (task.id === taskId) {
            previousTaskState = { 
              status: task.status,
              completed: task.completed, 
              ongoingDate: task.ongoingDate,
              completedDate: task.completedDate,
              dueDate: task.dueDate, 
              originalDueDate: task.originalDueDate,
              title: task.title
            };
            
            // Calcular las fechas según el nuevo estado
            const now = new Date().toISOString();
            let ongoingDate = task.ongoingDate;
            let completedDate = task.completedDate;
            
            if (newStatus === 'ongoing' && task.status === 'pending') {
              ongoingDate = now;
            } else if (newStatus === 'completed' && task.status !== 'completed') {
              completedDate = now;
              if (!ongoingDate && task.status === 'pending') {
                ongoingDate = now; // Si va directo de pending a completed
              }
            } else if (newStatus === 'pending') {
              ongoingDate = undefined;
              completedDate = undefined;
            }
            
            // Si se está completando una tarea padre, también completar sus subtareas
            let updatedSubtasks = task.subtasks;
            if (newStatus === 'completed' && task.status !== 'completed' && task.subtasks.length > 0) {
              updatedSubtasks = task.subtasks.map(subtask => ({
                ...subtask,
                status: 'completed' as const,
                completed: true,
                completedDate: now,
                ongoingDate: subtask.ongoingDate || now
              }));
            }
            
            return { 
              ...task, 
              status: newStatus,
              completed: newStatus === 'completed', // Mantener compatibilidad
              ongoingDate,
              completedDate,
              subtasks: updatedSubtasks 
            };
          }
          if (task.subtasks && task.subtasks.length > 0) {
            const updatedSubtasks = task.subtasks.map(updateTaskOptimistically);
            // Solo crear nuevo objeto si realmente cambió algo
            if (updatedSubtasks.some((subtask, index) => subtask !== task.subtasks[index])) {
              return { ...task, subtasks: updatedSubtasks };
            }
          }
          return task;
        };
        
        return prevTasks.map(updateTaskOptimistically);
      });

      // 2. LLAMADA A LA API EN BACKGROUND
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        // Revertir cambio optimista si falla la API
        setTasks(prevTasks => {
          const revertTask = (task: Task): Task => {
            if (task.id === taskId) {
              return { 
                ...task, 
                status: previousTaskState.status,
                completed: previousTaskState.completed,
                ongoingDate: previousTaskState.ongoingDate,
                completedDate: previousTaskState.completedDate
              };
            }
            if (task.subtasks && task.subtasks.length > 0) {
              const revertedSubtasks = task.subtasks.map(revertTask);
              if (revertedSubtasks.some((subtask, index) => subtask !== task.subtasks[index])) {
                return { ...task, subtasks: revertedSubtasks };
              }
            }
            return task;
          };
          return prevTasks.map(revertTask);
        });
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedTask = await response.json();

      // 3. REGISTRAR ACCIÓN PARA UNDO/REDO (sin mostrar toast aún)
      if (!isUndoing && !isRedoing && previousTaskState) {
        const statusLabels = {
          pending: 'Pendiente',
          ongoing: 'En Proceso',
          completed: 'Completada'
        };
        
        addAction({
          type: 'TASK_TOGGLE',
          description: `Cambiar estado de tarea "${previousTaskState.title}" a ${statusLabels[newStatus]}`,
          data: {
            taskId,
            previousState: previousTaskState,
            newState: { status: newStatus }
          },
          undo: async () => {
            await handleTaskToggle(taskId, previousTaskState.status);
          },
          redo: async () => {
            await handleTaskToggle(taskId, newStatus);
          }
        });
      }

      // 4. ACTUALIZAR PROGRESO DE TAREA PADRE (si es necesario) - sin delay para usar datos actualizados
      console.log(`🔍 Page: Calling checkAndCompleteParentTaskOptimized for taskId: ${taskId}`);
      checkAndCompleteParentTaskOptimized(taskId);

      // 5. REFRESCAR ESTADÍSTICAS DE GRUPOS para actualizar las barras de progreso
      refreshGroupStats();

    } catch (error) {
      console.error('Error in handleTaskToggle:', error);
    } finally {
      // Remover de procesamiento
      setProcessingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  }, [processingTasks, isUndoing, isRedoing, addAction, refreshGroupStats]);

  // Función optimizada para actualizar tareas padre sin re-render completo
  const checkAndCompleteParentTaskOptimized = useCallback(async (childTaskId: string) => {
    console.log(`🔍 Page: checkAndCompleteParentTaskOptimized called for childTaskId: ${childTaskId}`);
    let parentTask: Task | null = null;
    
    // Encontrar la tarea padre de forma eficiente
    const findParentTask = (tasks: Task[]): Task | null => {
      for (const task of tasks) {
        if (task.subtasks && task.subtasks.some(subtask => subtask.id === childTaskId)) {
          return task;
        }
        if (task.subtasks && task.subtasks.length > 0) {
          const found = findParentTask(task.subtasks);
          if (found) return found;
        }
      }
      return null;
    };

    parentTask = findParentTask(tasks);
    
    if (!parentTask || !parentTask.subtasks || parentTask.subtasks.length === 0) return;

    const completedSubtasks = parentTask.subtasks.filter(subtask => subtask.status === 'completed').length;
    const ongoingSubtasks = parentTask.subtasks.filter(subtask => subtask.status === 'ongoing').length;
    const totalSubtasks = parentTask.subtasks.length;
    
    // Determinar el estado que debería tener la tarea padre
    let targetStatus: 'pending' | 'ongoing' | 'completed';
    
    if (completedSubtasks === totalSubtasks) {
      // Si todas las subtareas están completadas, la tarea padre debe estar completada
      targetStatus = 'completed';
    } else if (ongoingSubtasks > 0 || completedSubtasks > 0) {
      // Si hay al menos una subtarea en progreso o completada, la tarea padre debe estar en progreso
      targetStatus = 'ongoing';
    } else {
      // Si todas las subtareas están pendientes, la tarea padre debe estar pendiente
      targetStatus = 'pending';
    }

    // Solo actualizar si el estado actual es diferente al estado objetivo
    if (parentTask.status !== targetStatus) {
      console.log(`🔍 Page: Parent task ${parentTask.id} needs status change from ${parentTask.status} to ${targetStatus}`);
      await handleTaskToggle(parentTask.id, targetStatus);
    } else {
      console.log(`🔍 Page: Parent task ${parentTask.id} already has correct status: ${targetStatus}`);
    }
  }, [tasks, handleTaskToggle]);



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
    try {
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
      
      setTasks(prevTasks => 
        prevTasks.map(task => updateTaskDataRecursively(task, taskId, updatedTask))
      );
    } catch (error) {
      console.error('Error updating task:', error);
      throw error; // Re-lanzar el error para que lo maneje el componente que llama
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
        
        setTasks(prevTasks => 
          prevTasks.map(task => {
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
          })
        );
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
          setTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === parentTask.id 
                ? { ...task, subtasks: [...(task.subtasks || []), newTask] }
                : task
            )
          );
        } else {
          // Add as main task
          setTasks(prevTasks => [newTask, ...prevTasks]);
        }
      }

      // Close form and reset states
      setShowTaskForm(false);
      setEditingTask(null);
      setParentTask(null);
    } catch (error) {
      console.error('Error submitting task:', error);
    }
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleHistoryToggle = useCallback((taskId: string) => {
    setVisibleHistory(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

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
      console.log('🔍 Estado antes de eliminar:', tasks.length, 'tareas');
      console.log('🔍 Eliminando tarea con ID:', taskToDelete.id);
      console.log('🔍 Tarea a eliminar:', taskToDelete);
      
      setTasks(prevTasks => {
        console.log('🔍 Estado previo en setTasks:', prevTasks.length, 'tareas');
        
        const filteredTasks = prevTasks.filter(task => task.id !== taskToDelete.id);
        console.log('🔍 Después de filtrar tareas principales:', filteredTasks.length, 'tareas');
        
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
        
        console.log('🔍 Estado final después de eliminar subtareas:', updatedTasks.length, 'tareas');
        console.log('🔍 Tareas actualizadas:', updatedTasks.map(t => ({ id: t.id, title: t.title, subtasks: t.subtasks?.length || 0 })));
        
        // Verificar si la tarea eliminada realmente se removió
        const taskStillExists = updatedTasks.some(t => t.id === taskToDelete.id);
        const subtaskStillExists = updatedTasks.some(t => 
          t.subtasks && t.subtasks.some(st => st.id === taskToDelete.id)
        );
        console.log('🔍 ¿Tarea principal aún existe?:', taskStillExists);
        console.log('🔍 ¿Subtarea aún existe?:', subtaskStillExists);
        
        return updatedTasks;
      });
      
      // Forzar re-renderizado completo
      setForceRerender(prev => prev + 1);

      setShowDeleteModal(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Error deleting task:', error);
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
          console.error(`Error deleting task ${task.id}:`, error);
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
          console.log(`Successfully deleted ${successfulDeletions.length} tasks, failed to delete ${failedDeletions.length} tasks`);
        }
      } else {
        // All deletions were successful
        console.log(`Successfully deleted ${successfulDeletions.length} tasks`);
      }

      setShowBulkDeleteModal(false);
      setTasksToDelete([]);
      // La limpieza de selección se maneja desde el modal después de la eliminación
    } catch (error) {
      console.error('Error in bulk delete operation:', error);
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
      setShowTaskForm(true);
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
      console.log('🚀 Iniciando creación de subtarea:', { parentId, subtaskData });
      
      const payload = {
        ...subtaskData,
        priority: subtaskData.priority.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH',
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
      console.log('✅ Subtarea creada exitosamente:', newSubtask);
      
      // Función recursiva para actualizar subtareas anidadas
      const updateTaskRecursively = (task: Task): Task => {
        if (task.id === parentId) {
          console.log('📝 Actualizando tarea padre:', { taskId: task.id, wasCompleted: task.completed, newSubtaskId: newSubtask.id });
          const updatedTask = { ...task, subtasks: [...(task.subtasks || []), newSubtask] };
          
          // Lógica automática: si se agrega una subtarea a una tarea completada, descompletarla
          if (task.completed) {
            console.log('🔄 Descompletando tarea padre porque se añadió subtarea');
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
      
      console.log('🔄 Actualizando estado de tareas...');
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(updateTaskRecursively);
        console.log('📊 Estado de tareas actualizado:', updatedTasks.length, 'tareas');
        return updatedTasks;
      });
      
      // Refrescar las estadísticas de los grupos después de crear una subtarea
      console.log('📈 Refrescando estadísticas de grupos...');
      await refreshGroupStats();
      console.log('✨ Proceso de creación de subtarea completado');
    } catch (error) {
      console.error('❌ Error creating subtask:', error);
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
      console.error('Error creating group:', error);
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
      console.error('Error updating group:', error);
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
      console.error('Error deleting group:', error);
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
      console.error('Error creating tag:', error);
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
      console.error('Error updating tag:', error);
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
      console.error('Error deleting tag:', error);
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
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }

    // Status filter - ahora soporta múltiples estados
    if (statusFilter.length > 0 && !statusFilter.includes('all')) {
      if (!statusFilter.includes(task.status)) {
        return false;
      }
    }

    // Tags filter
    if (selectedTags.length > 0) {
      const taskTagIds = task.tags.map(t => t.tag.id);
      if (!selectedTags.some(tagId => taskTagIds.includes(tagId))) {
        return false;
      }
    }

    // Groups filter
    if (selectedGroups.length > 0) {
      if (!task.groupId || !selectedGroups.includes(task.groupId)) {
        return false;
      }
    }

    return true;
  });

  // Calculate statistics
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status !== 'completed').length,
    overdue: tasks.filter(t => {
      if (t.status === 'completed' || !t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      return !isNaN(dueDate.getTime()) && dueDate < new Date();
    }).length
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md backdrop-saturate-150 shadow-sm border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">TaskMaster 1.5</h1>
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
                onClick={() => setShowTagManager(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <TagIcon className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    const event = new CustomEvent('toggleMultiSelect');
                    window.dispatchEvent(event);
                  }
                }}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                title="Selección múltiple"
              >
                <CheckSquare className="w-4 h-4" />
              </button>
              

              <button
                onClick={() => setShowGroupManager(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <Users className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Filter className="w-4 h-4" />
              </button>
              
              {/* Status Filter - Multiple Selection */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setStatusFilter(['all'])}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    statusFilter.includes('all')
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    if (statusFilter.includes('pending')) {
                      setStatusFilter(statusFilter.filter(s => s !== 'pending'));
                    } else {
                      setStatusFilter([...statusFilter.filter(s => s !== 'all'), 'pending']);
                    }
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    statusFilter.includes('pending')
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => {
                    if (statusFilter.includes('ongoing')) {
                      setStatusFilter(statusFilter.filter(s => s !== 'ongoing'));
                    } else {
                      setStatusFilter([...statusFilter.filter(s => s !== 'all'), 'ongoing']);
                    }
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    statusFilter.includes('ongoing')
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => {
                    if (statusFilter.includes('completed')) {
                      setStatusFilter(statusFilter.filter(s => s !== 'completed'));
                    } else {
                      setStatusFilter([...statusFilter.filter(s => s !== 'all'), 'completed']);
                    }
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    statusFilter.includes('completed')
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Done
                </button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-32 sm:w-48 pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-300"
                />
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

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

              {/* Filters */}
              <div className={`mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${showFilters ? 'block' : 'hidden'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Priority Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Priorities</option>
                      <option value="URGENT">Urgent</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>

                  {/* Tags Filter */}
                  {tags.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Tags
                      </label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {tags.map(tag => (
                          <label key={tag.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedTags.includes(tag.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTags([...selectedTags, tag.id]);
                                } else {
                                  setSelectedTags(selectedTags.filter(id => id !== tag.id));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                            />
                            <div className="ml-2 flex items-center">
                              <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: tag.color }}
                              />
                              <span className="text-sm text-gray-700">{tag.name}</span>
                              <span className="ml-1 text-xs text-gray-500">({tag._count?.tasks || 0})</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Groups Filter */}
                  {groups.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Groups
                      </label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {groups.map(group => (
                          <label key={group.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedGroups.includes(group.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedGroups([...selectedGroups, group.id]);
                                } else {
                                  setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                            />
                            <div className="ml-2 flex items-center">
                              <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: group.color }}
                              />
                              <span className="text-sm text-gray-700">{group.name}</span>
                              {group.description && (
                                <span className="ml-1 text-xs text-gray-500">- {group.description}</span>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Clear Filters */}
                {(searchQuery || selectedTags.length > 0 || selectedGroups.length > 0 || priorityFilter !== 'all' || !statusFilter.includes('pending') || statusFilter.length > 1) && (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedTags([]);
                        setSelectedGroups([]);
                        setPriorityFilter('all');
                        setStatusFilter('pending');
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 py-2 px-4 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Task List */}
              <div>
                <TaskList
              key="main-tasklist"
              tasks={filteredTasks}
              onTaskToggle={handleTaskToggle}
              onTaskEdit={handleTaskEdit}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              onSubtaskCreate={handleInlineSubtaskCreate}
              availableTags={tags}
              availableGroups={groups}
              groups={groups}
              selectedTags={selectedTags}
              selectedGroups={selectedGroups}
              priorityFilter={priorityFilter}
              statusFilter={statusFilter}
              isLoading={loading}
              isGroupedView={isGroupedView}
              onTaskStateUpdate={handleTaskStateUpdate}
              onBulkDelete={handleBulkDelete}
              onBulkEdit={handleBulkEdit}
              onGlobalBulkEdit={handleGlobalBulkEdit}
              onClearSelection={handleClearSelectionFn}
                />
              </div>

              {/* Tareas sin fecha definida */}
              {(() => {
                const tasksWithoutDate = tasks.filter(task => !task.dueDate && !task.startDate && !task.parentId);
                // Aplicar filtros de estado para determinar si mostrar la sección
                const filteredTasksWithoutDate = tasksWithoutDate.filter(task => {
                    if (statusFilter.length > 0 && !statusFilter.includes('all')) {
                      return statusFilter.includes(task.status);
                    }
                    return true; // 'all' o sin filtro
                  });
                return filteredTasksWithoutDate.length > 0 && (
                  <div className="mt-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-gray-500" />
                        Tareas sin fecha definida
                      </h3>
                      <TaskList
                        key="no-date-tasklist"
                        tasks={tasksWithoutDate}
                        onTaskToggle={handleTaskToggle}
                        onTaskEdit={handleTaskEdit}
                        onTaskUpdate={handleTaskUpdate}
                        onTaskDelete={handleTaskDelete}
                        onSubtaskCreate={handleInlineSubtaskCreate}
                        availableTags={tags}
                        availableGroups={groups}
                        groups={groups}
                        selectedTags={[]}
                        selectedGroups={[]}
                        priorityFilter="all"
                        statusFilter={statusFilter}
                        isLoading={loading}
                        isGroupedView={isGroupedView}
                        onTaskStateUpdate={handleTaskStateUpdate}
                        onBulkDelete={handleBulkDelete}
                        onBulkEdit={handleBulkEdit}
                        onGlobalBulkEdit={handleGlobalBulkEdit}
                        onClearSelection={handleClearSelectionFn}
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

            {/* Filters */}
            <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${showFilters ? 'block' : 'hidden'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Priority Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Priorities</option>
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                {/* Tags Filter */}
                {tags.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {tags.map(tag => (
                        <label key={tag.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(tag.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTags([...selectedTags, tag.id]);
                              } else {
                                setSelectedTags(selectedTags.filter(id => id !== tag.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                          />
                          <div className="ml-2 flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="text-sm text-gray-700">{tag.name}</span>
                            <span className="ml-1 text-xs text-gray-500">({tag._count?.tasks || 0})</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Groups Filter */}
                {groups.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Groups
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {groups.map(group => (
                        <label key={group.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedGroups.includes(group.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGroups([...selectedGroups, group.id]);
                              } else {
                                setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                          />
                          <div className="ml-2 flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: group.color }}
                            />
                            <span className="text-sm text-gray-700">{group.name}</span>
                            {group.description && (
                              <span className="ml-1 text-xs text-gray-500">- {group.description}</span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Clear Filters */}
              {(searchQuery || selectedTags.length > 0 || selectedGroups.length > 0 || priorityFilter !== 'all' || !statusFilter.includes('pending') || statusFilter.length > 1) && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedTags([]);
                      setSelectedGroups([]);
                      setPriorityFilter('all');
                      setStatusFilter('pending');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 py-2 px-4 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Task List and Statistics */}
            <div className="flex gap-6">
              <div className="flex-1">
                <TaskList
                  key="list-view-tasklist"
                  tasks={filteredTasks}
                  onTaskToggle={handleTaskToggle}
                  onTaskEdit={handleTaskEdit}
                  onTaskUpdate={handleTaskUpdate}
                  onTaskDelete={handleTaskDelete}
                  onSubtaskCreate={handleInlineSubtaskCreate}
                  availableTags={tags}
                  availableGroups={groups}
                  groups={groups}
                  selectedTags={selectedTags}
                  selectedGroups={selectedGroups}
                  priorityFilter={priorityFilter}
                  statusFilter={statusFilter}
                  isLoading={loading}
                  isGroupedView={isGroupedView}
                  isMultiSelectMode={isMultiSelectMode}
                  setIsMultiSelectMode={setIsMultiSelectMode}
                  visibleHistory={visibleHistory}
                  handleHistoryToggle={handleHistoryToggle}
                  onTaskStateUpdate={handleTaskStateUpdate}
                  onBulkDelete={handleBulkDelete}
                  onBulkEdit={handleBulkEdit}
                  onGlobalBulkEdit={handleGlobalBulkEdit}
                  onClearSelection={handleClearSelectionFn}
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
        isOpen={showTaskForm}
        onClose={() => {
          setShowTaskForm(false);
          setEditingTask(null);
          setParentTask(null);
        }}
        onSubmit={handleTaskSubmit}
        task={editingTask}
        parentTask={parentTask}
        availableTags={tags}
        availableGroups={groups}
      />

      <TagManager
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
        tags={tags}
        onCreateTag={handleCreateTag}
        onUpdateTag={handleUpdateTag}
        onDeleteTag={handleDeleteTag}
      />

      <GroupManager
        isOpen={showGroupManager}
        onClose={() => setShowGroupManager(false)}
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
              console.error('Error executing clearSelectionFn:', error);
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
        selectedTasks={bulkEditTasks}
        tags={tags}
        groups={groups}
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

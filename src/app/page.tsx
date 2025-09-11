'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Filter, Tag as TagIcon, Search, Settings, RefreshCw, Calendar as CalendarIcon, Clock, Users, CheckSquare } from 'lucide-react';
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

  // Modal states
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [parentTask, setParentTask] = useState<Task | null>(null);

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
  const [completedFilter, setCompletedFilter] = useState('pending');
  const [showFilters, setShowFilters] = useState(false);

  // Calendar states
  const [isCalendarMode, setIsCalendarMode] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  
  // Group view states
  const [isGroupedView, setIsGroupedView] = useState(false);

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
        fetch('/api/tags'),
        fetch('/api/groups')
      ]);
      
      if (!tasksResponse.ok || !tagsResponse.ok || !groupsResponse.ok) {
        throw new Error('Failed to load data');
      }
      
      const [tasksData, tagsData, groupsData] = await Promise.all([
        tasksResponse.json(),
        tagsResponse.json(),
        groupsResponse.json()
      ]);
      
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

            return updatedTask;
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

  // Task handlers
  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const updatedTask = await response.json();
      
      setTasks(prevTasks => 
        prevTasks.map(task => {
          if (task.id === taskId) {
            return { 
              ...task, 
              completed: updatedTask.completed,
              dueDate: updatedTask.dueDate,
              originalDueDate: updatedTask.originalDueDate
            };
          }
          
          if (task.subtasks && task.subtasks.length > 0) {
            const updatedSubtasks = task.subtasks.map(subtask => 
              subtask.id === taskId 
                ? { ...subtask, completed: updatedTask.completed }
                : subtask
            );
            
            // Lógica automática: si todas las subtareas están completadas, completar la tarea principal
            const allSubtasksCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(subtask => subtask.completed);
            const shouldAutoComplete = allSubtasksCompleted && !task.completed;
            
            if (shouldAutoComplete) {
              // Auto-completar la tarea principal
              handleTaskToggle(task.id, true);
            }
            
            return {
              ...task,
              subtasks: updatedSubtasks
            };
          }
          
          return task;
        })
      );
    } catch (error) {
      console.error('Error toggling task:', error);
    }
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
        prevTasks.map(task => {
          if (task.id === taskId) {
            return { ...task, ...updatedTask };
          }
          
          if (task.subtasks && task.subtasks.length > 0) {
            return {
              ...task,
              subtasks: task.subtasks.map(subtask => 
                subtask.id === taskId 
                  ? { ...subtask, ...updatedTask }
                  : subtask
              )
            };
          }
          
          return task;
        })
      );
    } catch (error) {
      console.error('Error updating task:', error);
      throw error; // Re-lanzar el error para que lo maneje el componente que llama
    }
  };

  const handleTaskStateUpdate = (taskId: string, updatedTask: Task) => {
    setTasks(prevTasks => 
      prevTasks.map(task => {
        if (task.id === taskId) {
          return { ...task, ...updatedTask };
        }
        
        if (task.subtasks && task.subtasks.length > 0) {
          return {
            ...task,
            subtasks: task.subtasks.map(subtask => 
              subtask.id === taskId 
                ? { ...subtask, ...updatedTask }
                : subtask
            )
          };
        }
        
        return task;
      })
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
      setTasks(prevTasks => {
        return prevTasks
          .filter(task => task.id !== taskToDelete.id)
          .map(task => ({
            ...task,
            subtasks: (task.subtasks || []).filter(subtask => subtask.id !== taskToDelete.id)
          }));
      });

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
      const deletePromises = tasksToDelete.map(task => 
        fetch(`/api/tasks/${task.id}`, {
          method: 'DELETE',
        })
      );

      const responses = await Promise.all(deletePromises);
      
      // Check if all deletions were successful
      const failedDeletions = responses.filter(response => !response.ok);
      if (failedDeletions.length > 0) {
        throw new Error(`Failed to delete ${failedDeletions.length} task(s)`);
      }

      // Remove tasks from state
      const taskIdsToDelete = new Set(tasksToDelete.map(t => t.id));
      setTasks(prevTasks => {
        return prevTasks
          .filter(task => !taskIdsToDelete.has(task.id))
          .map(task => ({
            ...task,
            subtasks: (task.subtasks || []).filter(subtask => !taskIdsToDelete.has(subtask.id))
          }));
      });

      setShowBulkDeleteModal(false);
      setTasksToDelete([]);
      // La limpieza de selección se maneja desde el modal después de la eliminación exitosa
    } catch (error) {
      console.error('Error deleting tasks:', error);
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
      
      setTasks(prevTasks => prevTasks.map(updateTaskRecursively));
    } catch (error) {
      console.error('Error creating subtask:', error);
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

    // Completed filter
    if (completedFilter === 'completed' && !task.completed) {
      return false;
    }
    if (completedFilter === 'pending' && task.completed) {
      return false;
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
                onClick={() => setShowTagManager(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <TagIcon className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => {
                  const event = new CustomEvent('toggleMultiSelect');
                  window.dispatchEvent(event);
                }}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                title="Selección múltiple"
              >
                <CheckSquare className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowGroupManager(true)}
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
              
              {/* Status Filter - Triple Switch */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCompletedFilter('all')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    completedFilter === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setCompletedFilter('pending')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    completedFilter === 'pending'
                      ? 'bg-orange-100 text-orange-800 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setCompletedFilter('completed')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    completedFilter === 'completed'
                      ? 'bg-green-100 text-green-800 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
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
                  className="w-32 sm:w-48 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
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
                {(searchQuery || selectedTags.length > 0 || selectedGroups.length > 0 || priorityFilter !== 'all' || completedFilter !== 'pending') && (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedTags([]);
                        setSelectedGroups([]);
                        setPriorityFilter('all');
                        setCompletedFilter('pending');
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
              priorityFilter={priorityFilter}
              completedFilter={completedFilter}
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
                // Aplicar filtros de completadas para determinar si mostrar la sección
                const filteredTasksWithoutDate = tasksWithoutDate.filter(task => {
                  if (completedFilter === 'completed') return task.completed;
                  if (completedFilter === 'pending') return !task.completed;
                  return true; // 'all'
                });
                return filteredTasksWithoutDate.length > 0 && (
                  <div className="mt-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-gray-500" />
                        Tareas sin fecha definida
                      </h3>
                      <TaskList
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
                        priorityFilter="all"
                        completedFilter={completedFilter}
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
              {(searchQuery || selectedTags.length > 0 || selectedGroups.length > 0 || priorityFilter !== 'all' || completedFilter !== 'pending') && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedTags([]);
                      setSelectedGroups([]);
                      setPriorityFilter('all');
                      setCompletedFilter('pending');
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
                  priorityFilter={priorityFilter}
                  completedFilter={completedFilter}
                  isLoading={loading}
                  isGroupedView={isGroupedView}
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
    </div>
  );
};

export default HomePage;

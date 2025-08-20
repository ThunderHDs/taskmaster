'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Filter, Tag as TagIcon, Search, Settings, RefreshCw } from 'lucide-react';
import TaskList from '@/components/TaskList';
import TaskForm from '@/components/TaskForm';
import TagManager from '@/components/TagManager';
import InlineTaskForm from '@/components/InlineTaskForm';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
// DISABLED: Conflict detection system - uncomment to re-enable
// import ConflictAlert from '@/components/ConflictAlert';

// TypeScript interfaces
interface Tag {
  id: string;
  name: string;
  color: string;
  _count?: {
    tasks: number;
  };
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
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  tags: { tag: Tag }[];
  subtasks: Task[];
  parent?: Task;
  conflicts?: ConflictData[];
}

const HomePage: React.FC = () => {
  // State management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [parentTask, setParentTask] = useState<Task | null>(null);
  
  // Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [completedFilter, setCompletedFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // DISABLED: Conflict detection system - uncomment to re-enable
  // const [allConflicts, setAllConflicts] = useState<ConflictData[]>([]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Load tasks and tags
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // DISABLED: Conflict detection system - uncomment to re-enable
      const [tasksResponse, tagsResponse] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/tags?includeTaskCount=true')
        // fetch('/api/conflicts')
      ]);
      
      if (!tasksResponse.ok || !tagsResponse.ok) {
        throw new Error('Failed to load data');
      }
      
      const tasksData = await tasksResponse.json();
      const tagsData = await tagsResponse.json();
      
      setTasks(tasksData);
      setTags(tagsData);
      
      // DISABLED: Conflict detection system - uncomment to re-enable
      // Load conflicts if available
      // if (conflictsResponse.ok) {
      //   const conflictsData = await conflictsResponse.json();
      //   setAllConflicts(conflictsData);
      // }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // DISABLED: Conflict detection system - uncomment to re-enable
  // Conflict operations
  // const handleResolveConflict = async (conflictId: string) => {
  //   try {
  //     const response = await fetch(`/api/conflicts/${conflictId}`, {
  //       method: 'DELETE'
  //     });
  //     
  //     if (!response.ok) {
  //       throw new Error('Failed to resolve conflict');
  //     }
  //     
  //     // Remove conflict from state
  //     setAllConflicts(prev => prev.filter(c => c.id !== conflictId));
  //   } catch (err) {
  //     alert(err instanceof Error ? err.message : 'Failed to resolve conflict');
  //   }
  // };

  // const handleViewTask = (taskId: string) => {
  //   // Scroll to task or highlight it
  //   const taskElement = document.getElementById(`task-${taskId}`);
  //   if (taskElement) {
  //     taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  //     taskElement.classList.add('ring-2', 'ring-blue-500');
  //     setTimeout(() => {
  //       taskElement.classList.remove('ring-2', 'ring-blue-500');
  //     }, 3000);
  //   }
  // };

  // Task operations
  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleTaskUpdate = async (taskId: string, taskData: Partial<Task>) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const updatedTask = await response.json();
      
      // Función recursiva para actualizar tareas en cualquier nivel de anidamiento
      const updateTaskRecursively = (task: Task): Task => {
        let hasChanges = false;
        let updatedTask_local = task;
        
        // Si es la tarea que se está actualizando
        if (task.id === taskId) {
          updatedTask_local = updatedTask;
          hasChanges = true;
        }
        
        // Si la tarea tiene subtareas, aplicar recursivamente
        if (updatedTask_local.subtasks && updatedTask_local.subtasks.length > 0) {
          const updatedSubtasks = updatedTask_local.subtasks.map(subtask => {
            const recursiveResult = updateTaskRecursively(subtask);
            
            // Si la tarea padre fue actualizada, actualizar la referencia parent en las subtareas
            if (updatedTask_local.id === taskId && recursiveResult.parentId === taskId) {
              return {
                ...recursiveResult,
                parent: {
                  id: updatedTask_local.id,
                  title: updatedTask_local.title,
                  startDate: updatedTask_local.startDate,
                  dueDate: updatedTask_local.dueDate
                }
              };
            }
            
            return recursiveResult;
          });
          
          // Verificar si alguna subtarea cambió
          const subtasksChanged = updatedSubtasks.some((subtask, index) => subtask !== updatedTask_local.subtasks[index]);
          if (subtasksChanged) {
            updatedTask_local = {
              ...updatedTask_local,
              subtasks: updatedSubtasks
            };
            hasChanges = true;
          }
        }
        
        // Si esta tarea tiene un padre que fue actualizado, actualizar la referencia parent
        if (updatedTask_local.parentId === taskId && updatedTask_local.id !== taskId) {
          updatedTask_local = {
            ...updatedTask_local,
            parent: {
              id: updatedTask.id,
              title: updatedTask.title,
              startDate: updatedTask.startDate,
              dueDate: updatedTask.dueDate
            }
          };
          hasChanges = true;
        }
        
        return hasChanges ? updatedTask_local : task;
      };
      
      setTasks(prevTasks => prevTasks.map(updateTaskRecursively));
      
      // Close the task form if it was open
      if (editingTask?.id === taskId) {
        setEditingTask(null);
        setShowTaskForm(false);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      throw error; // Re-throw para que TaskList pueda manejar el error
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSubmit = async (taskData: Partial<Task> & { tagIds: string[] }) => {
    try {
      const { tagIds, ...taskFields } = taskData;
      const payload = { ...taskFields, tagIds };
      
      const response = await fetch(
        taskData.id ? `/api/tasks/${taskData.id}` : '/api/tasks',
        {
          method: taskData.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save task');
      }
      
      setShowTaskForm(false);
      setEditingTask(null);
      setParentTask(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save task');
    }
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
    setParentTask(null);
    setShowTaskForm(true);
  };

  const handleTaskDelete = (taskId: string) => {
    // Find the task to delete
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Set the task to delete and show the modal
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };
  
  const confirmTaskDelete = async () => {
    if (!taskToDelete) return;
    
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete task');
      }
      
      await loadData();
      setShowDeleteModal(false);
      setTaskToDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setDeleteLoading(false);
    }
  };
  
  const cancelTaskDelete = () => {
    setShowDeleteModal(false);
    setTaskToDelete(null);
    setDeleteLoading(false);
  };

  const handleSubtaskCreate = (parentId: string) => {
    const parent = tasks.find(t => t.id === parentId);
    if (parent) {
      setParentTask(parent);
      setEditingTask(null);
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
        parentId,
        completed: false
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subtask');
      }
      
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create subtask');
    }
  };

  // Tag operations
  const handleCreateTag = async (tagData: { name: string; color: string }) => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create tag');
      }
      
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create tag');
    }
  };

  const handleUpdateTag = async (tagId: string, tagData: { name: string; color: string }) => {
    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update tag');
      }
      
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update tag');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete tag');
      }
      
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  };

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(query);
      const matchesDescription = task.description?.toLowerCase().includes(query);
      const matchesTags = task.tags.some(t => t.tag.name.toLowerCase().includes(query));
      
      if (!matchesTitle && !matchesDescription && !matchesTags) {
        return false;
      }
    }
    
    return true;
  });

  // Statistics
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length,
    overdue: tasks.filter(t => 
      !t.completed && t.dueDate && new Date(t.dueDate) < new Date()
    ).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading TaskMaster...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
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
            
            {/* Management buttons moved to header */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowTagManager(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Settings className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Manage Tags</span>
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Filter className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Filter</span>
              </button>
              
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

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Main Content */}
          <div className="flex-1">
            {/* Add New Task Input - Full width */}
            <div className="mb-6">
              <InlineTaskForm
                onSubmit={handleTaskSubmit}
                availableTags={tags}
                isLoading={loading}
              />
            </div>

            {/* Filters Section */}
            <div className={`mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${showFilters ? 'block' : 'hidden'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">Filters</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={completedFilter}
                    onChange={(e) => setCompletedFilter(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Tasks</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* Priority filter */}
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

                {/* Tag filter */}
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
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
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
              </div>

              {/* Clear filters */}
              {(searchQuery || selectedTags.length > 0 || priorityFilter !== 'all' || completedFilter !== 'all') && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedTags([]);
                      setPriorityFilter('all');
                      setCompletedFilter('all');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 py-2 px-4 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
            
            {/* DISABLED: Conflict detection system - uncomment to re-enable */}
            {/* Conflict Alerts */}
            {/* {allConflicts.length > 0 && (
              <div className="mb-6">
                <ConflictAlert
                  conflicts={allConflicts}
                  onResolveConflict={handleResolveConflict}
                  onViewTask={handleViewTask}
                  className=""
                />
              </div>
            )} */}
            
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
              selectedTags={selectedTags}
              priorityFilter={priorityFilter}
              completedFilter={completedFilter}
              isLoading={loading}
            />
            </div>
          </div>
          
          {/* Right Column - Statistics */}
          <div className="w-full lg:w-80 lg:flex-shrink-0">
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
      />

      <TagManager
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
        tags={tags}
        onCreateTag={handleCreateTag}
        onUpdateTag={handleUpdateTag}
        onDeleteTag={handleDeleteTag}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onCancel={cancelTaskDelete}
        onConfirm={confirmTaskDelete}
        task={taskToDelete}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default HomePage;

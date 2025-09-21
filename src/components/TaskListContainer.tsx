import React, { useState, useEffect, useCallback } from 'react';
import { Task, Tag, TaskGroup, Priority } from '../types';
import { TaskItem } from './TaskItem';
import { TaskMultiSelect } from './TaskMultiSelect';
import { TaskGroupHeader } from './TaskGroupHeader';


import { Plus } from 'lucide-react';

interface TaskListContainerProps {
  tasks: Task[];
  availableTags: Tag[];
  availableGroups: TaskGroup[];
  isGroupedView?: boolean;
  isMultiSelectMode?: boolean;
  setIsMultiSelectMode?: (value: boolean) => void;
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onTaskEdit: (task: Task) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskDelete: (taskId: string) => void;
  onSubtaskCreate: (parentId: string, subtaskData: any) => Promise<void>;
  onBulkEdit: (taskIds: string[]) => void;
  onBulkDelete: (taskIds: string[]) => void;
}

/**
 * Componente TaskListContainer - Contenedor principal que orquesta todos los componentes de tareas
 * Refactorizado desde TaskList.tsx para mejorar la modularidad y mantenibilidad
 */
export const TaskListContainer: React.FC<TaskListContainerProps> = ({
  tasks,
  availableTags,
  availableGroups,
  isGroupedView = false,
  isMultiSelectMode = false,
  setIsMultiSelectMode,
  onTaskToggle,
  onTaskEdit,
  onTaskUpdate,
  onTaskDelete,
  onSubtaskCreate,
  onBulkEdit,
  onBulkDelete
}) => {
  // Estados para UI y interacciones
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingTasks, setEditingTasks] = useState<Set<string>>(new Set());
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [inlineEditingTasks, setInlineEditingTasks] = useState<Set<string>>(new Set());
  const [creatingSubtasks, setCreatingSubtasks] = useState<Set<string>>(new Set());
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const [animatingProgress, setAnimatingProgress] = useState<Set<string>>(new Set());
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());
  const [visibleHistory, setVisibleHistory] = useState<Set<string>>(new Set());
  const [hoveredTasks, setHoveredTasks] = useState<Set<string>>(new Set());
  const [clickedTasks, setClickedTasks] = useState<Set<string>>(new Set());
  
  // Estados para filtros
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectedPriorities, setSelectedPriorities] = useState<Set<Priority>>(new Set());
  const [showCompleted, setShowCompleted] = useState(true);
  const [showOverdue, setShowOverdue] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Efectos para debug y manejo de eventos globales
  useEffect(() => {
    console.log('TaskListContainer - Tasks updated:', tasks.length);
  }, [tasks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-context-menu]')) {
        setOpenMenus(new Set());
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Inicializar grupos expandidos por defecto
  useEffect(() => {
    if (availableGroups.length > 0) {
      const allGroupIds = new Set(availableGroups.map(group => group.id));
      // También incluir el grupo "Sin grupo" si hay tareas sin grupo
      const hasUngroupedTasks = tasks.some(task => !task.group);
      if (hasUngroupedTasks) {
        allGroupIds.add('ungrouped');
      }
      setExpandedGroups(allGroupIds);
    }
  }, [availableGroups, tasks]);

  // Funciones de utilidad para filtrado
  const isOverdue = (dueDate: string, completed: boolean) => {
    if (completed) return false;
    const today = new Date();
    const due = new Date(dueDate);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const isInDateRange = (task: Task, filter: 'all' | 'today' | 'week' | 'month') => {
    if (filter === 'all') return true;
    if (!task.dueDate && !task.startDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const taskDate = new Date(task.dueDate || task.startDate!);
    taskDate.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'today':
        return taskDate.getTime() === today.getTime();
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return taskDate >= weekStart && taskDate <= weekEnd;
      case 'month':
        return taskDate.getMonth() === today.getMonth() && taskDate.getFullYear() === today.getFullYear();
      default:
        return true;
    }
  };

  // Filtrado de tareas
  const filteredTasks = tasks.filter(task => {
    // Excluir subtareas - solo mostrar tareas principales
    if (task.parentId) return false;
    
    // Filtro por completado
    if (!showCompleted && task.completed) return false;
    
    // Filtro por vencidas
    if (showOverdue && (!task.dueDate || !isOverdue(task.dueDate, task.completed))) return false;
    
    // Filtro por etiquetas
    if (selectedTags.size > 0) {
      const taskTagIds = task.tags?.map(({ tag }) => tag.id) || [];
      if (!Array.from(selectedTags).some(tagId => taskTagIds.includes(tagId))) return false;
    }
    
    // Filtro por grupos
    if (selectedGroups.size > 0) {
      if (!task.group || !selectedGroups.has(task.group.id)) return false;
    }
    
    // Filtro por prioridades
    if (selectedPriorities.size > 0) {
      if (!selectedPriorities.has(task.priority)) return false;
    }
    
    // Filtro por fecha
    if (!isInDateRange(task, dateFilter)) return false;
    
    return true;
  });

  // Agrupación de tareas
  const groupedTasks = isGroupedView ? 
    filteredTasks.reduce((groups, task) => {
      const groupKey = task.group?.id || 'no-group';
      if (!groups[groupKey]) {
        groups[groupKey] = {
          group: task.group || null,
          tasks: []
        };
      }
      groups[groupKey].tasks.push(task);
      return groups;
    }, {} as Record<string, { group: TaskGroup | null; tasks: Task[] }>) : {};

  // Handlers para selección múltiple
  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  const exitMultiSelect = useCallback(() => {
    setIsMultiSelectMode?.(false);
    setSelectedTasks(new Set());
  }, [setIsMultiSelectMode]);

  // Handlers para expansión
  const toggleExpanded = useCallback((taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const toggleGroupExpanded = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  // Handlers para edición
  const startInlineEditing = useCallback((task: Task, event: React.MouseEvent) => {
    event.stopPropagation();
    setInlineEditingTasks(prev => new Set(prev).add(task.id));
  }, []);

  const cancelInlineEditing = useCallback((taskId: string) => {
    setInlineEditingTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
  }, []);

  const handleInlineTaskSave = useCallback(async (taskId: string, taskData: any) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (task && onTaskUpdate) {
        await onTaskUpdate(taskId, taskData);
        setInlineEditingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error saving task:', error);
    }
  }, [tasks, onTaskEdit]);

  // Handlers para subtareas
  const startCreatingSubtask = useCallback((taskId: string) => {
    setCreatingSubtasks(prev => new Set(prev).add(taskId));
  }, []);

  const cancelCreatingSubtask = useCallback((taskId: string) => {
    setCreatingSubtasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
  }, []);

  const handleSubtaskCreate = useCallback(async (parentId: string, subtaskData: any) => {
    try {
      await onSubtaskCreate(parentId, subtaskData);
      setCreatingSubtasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(parentId);
        return newSet;
      });
    } catch (error) {
      console.error('Error creating subtask:', error);
    }
  }, [onSubtaskCreate]);

  // Handlers para edición de título
  const startEditingTitle = useCallback((task: Task, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingTasks(prev => new Set(prev).add(task.id));
    setEditingValues(prev => ({ ...prev, [task.id]: task.title }));
  }, []);

  const saveEditingTitle = useCallback((taskId: string) => {
    const newTitle = editingValues[taskId]?.trim();
    if (newTitle && newTitle !== tasks.find(t => t.id === taskId)?.title) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        onTaskEdit({ ...task, title: newTitle });
      }
    }
    cancelEditingTitle(taskId);
  }, [editingValues, tasks, onTaskEdit]);

  const cancelEditingTitle = useCallback((taskId: string) => {
    setEditingTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
    setEditingValues(prev => {
      const newValues = { ...prev };
      delete newValues[taskId];
      return newValues;
    });
  }, []);

  const handleTitleKeyDown = useCallback((event: React.KeyboardEvent, taskId: string) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEditingTitle(taskId);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditingTitle(taskId);
    }
  }, [saveEditingTitle, cancelEditingTitle]);

  const handleTitleChange = useCallback((taskId: string, value: string) => {
    setEditingValues(prev => ({ ...prev, [taskId]: value }));
  }, []);

  // Handlers para menús y UI
  const toggleContextMenu = useCallback((taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenMenus(prev => {
      const newSet = new Set<string>();
      if (!prev.has(taskId)) {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

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

  const handleTaskHoverEnter = useCallback((taskId: string) => {
    setHoveredTasks(prev => new Set(prev).add(taskId));
  }, []);

  const handleTaskHoverLeave = useCallback(() => {
    setHoveredTasks(new Set());
  }, []);

  const toggleTaskClick = useCallback((taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setClickedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const handleTaskToggleWithAnimation = useCallback(async (taskId: string, completed: boolean) => {
    setCompletingTasks(prev => new Set(prev).add(taskId));
    
    try {
      await onTaskToggle(taskId, completed);
    } finally {
      setTimeout(() => {
        setCompletingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      }, 300);
    }
  }, [onTaskToggle]);

  // Handlers para filtros
  const handleTagFilterChange = useCallback((tagId: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  }, []);

  const handleGroupFilterChange = useCallback((groupId: string) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  const handlePriorityFilterChange = useCallback((priority: Priority) => {
    setSelectedPriorities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(priority)) {
        newSet.delete(priority);
      } else {
        newSet.add(priority);
      }
      return newSet;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedTags(new Set());
    setSelectedGroups(new Set());
    setSelectedPriorities(new Set());
    setShowCompleted(true);
    setShowOverdue(false);
    setDateFilter('all');
  }, []);

  // Handlers para acciones masivas
  const handleBulkEdit = useCallback(() => {
    // Convertir los IDs seleccionados a objetos Task completos
    const selectedTaskObjects = Array.from(selectedTasks)
      .map(taskId => tasks.find(task => task.id === taskId))
      .filter((task): task is Task => task !== undefined);
    
    console.log('🔧 TaskListContainer handleBulkEdit - Selected Task Objects:', selectedTaskObjects);
    onBulkEdit(selectedTaskObjects);
  }, [selectedTasks, onBulkEdit, tasks]);

  const handleBulkDelete = useCallback(() => {
    onBulkDelete(Array.from(selectedTasks));
    setSelectedTasks(new Set());
  }, [selectedTasks, onBulkDelete]);

  return (
    <div className="space-y-6">



      {/* Lista de tareas */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">No hay tareas que mostrar</div>
            <div className="text-gray-500 text-sm">
              {tasks.length === 0 
                ? 'Crea tu primera tarea para comenzar'
                : 'Ajusta los filtros para ver más tareas'
              }
            </div>
          </div>
        ) : isGroupedView ? (
          // Vista agrupada
          Object.entries(groupedTasks).map(([groupKey, { group, tasks: groupTasks }]) => {
            const isGroupExpanded = expandedGroups.has(groupKey);
            const completedCount = groupTasks.filter(task => task.completed).length;
            
            return (
              <div key={groupKey}>
                <TaskGroupHeader
                  group={group}
                  taskCount={groupTasks.length}
                  completedCount={completedCount}
                  isExpanded={isGroupExpanded}
                  onToggleExpanded={() => toggleGroupExpanded(groupKey)}
                />
                
                {isGroupExpanded && (
                  <div className="space-y-2">
                    {groupTasks.map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        availableTags={availableTags}
                        availableGroups={availableGroups}
                        isGroupedView={isGroupedView}
                        isMultiSelectMode={isMultiSelectMode}
                        selectedTasks={selectedTasks}
                        expandedTasks={expandedTasks}
                        editingTasks={editingTasks}
                        editingValues={editingValues}
                        inlineEditingTasks={inlineEditingTasks}
                        creatingSubtasks={creatingSubtasks}
                        completingTasks={completingTasks}
                        animatingProgress={animatingProgress}
                        openMenus={openMenus}
                        visibleHistory={visibleHistory}
                        hoveredTasks={hoveredTasks}
                        clickedTasks={clickedTasks}
                        onTaskToggle={onTaskToggle}
                        // onTaskEdit={onTaskEdit} // Removed to prevent modal duplication - using inline editing only
                        onTaskDelete={onTaskDelete}
                        onSubtaskCreate={onSubtaskCreate}
                        onToggleExpanded={toggleExpanded}
                        onToggleTaskSelection={toggleTaskSelection}
                        onStartInlineEditing={startInlineEditing}
                        onCancelInlineEditing={cancelInlineEditing}
                        onInlineTaskSave={handleInlineTaskSave}
                        onStartCreatingSubtask={startCreatingSubtask}
                        onCancelCreatingSubtask={cancelCreatingSubtask}
                        onHandleSubtaskCreate={handleSubtaskCreate}
                        onStartEditingTitle={startEditingTitle}
                        onSaveEditingTitle={saveEditingTitle}
                        onCancelEditingTitle={cancelEditingTitle}
                        onHandleTitleKeyDown={handleTitleKeyDown}
                        onHandleTitleChange={handleTitleChange}
                        onToggleContextMenu={toggleContextMenu}
                        onHandleHistoryToggle={handleHistoryToggle}
                        onHandleTaskHoverEnter={handleTaskHoverEnter}
                        onHandleTaskHoverLeave={handleTaskHoverLeave}
                        onToggleTaskClick={toggleTaskClick}
                        onHandleTaskToggleWithAnimation={handleTaskToggleWithAnimation}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // Vista normal
          filteredTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              availableTags={availableTags}
              availableGroups={availableGroups}
              isGroupedView={isGroupedView}
              isMultiSelectMode={isMultiSelectMode}
              selectedTasks={selectedTasks}
              expandedTasks={expandedTasks}
              editingTasks={editingTasks}
              editingValues={editingValues}
              inlineEditingTasks={inlineEditingTasks}
              creatingSubtasks={creatingSubtasks}
              completingTasks={completingTasks}
              animatingProgress={animatingProgress}
              openMenus={openMenus}
              visibleHistory={visibleHistory}
              hoveredTasks={hoveredTasks}
              clickedTasks={clickedTasks}
              onTaskToggle={onTaskToggle}
              // onTaskEdit={onTaskEdit} // Removed to prevent modal duplication - using inline editing only
              onTaskDelete={onTaskDelete}
              onSubtaskCreate={onSubtaskCreate}
              onToggleExpanded={toggleExpanded}
              onToggleTaskSelection={toggleTaskSelection}
              onStartInlineEditing={startInlineEditing}
              onCancelInlineEditing={cancelInlineEditing}
              onInlineTaskSave={handleInlineTaskSave}
              onStartCreatingSubtask={startCreatingSubtask}
              onCancelCreatingSubtask={cancelCreatingSubtask}
              onHandleSubtaskCreate={handleSubtaskCreate}
              onStartEditingTitle={startEditingTitle}
              onSaveEditingTitle={saveEditingTitle}
              onCancelEditingTitle={cancelEditingTitle}
              onHandleTitleKeyDown={handleTitleKeyDown}
              onHandleTitleChange={handleTitleChange}
              onToggleContextMenu={toggleContextMenu}
              onHandleHistoryToggle={handleHistoryToggle}
              onHandleTaskHoverEnter={handleTaskHoverEnter}
              onHandleTaskHoverLeave={handleTaskHoverLeave}
              onToggleTaskClick={toggleTaskClick}
              onHandleTaskToggleWithAnimation={handleTaskToggleWithAnimation}
            />
          ))
        )}
      </div>



      {/* Componente de selección múltiple */}
      <TaskMultiSelect
        isMultiSelectMode={isMultiSelectMode}
        selectedTasks={selectedTasks}
        tasks={filteredTasks}
        onClearSelection={clearSelection}
        onBulkEdit={handleBulkEdit}
        onBulkDelete={handleBulkDelete}
        onExitMultiSelect={exitMultiSelect}
      />
    </div>
  );
};
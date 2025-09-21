import React, { useEffect, useCallback } from 'react';
import { Task, Tag, TaskGroup, Priority } from '../types';
import { TaskItem } from './TaskItem';
import { TaskMultiSelect } from './TaskMultiSelect';
import { TaskGroupHeader } from './TaskGroupHeader';
import { useTaskStore } from '../stores/useTaskStore';
import { useFilterStore } from '../stores/useFilterStore';

import { Plus } from 'lucide-react';

interface TaskListContainerProps {
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
  onTaskToggle,
  onTaskEdit,
  onTaskUpdate,
  onTaskDelete,
  onSubtaskCreate,
  onBulkEdit,
  onBulkDelete
}) => {
  // Usar stores de Zustand
  const {
    tasks,
    availableTags,
    availableGroups,
    isGroupedView,
    isMultiSelectMode,
    setIsMultiSelectMode,
    ui: {
      selectedTasks,
      expandedTasks,
      expandedGroups,
      editingTasks,
      editingValues,
      inlineEditingTasks,
      creatingSubtasks,
      completingTasks,
      animatingProgress,
      openMenus,
      visibleHistory,
      hoveredTasks,
      clickedTasks
    },
    filters: {
      selectedTags: selectedTagsFilter,
      selectedGroups: selectedGroupsFilter,
      selectedPriorities,
      showCompleted,
      showOverdue,
      dateFilter
    },
    // Acciones de UI
    setSelectedTasks,
    toggleTaskSelection,
    selectAllTasks,
    clearSelectedTasks,
    setExpandedTasks,
    toggleTaskExpansion,
    setExpandedGroups,
    toggleGroupExpansion,
    setEditingTasks,
    toggleTaskEditing,
    setEditingValues,
     updateEditingValue,
     addEditingTask,
     removeEditingTask,
     setEditingValue,
     removeEditingValue,
    setInlineEditingTasks,
    removeInlineEditingTask,
    toggleInlineEditing,
    setCreatingSubtasks,
      toggleSubtaskCreation,
      addCreatingSubtask,
      removeCreatingSubtask,
    setCompletingTasks,
    toggleTaskCompletion,
    setAnimatingProgress,
    toggleProgressAnimation,
    setOpenMenus,
     toggleMenu,
     closeAllMenus,
     setOpenMenu,
     addHoveredTask,
     clearHoveredTasks,
     addCompletingTask,
     removeCompletingTask,
    setVisibleHistory,
     toggleHistoryVisibility,
     toggleVisibleHistory,
    setHoveredTasks,
    toggleTaskHover,
    setClickedTasks,
    toggleTaskClick,
    getFilteredTasks
  } = useTaskStore();

  // Desestructuración del FilterStore
  const {
    toggleTagFilter: toggleSelectedTag,
    toggleGroupFilter: toggleSelectedGroup,
    togglePriorityFilter: toggleSelectedPriority,
    clearAllFilters
  } = useFilterStore();

  // Efectos para debug y manejo de eventos globales
  useEffect(() => {
    console.log('TaskListContainer - Tasks updated:', tasks.length);
  }, [tasks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-context-menu]')) {
        closeAllMenus();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [closeAllMenus]);

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
  }, [availableGroups, tasks, setExpandedGroups]);

  // Obtener tareas filtradas del store
  const filteredTasks = getFilteredTasks().filter(task => {
    // Excluir subtareas - solo mostrar tareas principales
    return !task.parentId;
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



  // Handlers para selección múltiple - usando función del store

  const clearSelection = useCallback(() => {
    clearSelectedTasks();
  }, [clearSelectedTasks]);

  const exitMultiSelect = useCallback(() => {
    setIsMultiSelectMode?.(false);
    clearSelectedTasks();
  }, [setIsMultiSelectMode, clearSelectedTasks]);

  // Handlers para expansión
  const toggleExpanded = useCallback((taskId: string) => {
    toggleTaskExpansion(taskId);
  }, [toggleTaskExpansion]);

  const toggleGroupExpanded = useCallback((groupId: string) => {
    toggleGroupExpansion(groupId);
  }, [toggleGroupExpansion]);

  // Handlers para edición
  const startInlineEditing = useCallback((task: Task, event: React.MouseEvent) => {
    event.stopPropagation();
    setInlineEditingTasks(prev => new Set(prev).add(task.id));
  }, []);

  const cancelInlineEditing = useCallback((taskId: string) => {
    removeInlineEditingTask(taskId);
  }, [removeInlineEditingTask]);

  const handleInlineTaskSave = useCallback(async (taskId: string, taskData: any) => {
    console.log('🔥 TaskListContainer - handleInlineTaskSave called', { taskId, taskData });
    console.log('🔍 TaskListContainer - Available tasks:', tasks.map(t => ({ id: t.id, title: t.title })));
    try {
      const task = tasks.find(t => t.id === taskId);
      console.log('🔍 TaskListContainer - Found task:', task);
      console.log('🔍 TaskListContainer - onTaskUpdate available:', !!onTaskUpdate);
      
      if (onTaskUpdate) {
        console.log('✅ TaskListContainer - Calling onTaskUpdate directly (bypassing task check)...');
        await onTaskUpdate(taskId, taskData);
        console.log('✅ TaskListContainer - onTaskUpdate completed, removing from inline editing');
        removeInlineEditingTask(taskId);
        console.log('✅ TaskListContainer - Task removed from inline editing');
      } else {
        console.log('❌ TaskListContainer - Missing onTaskUpdate function');
      }
    } catch (error) {
      console.error('❌ TaskListContainer - Error saving task:', error);
    }
  }, [tasks, onTaskUpdate, removeInlineEditingTask]);

  // Handlers para subtareas
  const startCreatingSubtask = useCallback((taskId: string) => {
    addCreatingSubtask(taskId);
  }, [addCreatingSubtask]);

  const cancelCreatingSubtask = useCallback((taskId: string) => {
    removeCreatingSubtask(taskId);
  }, [removeCreatingSubtask]);

  const handleSubtaskCreate = useCallback(async (parentId: string, subtaskData: any) => {
    try {
      await onSubtaskCreate(parentId, subtaskData);
      removeCreatingSubtask(parentId);
    } catch (error) {
      console.error('Error creating subtask:', error);
    }
  }, [onSubtaskCreate, removeCreatingSubtask]);

  // Handlers para edición de título
  const startEditingTitle = useCallback((task: Task, event: React.MouseEvent) => {
    event.stopPropagation();
    addEditingTask(task.id);
    setEditingValue(task.id, task.title);
  }, [addEditingTask, setEditingValue]);

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
    removeEditingTask(taskId);
    removeEditingValue(taskId);
  }, [removeEditingTask, removeEditingValue]);

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
    setEditingValue(taskId, value);
  }, [setEditingValue]);

  // Handlers para menús y UI
  const toggleContextMenu = useCallback((taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (openMenus.has(taskId)) {
      closeAllMenus();
    } else {
      setOpenMenu(taskId);
    }
  }, [openMenus, closeAllMenus, setOpenMenu]);

  const handleHistoryToggle = useCallback((taskId: string) => {
    toggleVisibleHistory(taskId);
  }, [toggleVisibleHistory]);

  const handleTaskHoverEnter = useCallback((taskId: string) => {
    addHoveredTask(taskId);
  }, [addHoveredTask]);

  const handleTaskHoverLeave = useCallback(() => {
    clearHoveredTasks();
  }, [clearHoveredTasks]);

  // toggleTaskClick viene del store de Zustand

  const handleTaskToggleWithAnimation = useCallback(async (taskId: string, completed: boolean) => {
    addCompletingTask(taskId);
    
    try {
      await onTaskToggle(taskId, completed);
    } finally {
      setTimeout(() => {
        removeCompletingTask(taskId);
      }, 300);
    }
  }, [onTaskToggle, addCompletingTask, removeCompletingTask]);

  // Handlers para filtros
  const handleTagFilterChange = useCallback((tagId: string) => {
    toggleSelectedTag(tagId);
  }, [toggleSelectedTag]);

  const handleGroupFilterChange = useCallback((groupId: string) => {
    toggleSelectedGroup(groupId);
  }, [toggleSelectedGroup]);

  const handlePriorityFilterChange = useCallback((priority: Priority) => {
    toggleSelectedPriority(priority);
  }, [toggleSelectedPriority]);

  const clearAllFiltersHandler = useCallback(() => {
    clearAllFilters();
  }, [clearAllFilters]);

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
    clearSelectedTasks();
  }, [selectedTasks, onBulkDelete, clearSelectedTasks]);

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
            const isGroupExpanded = expandedGroups instanceof Set ? expandedGroups.has(groupKey) : false;
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
                        onTaskToggle={handleTaskToggleWithAnimation}
                        onTaskEdit={onTaskEdit}
                        onTaskDelete={onTaskDelete}
                        onSubtaskCreate={onSubtaskCreate}
                        onInlineTaskSave={handleInlineTaskSave}
                        onHandleSubtaskCreate={handleSubtaskCreate}
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
              onTaskToggle={handleTaskToggleWithAnimation}
              onTaskEdit={onTaskEdit}
              onTaskDelete={onTaskDelete}
              onSubtaskCreate={onSubtaskCreate}
              onInlineTaskSave={handleInlineTaskSave}
              onHandleSubtaskCreate={handleSubtaskCreate}
              onHandleTaskToggleWithAnimation={handleTaskToggleWithAnimation}
            />
          ))
        )}
      </div>



      {/* Componente de selección múltiple */}
      <TaskMultiSelect
        tasks={filteredTasks}
        onBulkEdit={handleBulkEdit}
        onBulkDelete={handleBulkDelete}
      />
    </div>
  );
};
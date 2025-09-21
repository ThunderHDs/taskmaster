'use client';

import React from 'react';
import { Task, Tag, TaskGroup } from '../types';
import { TaskListContainer } from './TaskListContainer';

interface TaskListProps {
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
 * Componente TaskList - Wrapper del TaskListContainer para mantener compatibilidad
 * 
 * Este componente actúa como un wrapper del nuevo TaskListContainer refactorizado,
 * manteniendo la misma interfaz pública para no romper la compatibilidad con
 * el resto de la aplicación.
 * 
 * La lógica completa ha sido movida a TaskListContainer.tsx para mejorar
 * la modularidad y mantenibilidad del código.
 */
export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  availableTags,
  availableGroups,
  isGroupedView = false,
  isMultiSelectMode,
  setIsMultiSelectMode,
  onTaskToggle,
  onTaskEdit,
  onTaskUpdate,
  onTaskDelete,
  onSubtaskCreate,
  onBulkEdit,
  onBulkDelete
}) => {
  return (
    <TaskListContainer
      tasks={tasks}
      availableTags={availableTags}
      availableGroups={availableGroups}
      isGroupedView={isGroupedView}
      isMultiSelectMode={isMultiSelectMode}
      setIsMultiSelectMode={setIsMultiSelectMode}
      onTaskToggle={onTaskToggle}
      onTaskEdit={onTaskEdit}
      onTaskUpdate={onTaskUpdate}
      onTaskDelete={onTaskDelete}
      onSubtaskCreate={onSubtaskCreate}
      onBulkEdit={onBulkEdit}
      onBulkDelete={onBulkDelete}
    />
  );
};

export default TaskList;
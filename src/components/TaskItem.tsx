import React from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Tag, 
  AlertCircle, 
  Clock, 
  Calendar, 
  CheckSquare, 
  History, 
  MoreVertical 
} from 'lucide-react';
import { Task, Tag as TagType, TaskGroup, Priority } from '../types';
import { InlineTaskEditForm } from './InlineTaskEditForm';
import { SubtaskCreateForm } from './SubtaskCreateForm';
import { TaskHistory } from './TaskHistory';

interface TaskItemProps {
  task: Task;
  level?: number;
  availableTags: TagType[];
  availableGroups: TaskGroup[];
  isGroupedView?: boolean;
  isMultiSelectMode: boolean;
  selectedTasks: Set<string>;
  expandedTasks: Set<string>;
  editingTasks: Set<string>;
  editingValues: Record<string, string>;
  inlineEditingTasks: Set<string>;
  creatingSubtasks: Set<string>;
  completingTasks: Set<string>;
  animatingProgress: Set<string>;
  openMenus: Set<string>;
  visibleHistory: Set<string>;
  hoveredTasks: Set<string>;
  clickedTasks: Set<string>;
  
  // Event handlers
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onSubtaskCreate: (parentId: string, subtaskData: any) => Promise<void>;
  onToggleExpanded: (taskId: string) => void;
  onToggleTaskSelection: (taskId: string) => void;
  onStartInlineEditing: (task: Task, event: React.MouseEvent) => void;
  onCancelInlineEditing: (taskId: string) => void;
  onInlineTaskSave: (taskId: string, taskData: any) => void;
  onStartCreatingSubtask: (taskId: string) => void;
  onCancelCreatingSubtask: (taskId: string) => void;
  onHandleSubtaskCreate: (parentId: string, subtaskData: any) => Promise<void>;
  onStartEditingTitle: (task: Task, event: React.MouseEvent) => void;
  onSaveEditingTitle: (taskId: string) => void;
  onCancelEditingTitle: (taskId: string) => void;
  onHandleTitleKeyDown: (event: React.KeyboardEvent, taskId: string) => void;
  onHandleTitleChange: (taskId: string, value: string) => void;
  onToggleContextMenu: (taskId: string, event: React.MouseEvent) => void;
  onHandleHistoryToggle: (taskId: string) => void;
  onHandleTaskHoverEnter: (taskId: string) => void;
  onHandleTaskHoverLeave: () => void;
  onToggleTaskClick: (taskId: string, event: React.MouseEvent) => void;
  onHandleTaskToggleWithAnimation: (taskId: string, completed: boolean) => void;
}

/**
 * Componente TaskItem - Renderiza una tarea individual con todas sus funcionalidades
 * Extraído de TaskList.tsx para mejorar la modularidad y mantenibilidad
 */
export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  level = 0,
  availableTags,
  availableGroups,
  isGroupedView = false,
  isMultiSelectMode,
  selectedTasks,
  expandedTasks,
  editingTasks,
  editingValues,
  inlineEditingTasks,
  creatingSubtasks,
  completingTasks,
  animatingProgress,
  openMenus,
  visibleHistory,
  hoveredTasks,
  clickedTasks,
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  onSubtaskCreate,
  onToggleExpanded,
  onToggleTaskSelection,
  onStartInlineEditing,
  onCancelInlineEditing,
  onInlineTaskSave,
  onStartCreatingSubtask,
  onCancelCreatingSubtask,
  onHandleSubtaskCreate,
  onStartEditingTitle,
  onSaveEditingTitle,
  onCancelEditingTitle,
  onHandleTitleKeyDown,
  onHandleTitleChange,
  onToggleContextMenu,
  onHandleHistoryToggle,
  onHandleTaskHoverEnter,
  onHandleTaskHoverLeave,
  onToggleTaskClick,
  onHandleTaskToggleWithAnimation
}) => {
  
  /**
   * Obtiene el color de texto según la prioridad de la tarea
   */
  const getPriorityTextColor = (priority: Priority) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  /**
   * Formatea un rango de fechas para mostrar en la interfaz
   */
  const formatDateRange = (startDate?: string, endDate?: string, originalDueDate?: string, completed?: boolean) => {
    if (!startDate && !endDate) return null;
    
    const formatDateShort = (dateString: string) => {
      const date = new Date(dateString);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      return { month, day, fullDate: `${day} ${month}` };
    };
    
    if (!startDate && endDate) {
      const { fullDate } = formatDateShort(endDate);
      
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
    
    if (startDate && !endDate) {
      const { fullDate } = formatDateShort(startDate);
      return `From ${fullDate}`;
    }
    
    if (startDate && endDate) {
      const start = formatDateShort(startDate);
      const end = formatDateShort(endDate);
      
      if (completed && originalDueDate && originalDueDate !== endDate) {
        const originalEnd = formatDateShort(originalDueDate);
        
        if (startDate === endDate) {
          return (
            <span>
              <span className="line-through text-gray-400">{start.fullDate} - {originalEnd.fullDate}</span>{' '}
              <span className="text-green-600 font-medium">{start.fullDate} - {end.fullDate}</span>
            </span>
          );
        }
        
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
        
        return (
          <span>
            <span className="line-through text-gray-400">{start.fullDate} - {originalEnd.fullDate}</span>{' '}
            <span className="text-green-600 font-medium">{start.fullDate} - {end.fullDate}</span>
          </span>
        );
      }
      
      if (startDate === endDate) {
        return start.fullDate;
      }
      
      if (start.month === end.month) {
        return `${start.day}-${end.day} ${start.month}`;
      }
      
      return `${start.fullDate} - ${end.fullDate}`;
    }
    
    return null;
  };

  /**
   * Verifica si una tarea está vencida
   */
  const isOverdue = (dueDate: string, completed: boolean) => {
    if (completed) return false;
    const today = new Date();
    const due = new Date(dueDate);
    
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    return due < today;
  };

  /**
   * Verifica si una tarea está en su último día
   */
  const isLastDay = (dueDate: string, completed: boolean) => {
    if (completed) return false;
    const today = new Date();
    const due = new Date(dueDate);
    
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    return due.getTime() === today.getTime();
  };

  /**
   * Calcula el porcentaje de progreso de las subtareas
   */
  const calculateSubtaskProgress = (subtasks: Task[]) => {
    if (!subtasks || subtasks.length === 0) return 0;
    const completedCount = subtasks.filter(subtask => subtask.completed).length;
    return Math.round((completedCount / subtasks.length) * 100);
  };

  /**
   * Genera los estilos CSS para la barra de progreso
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

  // Variables de estado para esta tarea específica
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const isExpanded = expandedTasks.has(task.id);
  const overdue = task.dueDate && isOverdue(task.dueDate, task.completed);
  const lastDay = task.dueDate && isLastDay(task.dueDate, task.completed);
  const subtaskProgress = hasSubtasks ? calculateSubtaskProgress(task.subtasks) : 0;
  const progressBarStyles = hasSubtasks ? getProgressBarStyles(subtaskProgress, task.id) : {};

  return (
    <div key={task.id} className={`${level > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div 
        className={`bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-300 ${
          task.completed ? 'opacity-75' : ''
        } ${overdue ? 'border-red-300 bg-red-50' : lastDay ? 'border-orange-300 bg-orange-50' : ''} ${
          completingTasks.has(task.id) ? 'transform scale-105 bg-green-50 border-green-300 shadow-lg' : ''
        }`}
        style={progressBarStyles}
        data-task-container
        onMouseEnter={() => onHandleTaskHoverEnter(task.id)}
        onMouseLeave={onHandleTaskHoverLeave}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest('[data-title-clickable]') && !target.closest('[data-editing-input]')) {
            onToggleTaskClick(task.id, e);
          }
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {isMultiSelectMode && (
              <div className="mt-1">
                <input
                  type="checkbox"
                  checked={selectedTasks.has(task.id)}
                  onChange={() => onToggleTaskSelection(task.id)}
                  className="w-4 h-4 text-blue-600 bg-blue-100 border-blue-300 rounded focus:ring-blue-500 focus:ring-2 transition-all duration-200 cursor-pointer"
                />
              </div>
            )}
            
            {hasSubtasks && (
              <button
                onClick={() => onToggleExpanded(task.id)}
                className="mt-1 p-1 hover:bg-gray-100 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            )}

            <div className="mt-1">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={(e) => {
                  if (task.id && typeof task.id === 'string' && task.id.trim() !== '') {
                    onHandleTaskToggleWithAnimation(task.id, e.target.checked);
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

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                {editingTasks.has(task.id) ? (
                  <input
                    type="text"
                    value={editingValues[task.id] || ''}
                    onChange={(e) => onHandleTitleChange(task.id, e.target.value)}
                    onKeyDown={(e) => onHandleTitleKeyDown(e, task.id)}
                    onBlur={() => onSaveEditingTitle(task.id)}
                    className={`text-sm font-medium bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded px-1 -mx-1 ${
                      task.completed ? 'line-through text-gray-500' : getPriorityTextColor(task.priority)
                    }`}
                    autoFocus
                    data-editing-input
                  />
                ) : (
                  <h3 
                    className={`text-sm font-medium cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1 transition-colors ${
                      task.completed ? 'line-through text-gray-500' : getPriorityTextColor(task.priority)
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartInlineEditing(task, e);
                    }}
                    data-title-clickable
                  >
                    {task.title}
                  </h3>
                )}
                
                <div className="flex items-center space-x-2">
                  {task.tags && task.tags.length > 0 && (
                    <>
                      {task.tags.map(({ tag }) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag.name}
                        </span>
                      ))}
                    </>
                  )}
                  
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

              {task.description && (
                <p className={`text-sm text-gray-600 mb-2 ${
                  task.completed ? 'line-through' : ''
                }`}>
                  {task.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 ml-4">
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              {(task.startDate || task.dueDate) && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span className={overdue ? 'text-red-600 font-medium' : lastDay ? 'text-orange-600 font-medium' : ''}>
                    {formatDateRange(task.startDate, task.dueDate, task.originalDueDate, task.completed)}
                  </span>
                </div>
              )}
              
              {hasSubtasks && (
                <div className="flex items-center space-x-1">
                  <CheckSquare className="w-3 h-3" />
                  <span>
                    {task.subtasks && task.subtasks.filter(st => st.completed).length}/{task.subtasks && task.subtasks.length} subtasks
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {!task.parentId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onHandleHistoryToggle(task.id);
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
              
              <div className="relative" data-context-menu>
                <button
                  onClick={(e) => onToggleContextMenu(task.id, e)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded hover:bg-gray-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              
                {openMenus.has(task.id) && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[100px]">
                    <button
                      onClick={(e) => {
                        onStartInlineEditing(task, e);
                        // Cerrar menú - esto se manejará en el componente padre
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskDelete(task.id);
                        // Cerrar menú - esto se manejará en el componente padre
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

        {inlineEditingTasks.has(task.id) && (
          <div className="mt-4 border-t pt-4" data-inline-edit-form>
            <InlineTaskEditForm
              task={task}
              availableTags={availableTags}
              availableGroups={availableGroups}
              onSave={(taskData) => onInlineTaskSave(task.id, taskData)}
              onCancel={() => onCancelInlineEditing(task.id)}
            />
          </div>
        )}

        {creatingSubtasks.has(task.id) && (
          <div className="mt-4 border-t pt-4">
            <SubtaskCreateForm
              parentTask={task}
              availableTags={availableTags}
              availableGroups={availableGroups}
              onSave={(subtaskData) => onHandleSubtaskCreate(task.id, subtaskData)}
              onCancel={() => onCancelCreatingSubtask(task.id)}
            />
          </div>
        )}

        {/* Historial de la tarea - se muestra justo debajo de la tarea */}
        {visibleHistory.has(task.id) && !task.parentId && (
          <div className="mt-4 border-t pt-4">
            <TaskHistory
              taskId={task.id}
              isVisible={true}
              onClose={() => onHandleHistoryToggle(task.id)}
            />
          </div>
        )}

        {hasSubtasks && isExpanded && (
          <div className="mt-4 space-y-2">
            {task.subtasks?.map((subtask) => (
              <TaskItem
                key={subtask.id}
                task={subtask}
                level={level + 1}
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
                onTaskEdit={onTaskEdit}
                onTaskDelete={onTaskDelete}
                onSubtaskCreate={onSubtaskCreate}
                onToggleExpanded={onToggleExpanded}
                onToggleTaskSelection={onToggleTaskSelection}
                onStartInlineEditing={onStartInlineEditing}
                onCancelInlineEditing={onCancelInlineEditing}
                onInlineTaskSave={onInlineTaskSave}
                onStartCreatingSubtask={onStartCreatingSubtask}
                onCancelCreatingSubtask={onCancelCreatingSubtask}
                onHandleSubtaskCreate={onHandleSubtaskCreate}
                onStartEditingTitle={onStartEditingTitle}
                onSaveEditingTitle={onSaveEditingTitle}
                onCancelEditingTitle={onCancelEditingTitle}
                onHandleTitleKeyDown={onHandleTitleKeyDown}
                onHandleTitleChange={onHandleTitleChange}
                onToggleContextMenu={onToggleContextMenu}
                onHandleHistoryToggle={onHandleHistoryToggle}
                onHandleTaskHoverEnter={onHandleTaskHoverEnter}
                onHandleTaskHoverLeave={onHandleTaskHoverLeave}
                onToggleTaskClick={onToggleTaskClick}
                onHandleTaskToggleWithAnimation={onHandleTaskToggleWithAnimation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
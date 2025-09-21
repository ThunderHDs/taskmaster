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
  MoreVertical,
  Plus
} from 'lucide-react';
import { Task, Tag as TagType, TaskGroup, Priority } from '../types';
import { InlineTaskEditForm } from './InlineTaskEditForm';
import { SubtaskCreateForm } from './SubtaskCreateForm';
import { TaskHistory } from './TaskHistory';
import { useUIStore } from '../stores/useUIStore';
import { useTaskStore } from '../stores/useTaskStore';
import { canHaveSubtasks } from '../lib/utils';

interface TaskItemProps {
  task: Task;
  level?: number;
  availableTags: TagType[];
  availableGroups: TaskGroup[];
  isGroupedView?: boolean;
  
  // Event handlers que no están en el store
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onSubtaskCreate: (parentId: string, subtaskData: any) => Promise<void>;
  onToggleExpanded?: (taskId: string) => void;
  onInlineTaskSave: (taskId: string, taskData: any) => void;
  onHandleSubtaskCreate: (parentId: string, subtaskData: any) => Promise<void>;
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
  onTaskToggle,
  onTaskEdit,
  onTaskDelete,
  onSubtaskCreate,
  onToggleExpanded,
  onInlineTaskSave,
  onHandleSubtaskCreate,
  onHandleTaskToggleWithAnimation
}) => {
  
  // Obtener estado y acciones del store de tareas
  const {
    // Estados UI generales
    isMultiSelectMode,
    tasks, // Necesario para calcular niveles de profundidad
    // Acciones UI generales
    toggleTaskSelection
  } = useTaskStore();
  
  // Obtener estado y acciones del store de tareas
  const {
    ui: {
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
      clickedTasks
    },
    // Acciones
     toggleTaskExpansion: toggleExpandedTask,
     addEditingTask,
     removeEditingTask,
     setEditingValue,
     removeEditingValue,
     toggleInlineEditing,
     removeInlineEditingTask,
     addCreatingSubtask,
     removeCreatingSubtask,
     setOpenMenu,
     closeAllMenus,
     toggleVisibleHistory,
     addHoveredTask,
     clearHoveredTasks,
     toggleTaskClick
   } = useTaskStore();
  
  // Función por defecto para toggle expanded si no se proporciona
  const handleToggleExpanded = onToggleExpanded || ((taskId: string) => toggleExpandedTask(taskId));
  
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

  // Handlers locales que usan las acciones del store
  const handleToggleTaskSelection = () => toggleTaskSelection(task.id);
  const handleStartInlineEditing = (event: React.MouseEvent) => {
    event.stopPropagation();
    toggleInlineEditing(task.id);
  };
  const handleCancelInlineEditing = () => removeInlineEditingTask(task.id);
  const handleStartCreatingSubtask = () => addCreatingSubtask(task.id);
  const handleCancelCreatingSubtask = () => removeCreatingSubtask(task.id);
  const handleStartEditingTitle = (event: React.MouseEvent) => {
    event.stopPropagation();
    addEditingTask(task.id);
    setEditingValue(task.id, task.title);
  };
  const handleSaveEditingTitle = () => {
    removeEditingTask(task.id);
    removeEditingValue(task.id);
  };
  const handleCancelEditingTitle = () => {
    removeEditingTask(task.id);
    removeEditingValue(task.id);
  };
  const handleTitleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSaveEditingTitle();
    } else if (event.key === 'Escape') {
      handleCancelEditingTitle();
    }
  };
  const handleTitleChange = (value: string) => setEditingValue(task.id, value);
  const handleToggleContextMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (openMenus.has(task.id)) {
      closeAllMenus();
    } else {
      setOpenMenu(task.id);
    }
  };
  const handleHistoryToggle = () => toggleVisibleHistory(task.id);
  const handleTaskHoverEnter = () => addHoveredTask(task.id);
  const handleTaskHoverLeave = () => clearHoveredTasks();
  const handleToggleTaskClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    toggleTaskClick(task.id, event);
  };

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
        onMouseEnter={handleTaskHoverEnter}
        onMouseLeave={handleTaskHoverLeave}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest('[data-title-clickable]') && !target.closest('[data-editing-input]')) {
            handleToggleTaskClick(e);
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
                  onChange={handleToggleTaskSelection}
                  className="w-4 h-4 text-blue-600 bg-blue-100 border-blue-300 rounded focus:ring-blue-500 focus:ring-2 transition-all duration-200 cursor-pointer"
                />
              </div>
            )}
            
            {hasSubtasks && (
              <button
                onClick={() => handleToggleExpanded(task.id)}
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
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    onBlur={handleSaveEditingTitle}
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
                    onClick={handleStartInlineEditing}
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
                  onClick={handleHistoryToggle}
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
              
              {/* Botón para agregar subtarea - fuera del menú contextual */}
              {canHaveSubtasks(task, tasks) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addCreatingSubtask(task.id);
                  }}
                  className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors rounded"
                  title="Agregar subtarea"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              
              <div className="relative" data-context-menu>
                <button
                  onClick={handleToggleContextMenu}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded hover:bg-gray-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              
                {openMenus.has(task.id) && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[120px]">
                    <button
                      onClick={handleStartInlineEditing}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskDelete(task.id);
                        closeAllMenus();
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
              onCancel={handleCancelInlineEditing}
            />
          </div>
        )}

        {creatingSubtasks.has(task.id) && (
          <div className="mt-4 border-t pt-4">
            <SubtaskCreateForm
              parentTask={task}
              availableTags={availableTags}
              availableGroups={availableGroups}
              onSave={onHandleSubtaskCreate}
              onCancel={handleCancelCreatingSubtask}
            />
          </div>
        )}

        {/* Historial de la tarea - se muestra justo debajo de la tarea */}
        {visibleHistory.has(task.id) && !task.parentId && (
          <div className="mt-4 border-t pt-4">
            <TaskHistory
              taskId={task.id}
              isVisible={true}
              onClose={handleHistoryToggle}
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
                onToggleExpanded={handleToggleExpanded}
                onInlineTaskSave={onInlineTaskSave}
                onHandleSubtaskCreate={onHandleSubtaskCreate}
                onHandleTaskToggleWithAnimation={onHandleTaskToggleWithAnimation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
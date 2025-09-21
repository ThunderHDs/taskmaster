import React from 'react';
import { ChevronDown, ChevronRight, Calendar, Tag as TagIcon, Users, AlertTriangle } from 'lucide-react';

// Interfaces
interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TaskGroup {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: string;
  dueDate?: string;
  tags: Tag[];
  group?: TaskGroup;
  subtasks: Task[];
  parentId?: string;
}

interface BulkUpdateData {
  title?: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: string;
  dueDate?: string;
  groupId?: string;
  tagIds?: string[];
  completed?: boolean;
}

interface IndividualTaskData {
  [taskId: string]: Partial<BulkUpdateData>;
}

interface BulkEditPreviewProps {
  tasks: Task[];
  individualMode: Record<string, boolean>;
  expandedTasks: Set<string>;
  subtaskEdits: Record<string, Partial<Task>>;
  onExpandedTasksChange: (expanded: Set<string>) => void;
  onSubtaskEditChange: (taskId: string, field: keyof Task, value: any) => void;
}

const BulkEditPreview: React.FC<BulkEditPreviewProps> = ({
  tasks,
  individualMode,
  expandedTasks,
  subtaskEdits,
  onExpandedTasksChange,
  onSubtaskEditChange
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'URGENT': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'Baja';
      case 'MEDIUM': return 'Media';
      case 'HIGH': return 'Alta';
      case 'URGENT': return 'Urgente';
      default: return priority;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Sin fecha';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const groupSimilarTasks = () => {
    const grouped = new Map<string, Task[]>();
    const unique: Task[] = [];

    tasks.forEach(task => {
      // Crear una clave basada en características similares
      const key = `${task.priority}-${task.group?.id || 'no-group'}-${task.tags.map(t => t.id).sort().join(',')}`;
      
      if (grouped.has(key)) {
        grouped.get(key)!.push(task);
      } else {
        grouped.set(key, [task]);
      }
    });

    const similarGroups: [string, Task[]][] = [];
    
    grouped.forEach((tasks, key) => {
      if (tasks.length > 1) {
        similarGroups.push([key, tasks]);
      } else {
        unique.push(...tasks);
      }
    });

    return { similarGroups, uniqueTasks: unique };
  };

  const renderTaskHierarchy = (task: Task, level: number = 0): React.ReactNode => {
    const isExpanded = expandedTasks.has(task.id);
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const isParentTask = level === 0 && hasSubtasks;

    return (
      <div key={task.id} className={`${level > 0 ? 'ml-6 border-l-2 border-blue-200 pl-4' : ''}`}>
        <div 
          className={`${
            isParentTask 
              ? 'bg-gray-50 rounded-lg border border-gray-300 p-3 mb-3' 
              : 'bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-300'
          } ${
            task.completed ? 'opacity-75' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {/* Botón de expandir/colapsar para tareas con subtareas */}
              {hasSubtasks && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const newExpanded = new Set(expandedTasks);
                    if (isExpanded) {
                      newExpanded.delete(task.id);
                    } else {
                      newExpanded.add(task.id);
                    }
                    onExpandedTasksChange(newExpanded);
                  }}
                  className="mt-1 p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              )}

              {/* Contenido principal de la tarea */}
              <div className="flex-1 min-w-0">
                {isParentTask ? (
                  // Vista simplificada para tareas padre
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium text-gray-700">
                      {task.title}
                    </h3>
                    {hasSubtasks && (
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} subtareas
                      </span>
                    )}
                  </div>
                ) : (
                  // Vista completa y editable para subtareas
                  <div>
                    {/* Título editable de la subtarea */}
                    <div className="flex items-center space-x-2 mb-3">
                      <input
                        type="checkbox"
                        checked={subtaskEdits[task.id]?.completed ?? task.completed}
                        onChange={(e) => {
                          onSubtaskEditChange(task.id, 'completed', e.target.checked);
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 transition-all duration-200"
                      />
                      <input
                        type="text"
                        value={subtaskEdits[task.id]?.title ?? task.title}
                        onChange={(e) => {
                          onSubtaskEditChange(task.id, 'title', e.target.value);
                        }}
                        className="flex-1 text-sm font-medium border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 bg-transparent px-0 py-1"
                        placeholder="Título de la subtarea"
                      />
                    </div>

                    {/* Descripción editable */}
                    <div className="mb-3">
                      <textarea
                        value={subtaskEdits[task.id]?.description ?? task.description ?? ''}
                        onChange={(e) => {
                          onSubtaskEditChange(task.id, 'description', e.target.value);
                        }}
                        className="w-full text-xs text-gray-600 border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                        placeholder="Descripción de la subtarea"
                        rows={2}
                      />
                    </div>

                    {/* Controles editables en línea */}
                    <div className="flex items-center space-x-3 text-xs">
                      {/* Prioridad editable */}
                      <select
                        value={subtaskEdits[task.id]?.priority ?? task.priority}
                        onChange={(e) => {
                          onSubtaskEditChange(task.id, 'priority', e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT');
                        }}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="LOW">Baja</option>
                        <option value="MEDIUM">Media</option>
                        <option value="HIGH">Alta</option>
                        <option value="URGENT">Urgente</option>
                      </select>

                      {/* Fecha de inicio editable */}
                      <input
                        type="date"
                        value={subtaskEdits[task.id]?.startDate ?? task.startDate ?? ''}
                        onChange={(e) => {
                          onSubtaskEditChange(task.id, 'startDate', e.target.value);
                        }}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />

                      {/* Fecha de vencimiento editable */}
                      <input
                        type="date"
                        value={subtaskEdits[task.id]?.dueDate ?? task.dueDate ?? ''}
                        onChange={(e) => {
                          onSubtaskEditChange(task.id, 'dueDate', e.target.value);
                        }}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Renderizado recursivo de subtareas cuando la tarea está expandida - máximo 2 niveles */}
        {hasSubtasks && isExpanded && level <= 1 && (
          <div className="ml-4">
            {task.subtasks && task.subtasks
              .filter(subtask => {
                // Filtrar subtareas que ya aparecen en grupos similares
                const { similarGroups } = groupSimilarTasks();
                const isInSimilarGroup = similarGroups.some(([groupKey, tasks]) => 
                  tasks.some(task => task.id === subtask.id)
                );
                return !isInSimilarGroup;
              })
              .map(subtask => renderTaskHierarchy(subtask, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderSimilarTasksGroup = (groupKey: string, tasks: Task[]) => {
    const firstTask = tasks[0];
    const commonTags = firstTask.tags;
    const commonGroup = firstTask.group;
    const commonPriority = firstTask.priority;

    return (
      <div key={groupKey} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-medium text-blue-800">
              Grupo de tareas similares ({tasks.length} tareas)
            </h4>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className={`px-2 py-1 rounded-full ${getPriorityColor(commonPriority)}`}>
              {getPriorityLabel(commonPriority)}
            </span>
            {commonGroup && (
              <span 
                className="px-2 py-1 rounded-full text-white"
                style={{ backgroundColor: commonGroup.color }}
              >
                {commonGroup.name}
              </span>
            )}
          </div>
        </div>

        {/* Características comunes */}
        <div className="mb-3 p-3 bg-white rounded border">
          <h5 className="text-xs font-medium text-gray-700 mb-2">Características comunes:</h5>
          <div className="flex flex-wrap gap-2">
            {commonTags.map(tag => (
              <span
                key={tag.id}
                className="px-2 py-1 text-xs rounded-full"
                style={{ backgroundColor: tag.color + '20', color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>

        {/* Lista de tareas del grupo */}
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="bg-white rounded border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    readOnly
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">{task.title}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  {task.startDate && (
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(task.startDate)}</span>
                    </span>
                  )}
                  {task.subtasks.length > 0 && (
                    <span>{task.subtasks.length} subtareas</span>
                  )}
                </div>
              </div>
              {task.description && (
                <p className="text-xs text-gray-600 mt-1 ml-6">{task.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const { similarGroups, uniqueTasks } = groupSimilarTasks();

  return (
    <div className="space-y-6">
      {/* Sección de subtareas similares */}
      {similarGroups.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Tareas similares</h3>
            <span className="text-sm text-gray-500">({similarGroups.length} grupos)</span>
          </div>
          
          <div className="space-y-4">
            {similarGroups.map(([groupKey, tasks]) => renderSimilarTasksGroup(groupKey, tasks))}
          </div>
        </div>
      )}

      {/* Sección de tareas únicas */}
      {uniqueTasks.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-medium text-gray-900">Tareas únicas</h3>
            <span className="text-sm text-gray-500">({uniqueTasks.length} tareas)</span>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">
                  Estas tareas tienen características únicas
                </p>
                <p className="text-xs text-amber-700">
                  Los cambios se aplicarán individualmente a cada una.
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              {uniqueTasks.map(task => renderTaskHierarchy(task, 0))}
            </div>
          </div>
        </div>
      )}

      {/* Resumen de cambios en subtareas */}
      {Object.keys(subtaskEdits).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              {Object.keys(subtaskEdits).length} subtarea(s) con cambios pendientes
            </span>
          </div>
          <p className="text-xs text-blue-700">
            Los cambios se aplicarán cuando guardes la edición masiva.
          </p>
        </div>
      )}
    </div>
  );
};

export default BulkEditPreview;
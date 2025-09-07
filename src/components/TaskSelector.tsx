import React, { useState, useEffect } from 'react';

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
  dueDate?: string;
  startDate?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  tags: { tag: Tag }[];
  subtasks: Task[];
  parent?: Task;
  group?: TaskGroup;
}

interface TaskSelectorProps {
  onSelect: (task: Task) => void;
  onCancel: () => void;
  mode: 'task' | 'subtask'; // Determina si seleccionar tareas principales o subtareas
  excludeTaskId?: string; // ID de tarea a excluir de la selección (para evitar auto-copia)
  parentTaskId?: string; // ID de la tarea padre (para subtareas)
  className?: string;
}

/**
 * Componente selector de tareas para funcionalidad de copia
 * Permite seleccionar una tarea o subtarea existente para copiar sus datos
 */
const TaskSelector: React.FC<TaskSelectorProps> = ({
  onSelect,
  onCancel,
  mode,
  excludeTaskId,
  parentTaskId,
  className = ''
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Cargar tareas al montar el componente
  useEffect(() => {
    fetchTasks();
  }, []);

  // Filtrar tareas según el término de búsqueda y modo
  useEffect(() => {
    let filtered = tasks;

    // Filtrar según el modo
    if (mode === 'task') {
      // Solo tareas principales (sin parentId)
      filtered = tasks.filter(task => !task.parentId);
    } else {
      // Solo subtareas (con parentId)
      filtered = tasks.filter(task => task.parentId);
    }

    // Excluir tarea específica si se proporciona
    if (excludeTaskId) {
      filtered = filtered.filter(task => task.id !== excludeTaskId);
    }

    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(term) ||
        (task.description && task.description.toLowerCase().includes(term))
      );
    }

    setFilteredTasks(filtered);
  }, [tasks, searchTerm, mode, excludeTaskId]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        console.error('Error fetching tasks:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskSelect = (task: Task) => {
    onSelect(task);
    onCancel();
    setSearchTerm(''); // Limpiar búsqueda
  };

  const handleClose = () => {
    onCancel();
    setSearchTerm(''); // Limpiar búsqueda al cerrar
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col ${className}`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Seleccionar {mode === 'task' ? 'Tarea' : 'Subtarea'} para Copiar
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Barra de búsqueda */}
          <div className="relative">
            <input
              type="text"
              placeholder={`Buscar ${mode === 'task' ? 'tareas' : 'subtareas'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Lista de tareas */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Cargando...</span>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 
                `No se encontraron ${mode === 'task' ? 'tareas' : 'subtareas'} que coincidan con "${searchTerm}"` :
                `No hay ${mode === 'task' ? 'tareas' : 'subtareas'} disponibles para copiar`
              }
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {task.startDate && (
                          <span>Inicio: {formatDate(task.startDate)}</span>
                        )}
                        {task.dueDate && (
                          <span>Vence: {formatDate(task.dueDate)}</span>
                        )}
                        {mode === 'subtask' && task.parent && (
                          <span>Padre: {task.parent.title}</span>
                        )}
                      </div>
                      
                      {/* Etiquetas */}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {task.tags.slice(0, 3).map((tagRelation) => (
                            <span
                              key={tagRelation.tag.id}
                              className="px-2 py-1 text-xs rounded-full text-white"
                              style={{ backgroundColor: tagRelation.tag.color }}
                            >
                              {tagRelation.tag.name}
                            </span>
                          ))}
                          {task.tags.length > 3 && (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-600">
                              +{task.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSelector;
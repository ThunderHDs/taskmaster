import React, { useState } from 'react';
import { AlertCircle, Tag as TagIcon, Copy, Plus, X, Trash2 } from 'lucide-react';
import { Task, Tag, TaskGroup, Priority } from '../types';
import { DateRangePicker, formatDateToISO } from './DateRangePicker';
import TaskSelector from './TaskSelector';

interface SubtaskCreateFormProps {
  parentTask: Task;
  availableTags: Tag[];
  availableGroups: TaskGroup[];
  onSave: (parentId: string, subtaskData: {
    title: string;
    description?: string | null;
    priority: Priority;
    startDate?: string | null;
    dueDate?: string | null;
    tagIds: string[];
    parentId: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  onParentTaskUpdate?: (parentId: string, parentData: Partial<Task>) => Promise<void>;
}

interface SubtaskFormData {
  title: string;
  description: string;
  priority: Priority;
  startDate: Date | null;
  dueDate: Date | null;
  tagIds: string[];
}

const priorityOptions = [
  { value: 'LOW' as Priority, label: 'Low' },
  { value: 'MEDIUM' as Priority, label: 'Medium' },
  { value: 'HIGH' as Priority, label: 'High' },
  { value: 'URGENT' as Priority, label: 'Urgent' }
];

const SubtaskCreateForm: React.FC<SubtaskCreateFormProps> = ({
  parentTask,
  availableTags,
  availableGroups,
  onSave,
  onCancel,
  isLoading = false,
  onParentTaskUpdate
}) => {
  const [subtasks, setSubtasks] = useState<SubtaskFormData[]>([{
    title: '',
    description: '',
    priority: 'MEDIUM',
    startDate: null,
    dueDate: null,
    tagIds: []
  }]);
  const [errors, setErrors] = useState<Record<string, any>>({});
  const [showTaskSelector, setShowTaskSelector] = useState(false);

  const addSubtask = () => {
    setSubtasks(prev => [...prev, {
      title: '',
      description: '',
      priority: 'MEDIUM',
      startDate: null,
      dueDate: null,
      tagIds: []
    }]);
  };

  const removeSubtask = (index: number) => {
    if (subtasks.length > 1) {
      setSubtasks(prev => prev.filter((_, i) => i !== index));
      // Limpiar errores del índice eliminado
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`subtask_${index}`];
        return newErrors;
      });
    }
  };

  const updateSubtask = (index: number, field: keyof SubtaskFormData, value: any) => {
    setSubtasks(prev => prev.map((subtask, i) => 
      i === index ? { ...subtask, [field]: value } : subtask
    ));
    
    // Limpiar error específico
    if (errors[`subtask_${index}_${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`subtask_${index}_${field}`];
        return newErrors;
      });
    }
  };

  const handleTagToggle = (subtaskIndex: number, tagId: string) => {
    updateSubtask(subtaskIndex, 'tagIds', 
      subtasks[subtaskIndex].tagIds.includes(tagId)
        ? subtasks[subtaskIndex].tagIds.filter(id => id !== tagId)
        : [...subtasks[subtaskIndex].tagIds, tagId]
    );
  };

  const validateSubtasks = () => {
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    subtasks.forEach((subtask, index) => {
      if (!subtask.title.trim()) {
        newErrors[`subtask_${index}_title`] = 'El título es requerido';
        hasErrors = true;
      }

      if (subtask.startDate && subtask.dueDate && subtask.startDate > subtask.dueDate) {
        newErrors[`subtask_${index}_dates`] = 'La fecha de inicio debe ser anterior a la fecha de fin';
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSubtasks()) {
      return;
    }

    try {
      // ✅ CREAR SUBTAREAS SECUENCIALMENTE para evitar problemas de estado
      // Preparar datos de todas las subtareas
      const subtasksData = subtasks.map(subtask => ({
        title: subtask.title.trim(),
        description: subtask.description.trim() || null,
        priority: subtask.priority,
        startDate: subtask.startDate ? formatDateToISO(subtask.startDate) : null,
        dueDate: subtask.dueDate ? formatDateToISO(subtask.dueDate) : null,
        tagIds: subtask.tagIds,
        parentId: parentTask.id
      }));

      // Crear subtareas una por una para evitar conflictos de estado
      for (const subtaskData of subtasksData) {
        await onSave(parentTask.id, subtaskData);
        // Pequeña pausa para permitir que el estado se actualice
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Resetear formulario
      setSubtasks([{
        title: '',
        description: '',
        priority: 'MEDIUM',
        startDate: null,
        dueDate: null,
        tagIds: []
      }]);
      setErrors({});
      
    } catch (error) {
      console.error('Error al crear subtareas:', error);
      setErrors({ submit: 'Error al crear las subtareas' });
    }
  };

  const handleCopyFromTask = (taskData: any) => {
    if (subtasks.length === 1 && !subtasks[0].title) {
      // Si solo hay una subtarea vacía, copiar los datos a ella
      updateSubtask(0, 'title', taskData.title);
      updateSubtask(0, 'description', taskData.description || '');
      updateSubtask(0, 'priority', taskData.priority);
      updateSubtask(0, 'startDate', taskData.startDate ? new Date(taskData.startDate) : null);
      updateSubtask(0, 'dueDate', taskData.dueDate ? new Date(taskData.dueDate) : null);
      updateSubtask(0, 'tagIds', taskData.tags?.map((t: any) => t.tag?.id || t.id).filter(Boolean) || []);
    }
    setShowTaskSelector(false);
  };

  return (
    <>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nueva{subtasks.length > 1 ? 's' : ''} Subtarea{subtasks.length > 1 ? 's' : ''} ({subtasks.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTaskSelector(true)}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              disabled={isLoading}
            >
              <Copy className="w-3 h-3" />
              Copiar de tarea
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {subtasks.map((subtask, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-600">
                  Subtarea {index + 1}
                </span>
                {subtasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSubtask(index)}
                    className="text-red-400 hover:text-red-600"
                    disabled={isLoading}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {/* Título */}
                <div>
                  <input
                    type="text"
                    placeholder="Título de la subtarea *"
                    value={subtask.title}
                    onChange={(e) => updateSubtask(index, 'title', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md text-sm ${
                      errors[`subtask_${index}_title`] ? 'border-red-300' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    disabled={isLoading}
                    autoFocus={index === 0}
                  />
                  {errors[`subtask_${index}_title`] && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors[`subtask_${index}_title`]}
                    </p>
                  )}
                </div>

                {/* Descripción */}
                <div>
                  <textarea
                    placeholder="Descripción (opcional)"
                    value={subtask.description}
                    onChange={(e) => updateSubtask(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    disabled={isLoading}
                  />
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={subtask.priority}
                    onChange={(e) => updateSubtask(index, 'priority', e.target.value as Priority)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  >
                    {priorityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fechas */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fechas
                  </label>
                  <DateRangePicker
                    startDate={subtask.startDate}
                    endDate={subtask.dueDate}
                    onDateChange={(startDate, endDate) => {
                      updateSubtask(index, 'startDate', startDate);
                      updateSubtask(index, 'dueDate', endDate);
                    }}
                    disabled={isLoading}
                  />
                  {errors[`subtask_${index}_dates`] && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors[`subtask_${index}_dates`]}
                    </p>
                  )}
                </div>

                {/* Etiquetas */}
                {availableTags.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Etiquetas
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {availableTags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleTagToggle(index, tag.id)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                            subtask.tagIds.includes(tag.id)
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                          }`}
                          disabled={isLoading}
                        >
                          <TagIcon className="w-3 h-3" />
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Botón para agregar más subtareas */}
          <button
            type="button"
            onClick={addSubtask}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700 flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4" />
            Agregar otra subtarea
          </button>

          {/* Error general */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {errors.submit}
              </p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Creando...' : `Crear ${subtasks.length} subtarea${subtasks.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de selector de tareas */}
      {showTaskSelector && (
        <TaskSelector
          tasks={[]} // Aquí deberías pasar las tareas disponibles
          onSelectTask={handleCopyFromTask}
          onClose={() => setShowTaskSelector(false)}
        />
      )}
    </>
  );
};

export default SubtaskCreateForm;
export { SubtaskCreateForm };
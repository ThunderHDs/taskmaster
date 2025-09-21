import React, { useState } from 'react';
import { AlertCircle, Tag as TagIcon, Copy, Plus, X } from 'lucide-react';
import { Task, Tag, TaskGroup, Priority } from '../types';
import { DateRangePicker, formatDateToISO } from './DateRangePicker';
import DateConflictModal from './DateConflictModal';
import { validateDateConflict, createParentUpdateData, type SubtaskData } from '../utils/dateConflictUtils';
import TaskSelector from './TaskSelector';

interface SubtaskCreateFormProps {
  parentTask: Task;
  availableTags: Tag[];
  availableGroups: TaskGroup[];
  onSave: (subtaskData: {
    title: string;
    description?: string;
    priority: Priority;
    startDate?: string;
    dueDate?: string;
    tagIds: string[];
    parentId: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  onParentTaskUpdate?: (parentId: string, parentData: Partial<Task>) => Promise<void>;
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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as Priority,
    startDate: null as Date | null,
    dueDate: null as Date | null,
    tagIds: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<any>(null);
  const [pendingSubtaskData, setPendingSubtaskData] = useState<any>(null);
  const [isProcessingConflict, setIsProcessingConflict] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);

  const adaptParentTask = (task: Task): SubtaskData => ({
    id: task.id,
    title: task.title,
    startDate: task.startDate,
    dueDate: task.dueDate,
    priority: task.priority,
    tags: task.tags || [],
    parentId: task.parentId
  });

  const handleConfirmKeepSubtask = async () => {
    if (!pendingSubtaskData || !conflictDetails) return;
    
    setIsProcessingConflict(true);
    
    try {
      if ((conflictDetails.suggestedParentStartDate || conflictDetails.suggestedParentEndDate) && onParentTaskUpdate) {
        const parentUpdateData = createParentUpdateData(
          adaptParentTask(parentTask),
          conflictDetails.suggestedParentStartDate,
          conflictDetails.suggestedParentEndDate
        );
        
        await onParentTaskUpdate(parentTask.id, {
          startDate: parentUpdateData.startDate || undefined,
          dueDate: parentUpdateData.dueDate || undefined
        });
      }
      
      await onSave(pendingSubtaskData);
      
      setFormData(prev => ({
        ...prev,
        title: '',
        description: '',
        priority: 'MEDIUM',
        tagIds: []
      }));
      
      setErrors({});
    } catch (error) {
      console.error('Error al crear subtarea:', error);
      setErrors({ submit: 'Error al crear la subtarea' });
    } finally {
      setIsProcessingConflict(false);
      setShowConflictModal(false);
      setConflictDetails(null);
      setPendingSubtaskData(null);
    }
  };

  const handleConfirmAdjustSubtask = async () => {
    if (!pendingSubtaskData || !conflictDetails) return;
    
    setIsProcessingConflict(true);
    
    try {
      const adjustedData = {
        ...pendingSubtaskData,
        startDate: conflictDetails.suggestedSubtaskStartDate || pendingSubtaskData.startDate,
        dueDate: conflictDetails.suggestedSubtaskEndDate || pendingSubtaskData.dueDate
      };
      
      await onSave(adjustedData);
      
      setFormData(prev => ({
        ...prev,
        title: '',
        description: '',
        priority: 'MEDIUM',
        tagIds: []
      }));
      
      setErrors({});
    } catch (error) {
      console.error('Error al crear subtarea:', error);
      setErrors({ submit: 'Error al crear la subtarea' });
    } finally {
      setIsProcessingConflict(false);
      setShowConflictModal(false);
      setConflictDetails(null);
      setPendingSubtaskData(null);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido';
    }
    
    if (formData.startDate && formData.dueDate && formData.startDate > formData.dueDate) {
      newErrors.dates = 'La fecha de inicio debe ser anterior a la fecha de vencimiento';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const subtaskData = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      priority: formData.priority,
      startDate: formData.startDate ? formatDateToISO(formData.startDate) : undefined,
      dueDate: formData.dueDate ? formatDateToISO(formData.dueDate) : undefined,
      tagIds: formData.tagIds,
      parentId: parentTask.id
    };
    
    const adaptedSubtask: SubtaskData = {
      id: '',
      title: subtaskData.title,
      startDate: subtaskData.startDate,
      dueDate: subtaskData.dueDate,
      priority: subtaskData.priority,
      tags: formData.tagIds.map(tagId => {
        const tag = availableTags.find(t => t.id === tagId);
        return tag ? { tag } : null;
      }).filter(Boolean) as { tag: Tag }[],
      parentId: parentTask.id
    };
    
    const conflict = validateDateConflict(adaptedSubtask, adaptParentTask(parentTask));
    
    if (conflict.hasConflict) {
      setConflictDetails(conflict);
      setPendingSubtaskData(subtaskData);
      setShowConflictModal(true);
      return;
    }
    
    try {
      await onSave(subtaskData);
      
      setFormData({
        title: '',
        description: '',
        priority: 'MEDIUM',
        startDate: null,
        dueDate: null,
        tagIds: []
      });
      
      setErrors({});
    } catch (error) {
      console.error('Error al crear subtarea:', error);
      setErrors({ submit: 'Error al crear la subtarea' });
    }
  };

  const handleCopyFromTask = (taskData: any) => {
    setFormData(prev => ({
      ...prev,
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority,
      startDate: taskData.startDate ? new Date(taskData.startDate) : null,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
      tagIds: taskData.tags?.map((t: any) => t.tag?.id || t.id).filter(Boolean) || []
    }));
    setShowTaskSelector(false);
  };

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }));
  };

  return (
    <>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nueva Subtarea
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
          {/* Título */}
          <div>
            <input
              type="text"
              placeholder="Título de la subtarea *"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md text-sm ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={isLoading}
              autoFocus
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <textarea
              placeholder="Descripción (opcional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
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
              startDate={formData.startDate}
              endDate={formData.dueDate}
              onStartDateChange={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
              onEndDateChange={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
              disabled={isLoading}
            />
            {errors.dates && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.dates}
              </p>
            )}
          </div>

          {/* Etiquetas */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Etiquetas
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                      formData.tagIds.includes(tag.id)
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

          {/* Errores generales */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {errors.submit}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !formData.title.trim()}
            >
              {isLoading ? 'Creando...' : 'Crear Subtarea'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de conflictos de fechas */}
      {showConflictModal && conflictDetails && (
        <DateConflictModal
          isOpen={showConflictModal}
          onClose={() => {
            setShowConflictModal(false);
            setConflictDetails(null);
            setPendingSubtaskData(null);
          }}
          conflictType={conflictDetails.conflictType}
          parentTask={{
            title: parentTask.title,
            startDate: parentTask.startDate,
            dueDate: parentTask.dueDate
          }}
          subtask={{
            title: formData.title,
            startDate: formData.startDate ? formatDateToISO(formData.startDate) : undefined,
            dueDate: formData.dueDate ? formatDateToISO(formData.dueDate) : undefined
          }}
          suggestedParentStartDate={conflictDetails.suggestedParentStartDate}
          suggestedParentEndDate={conflictDetails.suggestedParentEndDate}
          suggestedSubtaskStartDate={conflictDetails.suggestedSubtaskStartDate}
          suggestedSubtaskEndDate={conflictDetails.suggestedSubtaskEndDate}
          onConfirmKeepSubtask={handleConfirmKeepSubtask}
          onConfirmAdjustSubtask={handleConfirmAdjustSubtask}
          isProcessing={isProcessingConflict}
        />
      )}

      {/* Selector de tareas para copiar */}
      {showTaskSelector && (
        <TaskSelector
          isOpen={showTaskSelector}
          onClose={() => setShowTaskSelector(false)}
          onSelectTask={handleCopyFromTask}
          excludeTaskId={parentTask.id}
        />
      )}
    </>
  );
};

export default SubtaskCreateForm;
export { SubtaskCreateForm };
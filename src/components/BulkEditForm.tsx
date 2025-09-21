import React from 'react';
import { Calendar, Tag as TagIcon, Users, AlertCircle } from 'lucide-react';

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

interface FieldComparison {
  hasCommonValue: boolean;
  commonValue?: any;
  differentValues: any[];
}

interface BulkEditFormProps {
  tasks: Task[];
  formData: BulkUpdateData;
  fieldsToUpdate: Set<string>;
  fieldComparisons: Record<string, FieldComparison>;
  individualMode: Record<string, boolean>;
  individualData: IndividualTaskData;
  availableTags: Tag[];
  availableGroups: TaskGroup[];
  onFormDataChange: (field: keyof BulkUpdateData, value: any) => void;
  onFieldToggle: (field: string) => void;
  onIndividualModeToggle: (field: string) => void;
  onIndividualDataChange: (taskId: string, field: keyof BulkUpdateData, value: any) => void;
}

const BulkEditForm: React.FC<BulkEditFormProps> = ({
  tasks,
  formData,
  fieldsToUpdate,
  fieldComparisons,
  individualMode,
  individualData,
  availableTags,
  availableGroups,
  onFormDataChange,
  onFieldToggle,
  onIndividualModeToggle,
  onIndividualDataChange
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

  const renderFieldComparison = (field: string, comparison: FieldComparison) => {
    if (comparison.hasCommonValue) {
      let displayValue = comparison.commonValue;
      if (field === 'priority') {
        displayValue = getPriorityLabel(comparison.commonValue);
      } else if (field === 'startDate' || field === 'dueDate') {
        displayValue = formatDate(comparison.commonValue);
      } else if (field === 'group') {
        displayValue = comparison.commonValue?.name || 'Sin grupo';
      } else if (field === 'tags') {
        displayValue = comparison.commonValue?.map((tag: Tag) => tag.name).join(', ') || 'Sin etiquetas';
      }
      
      return (
        <span className="text-sm text-gray-600">
          Valor común: <span className="font-medium">{displayValue}</span>
        </span>
      );
    } else {
      return (
        <span className="text-sm text-amber-600 flex items-center space-x-1">
          <AlertCircle className="h-3 w-3" />
          <span>Valores diferentes</span>
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Comparación de campos (excluyendo subtareas) */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Campos a actualizar</h3>
        
        {/* Título */}
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="title-field"
            checked={fieldsToUpdate.has('title')}
            onChange={() => onFieldToggle('title')}
            className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <div className="flex-1">
            <label htmlFor="title-field" className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            {renderFieldComparison('title', fieldComparisons.title)}
          </div>
        </div>

        {/* Descripción */}
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="description-field"
            checked={fieldsToUpdate.has('description')}
            onChange={() => onFieldToggle('description')}
            className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <div className="flex-1">
            <label htmlFor="description-field" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            {renderFieldComparison('description', fieldComparisons.description)}
          </div>
        </div>

        {/* Prioridad */}
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="priority-field"
            checked={fieldsToUpdate.has('priority')}
            onChange={() => onFieldToggle('priority')}
            className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <div className="flex-1">
            <label htmlFor="priority-field" className="block text-sm font-medium text-gray-700 mb-1">
              Prioridad
            </label>
            {renderFieldComparison('priority', fieldComparisons.priority)}
          </div>
        </div>

        {/* Fechas */}
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="dates-field"
            checked={fieldsToUpdate.has('startDate') || fieldsToUpdate.has('dueDate')}
            onChange={() => {
              onFieldToggle('startDate');
              onFieldToggle('dueDate');
            }}
            className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <div className="flex-1">
            <label htmlFor="dates-field" className="block text-sm font-medium text-gray-700 mb-1">
              Fechas
            </label>
            <div className="space-y-1">
              {renderFieldComparison('startDate', fieldComparisons.startDate)}
              {renderFieldComparison('dueDate', fieldComparisons.dueDate)}
            </div>
          </div>
        </div>

        {/* Grupo */}
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="group-field"
            checked={fieldsToUpdate.has('groupId')}
            onChange={() => onFieldToggle('groupId')}
            className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <div className="flex-1">
            <label htmlFor="group-field" className="block text-sm font-medium text-gray-700 mb-1">
              Grupo
            </label>
            {renderFieldComparison('group', fieldComparisons.group)}
          </div>
        </div>

        {/* Etiquetas */}
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="tags-field"
            checked={fieldsToUpdate.has('tagIds')}
            onChange={() => onFieldToggle('tagIds')}
            className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <div className="flex-1">
            <label htmlFor="tags-field" className="block text-sm font-medium text-gray-700 mb-1">
              Etiquetas
            </label>
            {renderFieldComparison('tags', fieldComparisons.tags)}
          </div>
        </div>
      </div>

      {/* Campos de edición */}
      {fieldsToUpdate.size > 0 && (
        <div className="space-y-6 border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900">Nuevos valores</h3>

          {/* Título */}
          {fieldsToUpdate.has('title') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => onFormDataChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nuevo título para las tareas seleccionadas"
              />
            </div>
          )}

          {/* Descripción */}
          {fieldsToUpdate.has('description') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => onFormDataChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nueva descripción para las tareas seleccionadas"
              />
            </div>
          )}

          {/* Prioridad */}
          {fieldsToUpdate.has('priority') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioridad
              </label>
              <select
                value={formData.priority || ''}
                onChange={(e) => onFormDataChange('priority', e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar prioridad</option>
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          )}

          {/* Fechas */}
          {(fieldsToUpdate.has('startDate') || fieldsToUpdate.has('dueDate')) && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Fechas
                </label>
                <button
                  type="button"
                  onClick={() => onIndividualModeToggle('dates')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    individualMode.dates
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {individualMode.dates ? 'Modo individual' : 'Modo global'}
                </button>
              </div>

              {!individualMode.dates ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Fecha de inicio
                    </label>
                    <input
                      type="date"
                      value={formData.startDate || ''}
                      onChange={(e) => onFormDataChange('startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Fecha de vencimiento
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate || ''}
                      onChange={(e) => onFormDataChange('dueDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div key={task.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">{task.title}</div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="date"
                          value={individualData[task.id]?.startDate || task.startDate || ''}
                          onChange={(e) => onIndividualDataChange(task.id, 'startDate', e.target.value)}
                          className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="date"
                          value={individualData[task.id]?.dueDate || task.dueDate || ''}
                          onChange={(e) => onIndividualDataChange(task.id, 'dueDate', e.target.value)}
                          className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Grupo */}
          {fieldsToUpdate.has('groupId') && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Grupo
                </label>
                <button
                  type="button"
                  onClick={() => onIndividualModeToggle('group')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    individualMode.group
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {individualMode.group ? 'Modo individual' : 'Modo global'}
                </button>
              </div>

              {!individualMode.group ? (
                <select
                  value={formData.groupId || ''}
                  onChange={(e) => onFormDataChange('groupId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sin grupo</option>
                  {availableGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div key={task.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">{task.title}</div>
                      <select
                        value={individualData[task.id]?.groupId || task.group?.id || ''}
                        onChange={(e) => onIndividualDataChange(task.id, 'groupId', e.target.value)}
                        className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Sin grupo</option>
                        {availableGroups.map(group => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Etiquetas */}
          {fieldsToUpdate.has('tagIds') && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Etiquetas
                </label>
                <button
                  type="button"
                  onClick={() => onIndividualModeToggle('tags')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    individualMode.tags
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {individualMode.tags ? 'Modo individual' : 'Modo global'}
                </button>
              </div>

              {!individualMode.tags ? (
                <div className="space-y-2">
                  {availableTags.map(tag => (
                    <label key={tag.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.tagIds?.includes(tag.id) || false}
                        onChange={(e) => {
                          const currentTags = formData.tagIds || [];
                          if (e.target.checked) {
                            onFormDataChange('tagIds', [...currentTags, tag.id]);
                          } else {
                            onFormDataChange('tagIds', currentTags.filter(id => id !== tag.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span
                        className="px-2 py-1 text-xs rounded-full"
                        style={{ backgroundColor: tag.color + '20', color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div key={task.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">{task.title}</div>
                      <div className="space-y-2">
                        {availableTags.map(tag => {
                          const currentTags = individualData[task.id]?.tagIds || task.tags.map(t => t.id);
                          return (
                            <label key={tag.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={currentTags.includes(tag.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    onIndividualDataChange(task.id, 'tagIds', [...currentTags, tag.id]);
                                  } else {
                                    onIndividualDataChange(task.id, 'tagIds', currentTags.filter(id => id !== tag.id));
                                  }
                                }}
                                className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1"
                              />
                              <span
                                className="px-2 py-1 text-xs rounded-full"
                                style={{ backgroundColor: tag.color + '20', color: tag.color }}
                              >
                                {tag.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkEditForm;
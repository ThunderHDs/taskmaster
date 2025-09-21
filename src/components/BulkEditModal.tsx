import React, { useState, useEffect } from 'react';
import { Save, X, ChevronDown, ChevronRight, AlertCircle, Check, Users, Edit3 } from 'lucide-react';

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

interface FieldAnalysis {
  field: string;
  label: string;
  hasCommonValue: boolean;
  commonValue?: any;
  differentValues: { taskId: string; value: any; taskTitle: string }[];
  editMode: 'common' | 'individual' | 'none';
}

interface BulkEditModalProps {
  isOpen: boolean;
  selectedTaskIds: string[];
  allTasks: Task[];
  availableTags: Tag[];
  availableGroups: TaskGroup[];
  onClose: () => void;
  onSave: (updates: BulkUpdateData, individualUpdates: Record<string, Partial<BulkUpdateData>>, subtaskUpdates: Record<string, Partial<Task>>) => Promise<void>;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  selectedTaskIds,
  allTasks,
  availableTags,
  availableGroups,
  onClose,
  onSave
}) => {
  // Filtrar las tareas seleccionadas
  const tasks = allTasks.filter(task => selectedTaskIds.includes(task.id));
  // Estados principales
  const [step, setStep] = useState<'analysis' | 'editing' | 'confirmation'>('analysis');
  const [fieldAnalysis, setFieldAnalysis] = useState<FieldAnalysis[]>([]);
  const [commonUpdates, setCommonUpdates] = useState<BulkUpdateData>({});
  const [individualUpdates, setIndividualUpdates] = useState<Record<string, Partial<BulkUpdateData>>>({});
  const [subtaskUpdates, setSubtaskUpdates] = useState<Record<string, Partial<Task>>>({});
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Analizar campos cuando se abra el modal
  useEffect(() => {
    if (isOpen && tasks && tasks.length > 0) {
      analyzeTaskFields();
      initializeUpdates();
      setStep('analysis');
    }
  }, [isOpen, selectedTaskIds, allTasks]);

  // Funciones de formateo para mostrar datos
  const formatValue = (field: string, value: any): string => {
    if (value === null || value === undefined || value === '') return 'Sin valor';
    
    switch (field) {
      case 'priority':
        const priorityLabels = {
          'LOW': '🟢 Baja',
          'MEDIUM': '🟡 Media', 
          'HIGH': '🟠 Alta',
          'URGENT': '🔴 Urgente'
        };
        return priorityLabels[value as keyof typeof priorityLabels] || value;
      
      case 'completed':
        return value ? '✅ Completada' : '⏳ Pendiente';
      
      case 'startDate':
      case 'dueDate':
        if (value) {
          const date = new Date(value);
          return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
        return 'Sin fecha';
      
      case 'group':
        return value?.name || 'Sin grupo';
      
      case 'tags':
        if (Array.isArray(value) && value.length > 0) {
          return value.map(tag => `#${tag.name}`).join(', ');
        }
        return 'Sin etiquetas';
      
      default:
        return String(value);
    }
  };

  // Componente de input apropiado para cada tipo de campo
  const renderFieldInput = (field: string, value: any, onChange: (value: any) => void, className: string = '') => {
    const baseClassName = `border border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${className}`;
    
    switch (field) {
      case 'priority':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseClassName}
          >
            <option value="">Seleccionar prioridad</option>
            <option value="LOW">🟢 Baja</option>
            <option value="MEDIUM">🟡 Media</option>
            <option value="HIGH">🟠 Alta</option>
            <option value="URGENT">🔴 Urgente</option>
          </select>
        );
      
      case 'completed':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">{value ? '✅ Completada' : '⏳ Pendiente'}</span>
          </label>
        );
      
      case 'startDate':
      case 'dueDate':
        return (
          <input
            type="date"
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseClassName}
          />
        );
      
      case 'group':
        return (
          <select
            value={value?.id || ''}
            onChange={(e) => {
              const selectedGroup = availableGroups?.find(g => g.id === e.target.value);
              onChange(selectedGroup || null);
            }}
            className={baseClassName}
          >
            <option value="">Sin grupo</option>
            {availableGroups?.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        );
      
      case 'groupId':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseClassName}
          >
            <option value="">Sin grupo</option>
            {availableGroups.map(group => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        );
      
      case 'tagIds':
        return (
          <div className="space-y-2">
            {availableTags.map(tag => (
              <label key={tag.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) ? value.includes(tag.id) : false}
                  onChange={(e) => {
                    const currentTags = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      onChange([...currentTags, tag.id]);
                    } else {
                      onChange(currentTags.filter(id => id !== tag.id));
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm" style={{ color: tag.color }}>#{tag.name}</span>
              </label>
            ))}
          </div>
        );
      
      case 'tags':
        return (
          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3 bg-white">
            <div className="grid grid-cols-1 gap-2">
              {availableTags.map(tag => (
                <label key={tag.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={Array.isArray(value) ? value.some(t => t.id === tag.id) : false}
                    onChange={(e) => {
                      const currentTags = Array.isArray(value) ? value : [];
                      if (e.target.checked) {
                        onChange([...currentTags, tag]);
                      } else {
                        onChange(currentTags.filter(t => t.id !== tag.id));
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <span 
                     className="text-sm font-medium px-3 py-1 rounded-full text-white inline-block"
                     style={{ backgroundColor: tag.color }}
                   >
                     #{tag.name}
                   </span>
                </label>
              ))}
            </div>
            {availableTags.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No hay etiquetas disponibles</p>
            )}
          </div>
        );
      
      case 'description':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className={baseClassName}
            placeholder="Descripción de la tarea..."
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={baseClassName}
          />
        );
    }
  };

  const analyzeTaskFields = () => {
    console.log('analyzeTaskFields called with tasks:', tasks);
    const fields = [
      { key: 'title', label: 'Título' },
      { key: 'description', label: 'Descripción' },
      { key: 'priority', label: 'Prioridad' },
      { key: 'startDate', label: 'Fecha de inicio' },
      { key: 'dueDate', label: 'Fecha de vencimiento' },
      { key: 'group', label: 'Grupo' },
      { key: 'tags', label: 'Etiquetas' },
      { key: 'completed', label: 'Estado' }
    ];

    const analysis: FieldAnalysis[] = fields.map(({ key, label }) => {
      const values = tasks.map(task => {
        switch (key) {
          case 'group':
            return task.group;
          case 'tags':
            return task.tags;
          default:
            return (task as any)[key];
        }
      });

      const firstValue = values[0];
      const hasCommonValue = values.every(value => {
        if (key === 'tags') {
          return JSON.stringify(value?.map((t: Tag) => t.id).sort()) === JSON.stringify(firstValue?.map((t: Tag) => t.id).sort());
        } else if (key === 'group') {
          return value?.id === firstValue?.id;
        }
        return value === firstValue;
      });

      const differentValues = hasCommonValue ? [] : tasks.map((task, index) => ({
        taskId: task.id,
        value: values[index],
        taskTitle: task.title
      }));

      return {
        field: key,
        label,
        hasCommonValue,
        commonValue: hasCommonValue ? firstValue : undefined,
        differentValues,
        editMode: 'none' as 'common' | 'individual' | 'none'
      };
    });

    console.log('Field analysis completed:', analysis);
    console.log('Setting fieldAnalysis state with:', analysis.length, 'items');
    setFieldAnalysis(analysis);
    console.log('setFieldAnalysis called');
  };

  const initializeUpdates = () => {
    const individual: Record<string, Partial<BulkUpdateData>> = {};
    tasks.forEach(task => {
      individual[task.id] = {
        title: task.title,
        description: task.description,
        priority: task.priority,
        startDate: task.startDate,
        dueDate: task.dueDate,
        groupId: task.group?.id,
        tagIds: task.tags?.map(tag => tag.id) || [],
        completed: task.completed
      };
    });
    setIndividualUpdates(individual);
  };

  const updateFieldEditMode = (fieldKey: string, mode: 'common' | 'individual' | 'none') => {
    setFieldAnalysis(prev => prev.map(field => 
      field.field === fieldKey ? { ...field, editMode: mode } : field
    ));
  };

  const updateCommonValue = (fieldKey: string, value: any) => {
    setCommonUpdates(prev => ({ ...prev, [fieldKey]: value }));
  };

  const updateIndividualValue = (taskId: string, fieldKey: string, value: any) => {
    setIndividualUpdates(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], [fieldKey]: value }
    }));
  };

  const getAllSubtasks = (tasks: Task[]): Task[] => {
    const allSubtasks: Task[] = [];
    
    const collectSubtasks = (task: Task) => {
      if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
        task.subtasks.forEach(subtask => {
          allSubtasks.push(subtask);
          collectSubtasks(subtask);
        });
      }
    };

    if (tasks && Array.isArray(tasks)) {
      tasks.forEach(collectSubtasks);
    }
    return allSubtasks;
  };

  const renderSubtaskHierarchy = (task: Task, level: number = 0): React.ReactNode => {
    const hasSubtasks = task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const indent = level * 20;

    return (
      <div key={task.id} className="border-l-2 border-gray-200 pl-4 mb-3">
        <div className="bg-gray-50 rounded-lg p-3 space-y-3">
          {hasSubtasks && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  const newExpanded = new Set(expandedTasks);
                  if (isExpanded) {
                    newExpanded.delete(task.id);
                  } else {
                    newExpanded.add(task.id);
                  }
                  setExpandedTasks(newExpanded);
                }}
                className="flex items-center space-x-2 p-1 hover:bg-gray-200 rounded text-sm font-medium text-gray-700"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span>{hasSubtasks ? `${task.subtasks?.length} subtareas` : ''}</span>
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Título:</label>
              <input
                type="text"
                value={subtaskUpdates[task.id]?.title ?? task.title}
                onChange={(e) => setSubtaskUpdates(prev => ({
                  ...prev,
                  [task.id]: { ...prev[task.id], title: e.target.value }
                }))}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado:</label>
              <select
                value={subtaskUpdates[task.id]?.completed !== undefined ? (subtaskUpdates[task.id]?.completed ? 'true' : 'false') : (task.completed ? 'true' : 'false')}
                onChange={(e) => setSubtaskUpdates(prev => ({
                  ...prev,
                  [task.id]: { ...prev[task.id], completed: e.target.value === 'true' }
                }))}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="false">Pendiente</option>
                <option value="true">Completada</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prioridad:</label>
              <select
                value={subtaskUpdates[task.id]?.priority ?? task.priority}
                onChange={(e) => setSubtaskUpdates(prev => ({
                  ...prev,
                  [task.id]: { ...prev[task.id], priority: e.target.value as Task['priority'] }
                }))}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha límite:</label>
              <input
                type="date"
                value={subtaskUpdates[task.id]?.dueDate ?? (task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '')}
                onChange={(e) => setSubtaskUpdates(prev => ({
                  ...prev,
                  [task.id]: { ...prev[task.id], dueDate: e.target.value ? new Date(e.target.value) : null }
                }))}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción:</label>
            <textarea
              value={subtaskUpdates[task.id]?.description ?? task.description ?? ''}
              onChange={(e) => setSubtaskUpdates(prev => ({
                ...prev,
                [task.id]: { ...prev[task.id], description: e.target.value }
              }))}
              rows={2}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              placeholder="Descripción de la subtarea..."
            />
          </div>
        </div>
        
        {hasSubtasks && isExpanded && (
          <div className="ml-4 mt-3">
            {task.subtasks?.map(subtask => renderSubtaskHierarchy(subtask, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Preparar updates basados en los modos de edición
      const finalCommonUpdates: BulkUpdateData = {};
      const finalIndividualUpdates: Record<string, Partial<BulkUpdateData>> = {};

      fieldAnalysis.forEach(field => {
        if (field.editMode === 'common') {
          const value = commonUpdates[field.field as keyof BulkUpdateData];
          if (value !== undefined && value !== null && value !== '') {
            finalCommonUpdates[field.field as keyof BulkUpdateData] = value;
          }
        } else if (field.editMode === 'individual') {
          tasks.forEach(task => {
            const value = individualUpdates[task.id]?.[field.field as keyof BulkUpdateData];
            if (value !== undefined && value !== null && value !== '') {
              if (!finalIndividualUpdates[task.id]) {
                finalIndividualUpdates[task.id] = {};
              }
              finalIndividualUpdates[task.id][field.field as keyof BulkUpdateData] = value;
            }
          });
        }
      });

      // Validar que hay al menos un campo para actualizar
      const hasCommonUpdates = Object.keys(finalCommonUpdates).length > 0;
      const hasIndividualUpdates = Object.keys(finalIndividualUpdates).length > 0;
      const hasSubtaskUpdates = Object.keys(subtaskUpdates).length > 0;
      
      if (!hasCommonUpdates && !hasIndividualUpdates && !hasSubtaskUpdates) {
        alert('Debe seleccionar al menos un campo para actualizar.');
        return;
      }

      await onSave({
        commonUpdates: finalCommonUpdates,
        individualUpdates: finalIndividualUpdates,
        subtaskUpdates: subtaskUpdates
      });
      onClose();
    } catch (error) {
      console.error('Error saving bulk edit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Edición Masiva - {tasks?.length || 0} tarea{(tasks?.length || 0) !== 1 ? 's' : ''}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center p-4 bg-gray-50 border-b">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${step === 'analysis' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'analysis' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              <span>Análisis</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${step === 'editing' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'editing' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              <span>Edición</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${step === 'confirmation' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'confirmation' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                3
              </div>
              <span>Confirmación</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {step === 'analysis' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Análisis de Campos</h3>
                <p className="text-gray-600">Revisa las similitudes y diferencias entre las tareas seleccionadas</p>
              </div>
              

              
              {console.log('Rendering fieldAnalysis:', fieldAnalysis)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fieldAnalysis.length === 0 ? (
                  <div className="col-span-2 text-center text-gray-500 py-8">
                    No hay análisis de campos disponible. Tareas: {tasks?.length || 0}
                  </div>
                ) : (
                  fieldAnalysis.map(field => (
                  <div key={field.field} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{field.label}</h4>
                      {field.hasCommonValue ? (
                        <span className="flex items-center text-green-600 text-sm">
                          <Check className="h-4 w-4 mr-1" />
                          Común
                        </span>
                      ) : (
                        <span className="flex items-center text-amber-600 text-sm">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Diferente
                        </span>
                      )}
                    </div>
                    
                    {field.hasCommonValue ? (
                      <div className="text-sm text-gray-600">
                        <strong>Valor común:</strong> {String(field.commonValue || 'Sin valor')}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">
                        <strong>Valores diferentes:</strong>
                        <ul className="mt-1 space-y-1">
                          {field.differentValues.slice(0, 3).map(item => (
                            <li key={item.taskId} className="truncate">
                              • {item.taskTitle}: {formatValue(field.field, item.value)}
                            </li>
                          ))}
                          {field.differentValues.length > 3 && (
                            <li className="text-gray-400">... y {field.differentValues.length - 3} más</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  ))
                )}
              </div>
            </div>
          )}

          {step === 'editing' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Configurar Ediciones</h3>
                <p className="text-gray-600">Selecciona qué campos editar y cómo aplicar los cambios</p>
              </div>
              
              {/* Campo por campo */}
              <div className="space-y-4">
                {fieldAnalysis.map(field => (
                  <div key={field.field} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">{field.label}</h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateFieldEditMode(field.field, 'none')}
                          className={`px-3 py-1 text-sm rounded ${field.editMode === 'none' ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          No editar
                        </button>
                        {field.hasCommonValue && (
                          <button
                            onClick={() => updateFieldEditMode(field.field, 'common')}
                            className={`px-3 py-1 text-sm rounded ${field.editMode === 'common' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                          >
                            Editar común
                          </button>
                        )}
                        <button
                          onClick={() => updateFieldEditMode(field.field, 'individual')}
                          className={`px-3 py-1 text-sm rounded ${field.editMode === 'individual' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                        >
                          Editar individual
                        </button>
                      </div>
                    </div>
                    
                    {field.editMode === 'common' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nuevo valor común:
                        </label>
                        {renderFieldInput(
                          field.field,
                          commonUpdates[field.field as keyof BulkUpdateData],
                          (value) => updateCommonValue(field.field, value),
                          'w-full'
                        )}
                      </div>
                    )}
                    
                    {field.editMode === 'individual' && (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Valores individuales:
                        </label>
                        {tasks.map(task => (
                          <div key={task.id} className="space-y-2">
                            <span className="text-sm font-medium text-gray-700">{task.title}:</span>
                            <div className="ml-4">
                              {renderFieldInput(
                                field.field,
                                individualUpdates[task.id]?.[field.field as keyof BulkUpdateData],
                                (value) => updateIndividualValue(task.id, field.field, value),
                                'w-full text-sm'
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Subtareas */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-4">Subtareas (Vista Jerárquica)</h4>
                <div className="space-y-2">
                  {getAllSubtasks(tasks).length > 0 ? (
                    tasks.map(task => (
                      task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                        <div key={task.id}>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Subtareas de: {task.title}</h5>
                          {task.subtasks?.map(subtask => renderSubtaskHierarchy(subtask))}
                        </div>
                      )
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No hay subtareas en las tareas seleccionadas</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'confirmation' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Confirmar Cambios</h3>
                <p className="text-gray-600">Revisa los cambios antes de aplicarlos</p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <h4 className="font-medium text-yellow-800">Resumen de cambios</h4>
                </div>
                
                <div className="space-y-2 text-sm">
                  {fieldAnalysis.filter(f => f.editMode !== 'none').map(field => (
                    <div key={field.field} className="flex justify-between">
                      <span className="font-medium">{field.label}:</span>
                      <span className="text-gray-600">
                        {field.editMode === 'common' ? 'Cambio común' : 'Cambios individuales'}
                      </span>
                    </div>
                  ))}
                  
                  {Object.keys(subtaskUpdates).length > 0 && (
                    <div className="flex justify-between">
                      <span className="font-medium">Subtareas:</span>
                      <span className="text-gray-600">{Object.keys(subtaskUpdates).length} modificadas</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {step === 'analysis' && 'Revisa las similitudes y diferencias'}
            {step === 'editing' && `${fieldAnalysis.filter(f => f.editMode !== 'none').length} campos configurados`}
            {step === 'confirmation' && 'Listo para aplicar cambios'}
          </div>
          
          <div className="flex space-x-3">
            {step !== 'analysis' && (
              <button
                onClick={() => setStep(step === 'editing' ? 'analysis' : 'editing')}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Anterior
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            
            {step === 'analysis' && (
              <button
                onClick={() => setStep('editing')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Continuar
              </button>
            )}
            
            {step === 'editing' && (
              <button
                onClick={() => setStep('confirmation')}
                disabled={fieldAnalysis.filter(f => f.editMode !== 'none').length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Revisar
              </button>
            )}
            
            {step === 'confirmation' && (
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Aplicando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Aplicar Cambios</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkEditModal;
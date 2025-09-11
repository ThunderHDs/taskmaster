'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Users, Calendar, Tag as TagIcon, Flag } from 'lucide-react';

// INTERFACES
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
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: string;
  dueDate?: string;
  completed: boolean;
  tags: { tag: Tag }[];
  group?: TaskGroup;
  subtasks: Task[];
}

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTasks?: Task[];
  tags?: Tag[];
  groups?: TaskGroup[];
  onSave: (updates: BulkUpdateData) => Promise<void>;
}

interface BulkUpdateData {
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: string;
  dueDate?: string;
  groupId?: string;
  tagIds?: string[];
  // Para asignación individual
  individualUpdates?: {
    [taskId: string]: {
      startDate?: string;
      dueDate?: string;
      groupId?: string;
      tagIds?: string[];
    };
  };
}

interface IndividualTaskData {
  taskId: string;
  title: string;
  startDate?: string;
  dueDate?: string;
  groupId?: string;
  tagIds?: string[];
}

interface FieldComparison {
  field: string;
  label: string;
  hasCommonValue: boolean;
  commonValue?: any;
  differentValues: any[];
  canEdit: boolean;
}

// COMPONENTE PRINCIPAL
export default function BulkEditModal({
  isOpen,
  onClose,
  selectedTasks = [],
  tags = [],
  groups = [],
  onSave
}: BulkEditModalProps) {
  // ESTADO
  const [formData, setFormData] = useState<BulkUpdateData>({});
  const [fieldsToUpdate, setFieldsToUpdate] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldComparisons, setFieldComparisons] = useState<FieldComparison[]>([]);
  
  // Estados para asignación individual
  const [individualMode, setIndividualMode] = useState<{
    dates: boolean;
    groups: boolean;
    tags: boolean;
  }>({ dates: false, groups: false, tags: false });
  const [individualData, setIndividualData] = useState<IndividualTaskData[]>([]);

  // OPCIONES DE PRIORIDAD
  const priorityOptions = [
    { value: 'LOW', label: 'Baja', color: 'bg-green-100 text-green-800' },
    { value: 'MEDIUM', label: 'Media', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'HIGH', label: 'Alta', color: 'bg-orange-100 text-orange-800' },
    { value: 'URGENT', label: 'Urgente', color: 'bg-red-100 text-red-800' }
  ];

  // EFECTO: Analizar campos cuando se abre el modal
  useEffect(() => {
    if (isOpen && selectedTasks && selectedTasks.length > 0) {
      analyzeFields();
      initializeIndividualData();
      setError(null);
      setFieldsToUpdate(new Set());
      setIndividualMode({ dates: false, groups: false, tags: false });
    }
  }, [isOpen, selectedTasks]);

  // FUNCIÓN: Analizar similitudes y diferencias entre tareas
  const analyzeFields = () => {
    if (!selectedTasks || selectedTasks.length === 0) {
      setFieldComparisons([]);
      return;
    }
    
    const comparisons: FieldComparison[] = [];

    // Analizar descripción
    const descriptions = selectedTasks.map(task => task.description || '');
    const uniqueDescriptions = [...new Set(descriptions)];
    comparisons.push({
      field: 'description',
      label: 'Descripción',
      hasCommonValue: uniqueDescriptions.length === 1,
      commonValue: uniqueDescriptions.length === 1 ? uniqueDescriptions[0] : undefined,
      differentValues: uniqueDescriptions,
      canEdit: true
    });

    // Analizar prioridad
    const priorities = selectedTasks.map(task => task.priority);
    const uniquePriorities = [...new Set(priorities)];
    comparisons.push({
      field: 'priority',
      label: 'Prioridad',
      hasCommonValue: uniquePriorities.length === 1,
      commonValue: uniquePriorities.length === 1 ? uniquePriorities[0] : undefined,
      differentValues: uniquePriorities,
      canEdit: true
    });

    // Analizar fecha de inicio
    const startDates = selectedTasks.map(task => task.startDate || '');
    const uniqueStartDates = [...new Set(startDates)];
    comparisons.push({
      field: 'startDate',
      label: 'Fecha de inicio',
      hasCommonValue: uniqueStartDates.length === 1,
      commonValue: uniqueStartDates.length === 1 ? uniqueStartDates[0] : undefined,
      differentValues: uniqueStartDates,
      canEdit: true
    });

    // Analizar fecha límite
    const dueDates = selectedTasks.map(task => task.dueDate || '');
    const uniqueDueDates = [...new Set(dueDates)];
    comparisons.push({
      field: 'dueDate',
      label: 'Fecha límite',
      hasCommonValue: uniqueDueDates.length === 1,
      commonValue: uniqueDueDates.length === 1 ? uniqueDueDates[0] : undefined,
      differentValues: uniqueDueDates,
      canEdit: true
    });

    // Analizar grupo
    const groupIds = selectedTasks.map(task => task.group?.id || '');
    const uniqueGroupIds = [...new Set(groupIds)];
    comparisons.push({
      field: 'groupId',
      label: 'Grupo',
      hasCommonValue: uniqueGroupIds.length === 1,
      commonValue: uniqueGroupIds.length === 1 ? uniqueGroupIds[0] : undefined,
      differentValues: uniqueGroupIds,
      canEdit: true
    });

    // Analizar etiquetas
    const allTagIds = selectedTasks.flatMap(task => task.tags.map(t => t.tag.id));
    const tagCounts = allTagIds.reduce((acc, tagId) => {
      acc[tagId] = (acc[tagId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const commonTagIds = Object.entries(tagCounts)
      .filter(([_, count]) => count === selectedTasks.length)
      .map(([tagId]) => tagId);
    
    comparisons.push({
      field: 'tagIds',
      label: 'Etiquetas',
      hasCommonValue: false, // Las etiquetas siempre se consideran diferentes para permitir edición
      commonValue: commonTagIds,
      differentValues: Object.keys(tagCounts),
      canEdit: true
    });

    setFieldComparisons(comparisons);

    // Inicializar formData con valores comunes
    const initialFormData: BulkUpdateData = {};
    comparisons.forEach(comp => {
      if (comp.hasCommonValue && comp.commonValue !== undefined && comp.commonValue !== '') {
        if (comp.field === 'tagIds') {
          initialFormData[comp.field] = comp.commonValue as string[];
        } else {
          (initialFormData as any)[comp.field] = comp.commonValue;
        }
      }
    });
    setFormData(initialFormData);
  };

  // FUNCIÓN: Inicializar datos individuales
  const initializeIndividualData = () => {
    if (!selectedTasks || selectedTasks.length === 0) return;
    
    const individualTasksData: IndividualTaskData[] = selectedTasks.map(task => ({
      taskId: task.id,
      title: task.title,
      startDate: task.startDate || '',
      dueDate: task.dueDate || '',
      groupId: task.group?.id || '',
      tagIds: task.tags.map(t => t.tag.id)
    }));
    
    setIndividualData(individualTasksData);
  };

  // FUNCIÓN: Alternar modo individual
  const toggleIndividualMode = (field: 'dates' | 'groups' | 'tags') => {
    setIndividualMode(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // FUNCIÓN: Actualizar datos individuales
  const updateIndividualData = (taskId: string, field: string, value: any) => {
    setIndividualData(prev => prev.map(task => 
      task.taskId === taskId 
        ? { ...task, [field]: value }
        : task
    ));
  };

  // FUNCIÓN: Manejar cambios en checkboxes de campos
  const handleFieldToggle = (field: string) => {
    const newFieldsToUpdate = new Set(fieldsToUpdate);
    if (newFieldsToUpdate.has(field)) {
      newFieldsToUpdate.delete(field);
    } else {
      newFieldsToUpdate.add(field);
    }
    setFieldsToUpdate(newFieldsToUpdate);
  };

  // FUNCIÓN: Manejar cambios en el formulario
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Agregar automáticamente el campo a los campos a actualizar
    setFieldsToUpdate(prev => new Set([...prev, field]));
  };

  // FUNCIÓN: Validar formulario
  const validateForm = (): string | null => {
    if (fieldsToUpdate.size === 0) {
      return 'Selecciona al menos un campo para actualizar';
    }

    // Validar fechas
    if (fieldsToUpdate.has('startDate') && fieldsToUpdate.has('dueDate')) {
      const startDate = formData.startDate ? new Date(formData.startDate) : null;
      const dueDate = formData.dueDate ? new Date(formData.dueDate) : null;
      
      if (startDate && dueDate && startDate > dueDate) {
        return 'La fecha de inicio no puede ser posterior a la fecha límite';
      }
    }

    // Validar descripción
    if (fieldsToUpdate.has('description') && formData.description && formData.description.length > 1000) {
      return 'La descripción debe tener menos de 1000 caracteres';
    }

    return null;
  };

  // FUNCIÓN: Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      // Construir datos de actualización
      const updates: BulkUpdateData = {};
      
      // Campos globales (no individuales)
      fieldsToUpdate.forEach(field => {
        if (field === 'description' || field === 'priority') {
          if (formData.hasOwnProperty(field)) {
            (updates as any)[field] = (formData as any)[field];
          }
        }
      });
      
      // Campos que pueden ser individuales o globales
      const hasIndividualDates = individualMode.dates && (fieldsToUpdate.has('startDate') || fieldsToUpdate.has('dueDate'));
      const hasIndividualGroups = individualMode.groups && fieldsToUpdate.has('groupId');
      const hasIndividualTags = individualMode.tags && fieldsToUpdate.has('tagIds');
      
      // Si hay asignaciones individuales, construir individualUpdates
      if (hasIndividualDates || hasIndividualGroups || hasIndividualTags) {
        updates.individualUpdates = {};
        
        individualData.forEach(task => {
          const taskUpdates: any = {};
          
          if (hasIndividualDates) {
            if (fieldsToUpdate.has('startDate')) taskUpdates.startDate = task.startDate;
            if (fieldsToUpdate.has('dueDate')) taskUpdates.dueDate = task.dueDate;
          }
          
          if (hasIndividualGroups) {
            taskUpdates.groupId = task.groupId;
          }
          
          if (hasIndividualTags) {
            taskUpdates.tagIds = task.tagIds;
          }
          
          if (Object.keys(taskUpdates).length > 0) {
            updates.individualUpdates![task.taskId] = taskUpdates;
          }
        });
      } else {
        // Modo global para fechas, grupos y etiquetas
        if (fieldsToUpdate.has('startDate') && !individualMode.dates) {
          updates.startDate = formData.startDate;
        }
        if (fieldsToUpdate.has('dueDate') && !individualMode.dates) {
          updates.dueDate = formData.dueDate;
        }
        if (fieldsToUpdate.has('groupId') && !individualMode.groups) {
          updates.groupId = formData.groupId;
        }
        if (fieldsToUpdate.has('tagIds') && !individualMode.tags) {
          updates.tagIds = formData.tagIds;
        }
      }

      console.log('🔍 BulkEditModal - Datos a enviar:');
      console.log('fieldsToUpdate:', Array.from(fieldsToUpdate));
      console.log('individualMode:', individualMode);
      console.log('formData:', formData);
      console.log('individualData:', individualData);
      console.log('updates:', updates);
      console.log('selectedTasks count:', selectedTasks.length);

      await onSave(updates);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al actualizar las tareas');
    } finally {
      setIsLoading(false);
    }
  };

  // FUNCIÓN: Obtener etiqueta de prioridad
  const getPriorityLabel = (priority: string) => {
    return priorityOptions.find(opt => opt.value === priority)?.label || priority;
  };

  // FUNCIÓN: Obtener nombre de grupo
  const getGroupName = (groupId: string) => {
    return groups.find(group => group.id === groupId)?.name || 'Sin grupo';
  };

  // FUNCIÓN: Obtener nombres de etiquetas
  const getTagNames = (tagIds: string[]) => {
    return tagIds.map(id => tags.find(tag => tag.id === id)?.name).filter(Boolean).join(', ');
  };

  // RENDERIZADO CONDICIONAL
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Editar múltiples tareas
              </h2>
              <p className="text-sm text-gray-500">
                {selectedTasks.length} tareas seleccionadas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ANÁLISIS DE CAMPOS */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Análisis de campos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fieldComparisons.map((comparison) => (
                  <div key={comparison.field} className="bg-white p-3 rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={fieldsToUpdate.has(comparison.field)}
                          onChange={() => handleFieldToggle(comparison.field)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium text-gray-700">
                          {comparison.label}
                        </span>
                      </label>
                      <span className={`px-2 py-1 rounded text-xs ${
                        comparison.hasCommonValue 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {comparison.hasCommonValue ? 'Común' : 'Diferente'}
                      </span>
                    </div>
                    
                    {comparison.hasCommonValue ? (
                      <div className="text-sm text-gray-600">
                        <strong>Valor actual:</strong> {
                          comparison.field === 'priority' ? getPriorityLabel(comparison.commonValue) :
                          comparison.field === 'groupId' ? getGroupName(comparison.commonValue) :
                          comparison.field === 'tagIds' ? getTagNames(comparison.commonValue) :
                          comparison.field === 'startDate' || comparison.field === 'dueDate' ? 
                            (comparison.commonValue ? new Date(comparison.commonValue).toLocaleDateString() : 'Sin fecha') :
                          comparison.commonValue || 'Vacío'
                        }
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">
                        <strong>Valores diferentes:</strong> {
                          comparison.field === 'priority' ? 
                            comparison.differentValues.map(getPriorityLabel).join(', ') :
                          comparison.field === 'groupId' ? 
                            comparison.differentValues.map(getGroupName).join(', ') :
                          comparison.field === 'tagIds' ? 
                            getTagNames(comparison.differentValues) :
                          comparison.differentValues.length
                        } valores distintos
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* CAMPOS DE EDICIÓN */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Nuevos valores
              </h3>

              {/* Descripción */}
              {fieldsToUpdate.has('description') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descripción de las tareas..."
                  />
                </div>
              )}

              {/* Prioridad */}
              {fieldsToUpdate.has('priority') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Flag className="inline h-4 w-4 mr-1" />
                    Prioridad
                  </label>
                  <select
                    value={formData.priority || ''}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar prioridad</option>
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Fechas */}
              {(fieldsToUpdate.has('startDate') || fieldsToUpdate.has('dueDate')) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium text-gray-900 flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Fechas
                    </h4>
                    <button
                      type="button"
                      onClick={() => toggleIndividualMode('dates')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        individualMode.dates
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {individualMode.dates ? 'Modo Global' : 'Asignar Individual'}
                    </button>
                  </div>
                  
                  {!individualMode.dates ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fieldsToUpdate.has('startDate') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de inicio
                          </label>
                          <input
                            type="date"
                            value={formData.startDate || ''}
                            onChange={(e) => handleInputChange('startDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                      {fieldsToUpdate.has('dueDate') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha límite
                          </label>
                          <input
                            type="date"
                            value={formData.dueDate || ''}
                            onChange={(e) => handleInputChange('dueDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                      <div className="space-y-3">
                        {individualData.map((task) => (
                          <div key={task.taskId} className="bg-white p-3 rounded border">
                            <div className="font-medium text-gray-900 mb-2 text-sm">
                              {task.title}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {fieldsToUpdate.has('startDate') && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Fecha de inicio
                                  </label>
                                  <input
                                    type="date"
                                    value={task.startDate || ''}
                                    onChange={(e) => updateIndividualData(task.taskId, 'startDate', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              )}
                              {fieldsToUpdate.has('dueDate') && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Fecha límite
                                  </label>
                                  <input
                                    type="date"
                                    value={task.dueDate || ''}
                                    onChange={(e) => updateIndividualData(task.taskId, 'dueDate', e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Grupo */}
              {fieldsToUpdate.has('groupId') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium text-gray-900 flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Grupo
                    </h4>
                    <button
                      type="button"
                      onClick={() => toggleIndividualMode('groups')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        individualMode.groups
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {individualMode.groups ? 'Modo Global' : 'Asignar Individual'}
                    </button>
                  </div>
                  
                  {!individualMode.groups ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grupo
                      </label>
                      <select
                        value={formData.groupId || ''}
                        onChange={(e) => handleInputChange('groupId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sin grupo</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                      <div className="space-y-3">
                        {individualData.map((task) => (
                          <div key={task.taskId} className="bg-white p-3 rounded border">
                            <div className="font-medium text-gray-900 mb-2 text-sm">
                              {task.title}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Grupo
                              </label>
                              <select
                                value={task.groupId || ''}
                                onChange={(e) => updateIndividualData(task.taskId, 'groupId', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">Sin grupo</option>
                                {groups.map((group) => (
                                  <option key={group.id} value={group.id}>
                                    {group.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Etiquetas */}
              {fieldsToUpdate.has('tagIds') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium text-gray-900 flex items-center">
                      <TagIcon className="h-5 w-5 mr-2" />
                      Etiquetas
                    </h4>
                    <button
                      type="button"
                      onClick={() => toggleIndividualMode('tags')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        individualMode.tags
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {individualMode.tags ? 'Modo Global' : 'Asignar Individual'}
                    </button>
                  </div>
                  
                  {!individualMode.tags ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Etiquetas
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                        {tags.map((tag) => (
                          <label key={tag.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={(formData.tagIds || []).includes(tag.id)}
                              onChange={(e) => {
                                const currentTags = formData.tagIds || [];
                                const newTags = e.target.checked
                                  ? [...currentTags, tag.id]
                                  : currentTags.filter(id => id !== tag.id);
                                handleInputChange('tagIds', newTags);
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span 
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{ backgroundColor: tag.color + '20', color: tag.color }}
                            >
                              {tag.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                      <div className="space-y-3">
                        {individualData.map((task) => (
                          <div key={task.taskId} className="bg-white p-3 rounded border">
                            <div className="font-medium text-gray-900 mb-2 text-sm">
                              {task.title}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Etiquetas
                              </label>
                              <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto border border-gray-300 rounded p-2">
                                {tags.map((tag) => (
                                  <label key={tag.id} className="flex items-center space-x-1">
                                    <input
                                      type="checkbox"
                                      checked={(task.tagIds || []).includes(tag.id)}
                                      onChange={(e) => {
                                        const currentTags = task.tagIds || [];
                                        const newTags = e.target.checked
                                          ? [...currentTags, tag.id]
                                          : currentTags.filter(id => id !== tag.id);
                                        updateIndividualData(task.taskId, 'tagIds', newTags);
                                      }}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 scale-75"
                                    />
                                    <span 
                                      className="px-1 py-0.5 rounded text-xs font-medium"
                                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                                    >
                                      {tag.name}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {fieldsToUpdate.size} campos seleccionados para actualizar
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || fieldsToUpdate.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Guardar cambios</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
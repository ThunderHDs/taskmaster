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
  // Para actualizaciones de subtareas
  subtaskUpdates?: {
    [key: string]: {
      title?: string;
      description?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      startDate?: string;
      dueDate?: string;
      completed?: boolean;
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
  
  // Estados para gestión de subtareas
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [showEditForms, setShowEditForms] = useState<Set<string>>(new Set());
  const [subtaskViewMode, setSubtaskViewMode] = useState<'hierarchy' | 'similar'>('hierarchy');
  const [subtaskEdits, setSubtaskEdits] = useState<{
    [key: string]: {
      title?: string;
      description?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      startDate?: string;
      dueDate?: string;
      completed?: boolean;
    };
  }>({});
  const [editingSubtasks, setEditingSubtasks] = useState<Set<string>>(new Set());

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
      
      // Auto-expandir tareas principales que tienen subtareas
      const tasksWithSubtasks = selectedTasks
        .filter(task => task.subtasks && task.subtasks.length > 0)
        .map(task => task.id);
      setExpandedTasks(new Set(tasksWithSubtasks));
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
    const allTagIds = selectedTasks.flatMap(task => (task.tags || []).map(t => t.tag.id));
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

    // Analizar subtareas
    const subtaskCounts = selectedTasks.map(task => task.subtasks?.length || 0);
    const uniqueSubtaskCounts = [...new Set(subtaskCounts)];
    const totalSubtasks = subtaskCounts.reduce((sum, count) => sum + count, 0);
    
    comparisons.push({
      field: 'subtasks',
      label: 'Subtareas',
      hasCommonValue: uniqueSubtaskCounts.length === 1,
      commonValue: uniqueSubtaskCounts.length === 1 ? uniqueSubtaskCounts[0] : undefined,
      differentValues: uniqueSubtaskCounts,
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

  // FUNCIÓN: Actualizar ediciones de subtareas
  const updateSubtaskEdit = (taskId: string, subtaskId: string, field: string, value: any) => {
    const key = `${taskId}-${subtaskId}`;
    setSubtaskEdits(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  // FUNCIÓN: Alternar expansión de tareas
  const toggleTaskExpansion = (taskKey: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskKey)) {
      newExpanded.delete(taskKey);
    } else {
      newExpanded.add(taskKey);
    }
    setExpandedTasks(newExpanded);
  };

  // FUNCIÓN: Alternar edición de subtareas
  const toggleSubtaskEdit = (subtaskKey: string) => {
    const newEditingSubtasks = new Set(editingSubtasks);
    if (newEditingSubtasks.has(subtaskKey)) {
      newEditingSubtasks.delete(subtaskKey);
    } else {
      newEditingSubtasks.add(subtaskKey);
    }
    setEditingSubtasks(newEditingSubtasks);
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

      // Agregar cambios de subtareas si existen
      if (Object.keys(subtaskEdits).length > 0) {
        updates.subtaskUpdates = subtaskEdits;
      }

      // Procesar cambios de grupos de tareas similares
      const { similarGroups } = groupSimilarTasks();
      const similarGroupUpdates: { [taskId: string]: any } = {};
      
      similarGroups.forEach(([groupKey, tasks], groupIndex) => {
        const groupTitleKey = `group-${groupIndex}-title`;
        const groupPriorityKey = `group-${groupIndex}-priority`;
        const groupDescriptionKey = `group-${groupIndex}-description`;
        
        const hasGroupChanges = subtaskEdits[groupTitleKey] || 
                               subtaskEdits[groupPriorityKey] || 
                               subtaskEdits[groupDescriptionKey];
        
        if (hasGroupChanges) {
          tasks.forEach(task => {
            similarGroupUpdates[task.id] = {
              ...(subtaskEdits[groupTitleKey] && { title: subtaskEdits[groupTitleKey] }),
              ...(subtaskEdits[groupPriorityKey] && { priority: subtaskEdits[groupPriorityKey] }),
              ...(subtaskEdits[groupDescriptionKey] && { description: subtaskEdits[groupDescriptionKey] })
            };
          });
        }
      });
      
      // Agregar actualizaciones de grupos similares
      if (Object.keys(similarGroupUpdates).length > 0) {
        if (!updates.individualUpdates) {
          updates.individualUpdates = {};
        }
        Object.assign(updates.individualUpdates, similarGroupUpdates);
      }

      console.log('🔍 BulkEditModal - Datos a enviar:');
      console.log('fieldsToUpdate:', Array.from(fieldsToUpdate));
      console.log('individualMode:', individualMode);
      console.log('formData:', formData);
      console.log('individualData:', individualData);
      console.log('subtaskEdits:', subtaskEdits);
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

  // FUNCIÓN: Agrupar tareas similares por título y datos
  const groupSimilarTasks = () => {
    const groups: { [key: string]: Task[] } = {};
    
    selectedTasks.forEach(task => {
      // Crear una clave basada en título, prioridad, grupo y etiquetas
      const groupKey = `${task.title.toLowerCase().trim()}-${task.priority}-${task.group?.id || 'no-group'}-${task.tags.map(t => t.tag.id).sort().join(',')}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });
    
    // Separar grupos similares (más de 1 tarea) de las diferentes
    const similarGroups = Object.entries(groups).filter(([_, tasks]) => tasks.length > 1);
    const differentTasks = Object.entries(groups).filter(([_, tasks]) => tasks.length === 1).map(([_, tasks]) => tasks[0]);
    
    return { similarGroups, differentTasks };
  };


  


  // FUNCIÓN: Renderizar grupo de tareas similares
  const renderSimilarTaskGroup = (tasks: Task[], groupIndex: number): JSX.Element => {
    const representativeTask = tasks[0];
    const hasSubtasks = tasks.some(task => task.subtasks && task.subtasks.length > 0);
    const groupKey = `similar-group-${groupIndex}`;
    const isExpanded = expandedTasks.has(groupKey);
    
    return (
      <div key={groupKey} className="border border-gray-200 rounded-lg overflow-hidden mb-3">
        {/* Encabezado del grupo */}
        <div className="px-4 py-3 bg-green-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="font-semibold text-green-800 text-base">
                {representativeTask.title} ({tasks.length} tareas similares)
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Información del grupo */}
            <div className="flex items-center space-x-2 text-sm text-green-700">
              <span className="px-2 py-1 bg-green-100 rounded text-xs font-medium">
                {getPriorityLabel(representativeTask.priority)}
              </span>
              {representativeTask.group && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  {representativeTask.group.name}
                </span>
              )}
            </div>
            
            {/* Botón de expandir/contraer */}
            <button
              type="button"
              onClick={() => {
                const newExpanded = new Set(expandedTasks);
                if (isExpanded) {
                  newExpanded.delete(groupKey);
                } else {
                  newExpanded.add(groupKey);
                }
                setExpandedTasks(newExpanded);
              }}
              className="p-1 text-green-600 hover:text-green-800 transition-colors"
            >
              <svg 
                className={`h-4 w-4 transform transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Contenido expandible */}
        {isExpanded && (
          <div className="bg-white">
            {/* Formulario común para el grupo */}
            <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
              <h5 className="text-sm font-medium text-gray-900 mb-3">Editar todas las tareas del grupo:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Título común */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nuevo título
                  </label>
                  <input
                    type="text"
                    value={subtaskEdits[`group-${groupIndex}-title`] ?? representativeTask.title}
                    onChange={(e) => updateSubtaskEdit('group', `${groupIndex}-title`, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Título común para todas las tareas"
                  />
                </div>

                {/* Prioridad común */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={subtaskEdits[`group-${groupIndex}-priority`] ?? representativeTask.priority}
                    onChange={(e) => updateSubtaskEdit('group', `${groupIndex}-priority`, 'priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                {/* Descripción común */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={subtaskEdits[`group-${groupIndex}-description`] ?? representativeTask.description ?? ''}
                    onChange={(e) => updateSubtaskEdit('group', `${groupIndex}-description`, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={2}
                    placeholder="Descripción común para todas las tareas"
                  />
                </div>
              </div>
              
              {/* Indicador de cambios */}
              {(subtaskEdits[`group-${groupIndex}-title`] || subtaskEdits[`group-${groupIndex}-priority`] || subtaskEdits[`group-${groupIndex}-description`]) && (
                <div className="mt-3 flex items-center space-x-2 text-sm text-green-600">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Cambios pendientes para {tasks.length} tareas similares</span>
                </div>
              )}
            </div>
            
            {/* Lista de tareas individuales simplificada */}
            <div className="p-4">
              <h5 className="text-sm font-medium text-gray-900 mb-3">Tareas padre ({tasks.length}):</h5>
              <div className="space-y-2">
                {tasks.map((task, taskIndex) => (
                  <div key={task.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        <span className="font-medium text-green-800 text-sm">
                          {task.title} #{taskIndex + 1}
                        </span>
                        <span className="text-xs text-green-600">
                          ID: {task.id.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-green-700">
                        <span className="px-2 py-1 bg-green-100 rounded">
                          {getPriorityLabel(task.priority)}
                        </span>
                        {task.subtasks && task.subtasks.length > 0 && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {task.subtasks.length} subtareas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Subtareas similares editables */}
              {(() => {
                // Recopilar todas las subtareas de todas las tareas similares
                const allSubtasks: Task[] = [];
                tasks.forEach(task => {
                  if (task.subtasks && task.subtasks.length > 0) {
                    task.subtasks.forEach(subtask => {
                      allSubtasks.push({ ...subtask, parentId: task.id });
                    });
                  }
                });
                
                if (allSubtasks.length === 0) return null;
                
                return (
                  <div className="mt-6">
                    <h5 className="text-sm font-medium text-gray-900 mb-3">
                      Subtareas similares ({allSubtasks.length}):
                    </h5>
                    <div className="space-y-2">
                      {allSubtasks.map(subtask => renderTaskHierarchy(subtask, 1))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    );
  };

  // FUNCIÓN: Renderizar jerarquía de tareas de forma recursiva
  const renderTaskHierarchy = (task: Task, level: number = 0): JSX.Element => {
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    
    // Clases de indentación más claras
    const getIndentClass = () => {
      if (level === 0) return '';
      if (level === 1) return 'ml-4 border-l-2 border-blue-200 pl-4';
      return 'ml-6 border-l-2 border-gray-300 pl-3';
    };
    
    // Colores de fondo por nivel
    const getBackgroundClass = () => {
      if (level === 0) return 'bg-gray-100';
      if (level === 1) return 'bg-blue-50';
      return 'bg-gray-50';
    };
    
    // Solo las subtareas (nivel > 0) tienen formularios de edición
    const canEdit = level > 0;
    const taskKey = `${task.parentId || 'root'}-${task.id}`;
    const isEditFormOpen = showEditForms.has(taskKey);

    return (
      <div key={task.id} className={`${getIndentClass()} ${level > 0 ? 'mt-1' : 'mb-2'}`}>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Encabezado de la tarea */}
          <div className={`px-4 py-3 flex items-center justify-between ${getBackgroundClass()}`}>
            <div className="flex items-center space-x-3">
              {/* Icono según el nivel */}
              {level === 0 ? (
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="font-semibold text-gray-900 text-base">{task.title}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    level === 1 ? 'bg-blue-400' : 'bg-gray-400'
                  }`}></div>
                  <span className={`font-medium ${
                    level === 1 ? 'text-gray-800 text-sm' : 'text-gray-700 text-sm'
                  }`}>{task.title}</span>
                </div>
              )}
            </div>
            
            {/* Botones de acción */}
            <div className="flex items-center space-x-2">
              {/* Botón de editar (solo para subtareas) */}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    const newShowEditForms = new Set(showEditForms);
                    if (isEditFormOpen) {
                      newShowEditForms.delete(taskKey);
                    } else {
                      newShowEditForms.add(taskKey);
                    }
                    setShowEditForms(newShowEditForms);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    isEditFormOpen 
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isEditFormOpen ? 'Ocultar' : 'Editar'}
                </button>
              )}
              
              {/* Botón de expandir/contraer (solo si tiene subtareas) */}
              {hasSubtasks && (
                <button
                  type="button"
                  onClick={() => {
                    const newExpanded = new Set(expandedTasks);
                    if (isExpanded) {
                      newExpanded.delete(task.id);
                    } else {
                      newExpanded.add(task.id);
                    }
                    setExpandedTasks(newExpanded);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg 
                    className={`h-4 w-4 transform transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Formulario de edición (solo para subtareas cuando está activado) */}
          {canEdit && isEditFormOpen && (
            <div className="px-4 py-4 bg-white border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={subtaskEdits[`${task.parentId || 'root'}-${task.id}`]?.title ?? task.title}
                    onChange={(e) => updateSubtaskEdit(task.parentId || 'root', task.id, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Título de la subtarea"
                  />
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={subtaskEdits[`${task.parentId || 'root'}-${task.id}`]?.priority ?? task.priority}
                    onChange={(e) => updateSubtaskEdit(task.parentId || 'root', task.id, 'priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                {/* Fecha de inicio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de inicio
                  </label>
                  <input
                    type="date"
                    value={subtaskEdits[`${task.parentId || 'root'}-${task.id}`]?.startDate ?? (task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '')}
                    onChange={(e) => updateSubtaskEdit(task.parentId || 'root', task.id, 'startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Fecha de vencimiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de vencimiento
                  </label>
                  <input
                    type="date"
                    value={subtaskEdits[`${task.parentId || 'root'}-${task.id}`]?.dueDate ?? (task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '')}
                    onChange={(e) => updateSubtaskEdit(task.parentId || 'root', task.id, 'dueDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Descripción */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={subtaskEdits[`${task.parentId || 'root'}-${task.id}`]?.description ?? task.description ?? ''}
                    onChange={(e) => updateSubtaskEdit(task.parentId || 'root', task.id, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Descripción de la subtarea"
                  />
                </div>

                {/* Estado completado */}
                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={subtaskEdits[`${task.parentId || 'root'}-${task.id}`]?.completed ?? task.completed}
                      onChange={(e) => updateSubtaskEdit(task.parentId || 'root', task.id, 'completed', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Marcar como completada</span>
                  </label>
                </div>
              </div>

              {/* Indicador de cambios */}
              {subtaskEdits[`${task.parentId || 'root'}-${task.id}`] && (
                <div className="mt-3 flex items-center space-x-2 text-sm text-blue-600">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Cambios pendientes de guardar</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Renderizado recursivo de subtareas - máximo 3 niveles */}
        {hasSubtasks && isExpanded && level < 2 && (
          <div className="mt-2 space-y-1">
            {task.subtasks?.map(subtask => renderTaskHierarchy(subtask, level + 1))}
          </div>
        )}
      </div>
    );
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
            type="button"
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
                {fieldComparisons.filter(comparison => comparison.field !== 'subtasks').map((comparison) => (
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
              
              {/* Sección de Subtareas - Ocupa todo el ancho */}
              {fieldComparisons.find(comparison => comparison.field === 'subtasks') && (
                <div className="mt-4 bg-white p-4 rounded border">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={fieldsToUpdate.has('subtasks')}
                        onChange={() => handleFieldToggle('subtasks')}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 scale-110"
                      />
                      <div className="flex items-center space-x-2">
                        <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <span className="text-lg font-medium text-gray-700">
                          Subtareas
                        </span>
                      </div>
                    </label>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      fieldComparisons.find(comparison => comparison.field === 'subtasks')?.hasCommonValue
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {fieldComparisons.find(comparison => comparison.field === 'subtasks')?.hasCommonValue ? 'Común' : 'Diferente'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {(() => {
                      const subtaskComparison = fieldComparisons.find(comparison => comparison.field === 'subtasks');
                      return subtaskComparison?.hasCommonValue ? (
                        <span><strong>Valor actual:</strong> {subtaskComparison.commonValue} subtarea{subtaskComparison.commonValue !== 1 ? 's' : ''} cada una</span>
                      ) : (
                        <span><strong>Valores diferentes:</strong> {subtaskComparison?.differentValues.join(', ')} subtareas por tarea</span>
                      );
                    })()} 
                  </div>
                </div>
              )}
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

              {/* Subtareas */}
              {fieldsToUpdate.has('subtasks') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium text-gray-900 flex items-center">
                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Gestión de Subtareas
                    </h4>
                    
                    {/* Selector de vista */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => setSubtaskViewMode('hierarchy')}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                          subtaskViewMode === 'hierarchy'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Vista Jerárquica
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubtaskViewMode('similar')}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                          subtaskViewMode === 'similar'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Tareas Similares
                      </button>
                    </div>
                  </div>
                  
                  {/* Vista Jerárquica */}
                  {subtaskViewMode === 'hierarchy' && (
                    selectedTasks.filter(task => task.subtasks && task.subtasks.length > 0).length === 0 ? (
                      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                        <svg className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay subtareas para editar</h3>
                        <p className="text-gray-500 text-sm">
                          Las tareas seleccionadas no tienen subtareas. Solo se mostrarán las tareas que contengan subtareas.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                        {selectedTasks
                          .filter(task => {
                            // Solo mostrar tareas que tienen subtareas
                            if (!task.subtasks || task.subtasks.length === 0) return false;
                            
                            // Excluir tareas que son subtareas de otras tareas seleccionadas
                            const isSubtaskOfSelected = selectedTasks.some(parentTask => 
                              parentTask.id !== task.id && 
                              parentTask.subtasks?.some(subtask => subtask.id === task.id)
                            );
                            
                            return !isSubtaskOfSelected;
                          })
                          .map((task) => renderTaskHierarchy(task, 0))}
                      </div>
                    )
                  )}
                  
                  {/* Vista de Tareas Similares */}
                  {subtaskViewMode === 'similar' && (() => {
                    const { similarGroups, differentTasks } = groupSimilarTasks();
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                        <div className="p-4">
                          <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-3">
                              Se han encontrado tareas con títulos, prioridades, grupos y etiquetas similares. 
                              Puedes editarlas en grupo para aplicar cambios a todas las tareas similares a la vez.
                            </p>
                          </div>
                          
                          {/* Subtareas similares con vista jerárquica */}
                          {(() => {
                            // Recopilar todas las subtareas de todas las tareas seleccionadas
                            const allSubtasks: Task[] = [];
                            selectedTasks.forEach(task => {
                              if (task.subtasks && task.subtasks.length > 0) {
                                task.subtasks.forEach(subtask => {
                                  allSubtasks.push({ ...subtask, parentId: task.id });
                                });
                              }
                            });
                            
                            if (allSubtasks.length === 0) {
                              return (
                                <div className="text-center py-8">
                                  <svg className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay subtareas similares</h3>
                                  <p className="text-gray-500 text-sm">
                                    Las tareas seleccionadas no tienen subtareas para mostrar.
                                  </p>
                                </div>
                              );
                            }
                            
                            return (
                              <div>
                                <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                                  <svg className="h-4 w-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                  Subtareas Similares ({allSubtasks.length})
                                </h5>
                                
                                <div className="bg-green-25 rounded-lg p-3 mb-4">
                                  <p className="text-xs text-green-700 mb-1">
                                    🌳 <strong>Vista jerárquica de subtareas similares:</strong>
                                  </p>
                                  <p className="text-xs text-green-600">
                                    Todas las subtareas de las tareas seleccionadas. Estructura replicada exactamente de la sección de tareas únicas.
                                  </p>
                                </div>
                                
                                {/* Renderizado de subtareas similares editables */}
                                <div className="space-y-3">
                                  {allSubtasks.map(subtask => {
                                    // Función renderTask replicada exactamente de tareas únicas
                                    const renderTask = (currentTask: Task, level: number = 0): React.ReactNode => {
                                      const hasSubtasks = currentTask.subtasks && currentTask.subtasks.length > 0;
                                      const isExpanded = expandedTasks.has(currentTask.id);
                                      
                                      return (
                                        <div key={currentTask.id} className={`${level > 0 ? 'ml-6 border-l-2 border-blue-200 pl-4' : ''}`}>
                                          <div 
                                            className={`bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-300 ${
                                              currentTask.completed ? 'opacity-75' : ''
                                            }`}
                                          >
                                            <div className="flex items-start justify-between">
                                              <div className="flex items-start space-x-3 flex-1">
                                                {/* Botón de expandir/colapsar para subtareas con sub-subtareas */}
                                                {hasSubtasks && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      const newExpanded = new Set(expandedTasks);
                                                      if (isExpanded) {
                                                        newExpanded.delete(currentTask.id);
                                                      } else {
                                                        newExpanded.add(currentTask.id);
                                                      }
                                                      setExpandedTasks(newExpanded);
                                                    }}
                                                    className="mt-1 p-1 hover:bg-gray-100 rounded transition-colors"
                                                  >
                                                    {isExpanded ? (
                                                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                      </svg>
                                                    ) : (
                                                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                      </svg>
                                                    )}
                                                  </button>
                                                )}

                                                {/* Contenido principal de la subtarea */}
                                                <div className="flex-1 min-w-0">
                                                  {/* Título editable de la subtarea */}
                                                  <div className="flex items-center space-x-2 mb-3">
                                                    <input
                                                      type="checkbox"
                                                      checked={subtaskEdits[currentTask.id]?.completed ?? currentTask.completed}
                                                      onChange={(e) => {
                                                        setSubtaskEdits(prev => ({
                                                          ...prev,
                                                          [currentTask.id]: {
                                                            ...prev[currentTask.id],
                                                            completed: e.target.checked
                                                          }
                                                        }));
                                                      }}
                                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <input
                                                      type="text"
                                                      value={subtaskEdits[currentTask.id]?.title ?? currentTask.title}
                                                      onChange={(e) => {
                                                        setSubtaskEdits(prev => ({
                                                          ...prev,
                                                          [currentTask.id]: {
                                                            ...prev[currentTask.id],
                                                            title: e.target.value
                                                          }
                                                        }));
                                                      }}
                                                      className="flex-1 text-sm font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white rounded px-2 py-1"
                                                      placeholder="Título de la subtarea"
                                                    />
                                                  </div>

                                                  {/* Campos editables adicionales */}
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                                    {/* Prioridad */}
                                                    <div>
                                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Prioridad
                                                      </label>
                                                      <select
                                                        value={subtaskEdits[currentTask.id]?.priority ?? currentTask.priority}
                                                        onChange={(e) => {
                                                          setSubtaskEdits(prev => ({
                                                            ...prev,
                                                            [currentTask.id]: {
                                                              ...prev[currentTask.id],
                                                              priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
                                                            }
                                                          }));
                                                        }}
                                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                      >
                                                        <option value="LOW">Baja</option>
                                                        <option value="MEDIUM">Media</option>
                                                        <option value="HIGH">Alta</option>
                                                        <option value="URGENT">Urgente</option>
                                                      </select>
                                                    </div>

                                                    {/* Fecha de inicio */}
                                                    <div>
                                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Fecha de inicio
                                                      </label>
                                                      <input
                                                        type="date"
                                                        value={subtaskEdits[currentTask.id]?.startDate ?? (currentTask.startDate ? new Date(currentTask.startDate).toISOString().split('T')[0] : '')}
                                                        onChange={(e) => {
                                                          setSubtaskEdits(prev => ({
                                                            ...prev,
                                                            [currentTask.id]: {
                                                              ...prev[currentTask.id],
                                                              startDate: e.target.value
                                                            }
                                                          }));
                                                        }}
                                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                      />
                                                    </div>

                                                    {/* Fecha de vencimiento */}
                                                    <div>
                                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Fecha de vencimiento
                                                      </label>
                                                      <input
                                                        type="date"
                                                        value={subtaskEdits[currentTask.id]?.dueDate ?? (currentTask.dueDate ? new Date(currentTask.dueDate).toISOString().split('T')[0] : '')}
                                                        onChange={(e) => {
                                                          setSubtaskEdits(prev => ({
                                                            ...prev,
                                                            [currentTask.id]: {
                                                              ...prev[currentTask.id],
                                                              dueDate: e.target.value
                                                            }
                                                          }));
                                                        }}
                                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                      />
                                                    </div>
                                                  </div>

                                                  {/* Descripción */}
                                                  <div className="mb-3">
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                      Descripción
                                                    </label>
                                                    <textarea
                                                      value={subtaskEdits[currentTask.id]?.description ?? currentTask.description ?? ''}
                                                      onChange={(e) => {
                                                        setSubtaskEdits(prev => ({
                                                          ...prev,
                                                          [currentTask.id]: {
                                                            ...prev[currentTask.id],
                                                            description: e.target.value
                                                          }
                                                        }));
                                                      }}
                                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                      rows={2}
                                                      placeholder="Descripción de la subtarea"
                                                    />
                                                  </div>

                                                  {/* Indicador de cambios */}
                                                  {subtaskEdits[currentTask.id] && (
                                                    <div className="flex items-center space-x-2 text-xs text-blue-600">
                                                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                      </svg>
                                                      <span>Cambios pendientes de guardar</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Renderizado recursivo de sub-subtareas - máximo 3 niveles */}
                                          {hasSubtasks && isExpanded && level < 2 && (
                                            <div className="mt-2 space-y-1">
                                              {currentTask.subtasks?.map(subSubtask => renderTask(subSubtask, level + 1))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    };
                                    
                                    return renderTask(subtask, 0);
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                          
                          {/* Tareas únicas con vista jerárquica */}
                          {differentTasks.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-gray-200">
                              <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                                <svg className="h-4 w-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Tareas Únicas ({differentTasks.length})
                              </h5>
                              
                              <div className="bg-orange-25 rounded-lg p-3 mb-4">
                                <p className="text-xs text-orange-700 mb-1">
                                  🌳 <strong>Vista jerárquica de tareas únicas:</strong>
                                </p>
                                <p className="text-xs text-orange-600">
                                  Estas tareas no tienen similares. Estructura de árbol replicada exactamente de TaskList.tsx.
                                </p>
                              </div>
                              
                              {/* Renderizado simplificado de tareas únicas con subtareas editables */}
                              <div className="space-y-3">
                                {differentTasks.filter(task => !task.parentId).map(task => {
                                  // Función renderTask simplificada para tareas padre y subtareas editables
                                  const renderTask = (currentTask: Task, level: number = 0): React.ReactNode => {
                                    const hasSubtasks = currentTask.subtasks && currentTask.subtasks.length > 0;
                                    const isExpanded = expandedTasks.has(currentTask.id);
                                    const isParentTask = level === 0;
                                    
                                    return (
                                      <div key={currentTask.id} className={`${level > 0 ? 'ml-6 border-l-2 border-blue-200 pl-4' : ''}`}>
                                        <div 
                                          className={`${
                                            isParentTask 
                                              ? 'bg-gray-50 rounded-lg border border-gray-300 p-3 mb-3' 
                                              : 'bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-300'
                                          } ${
                                            currentTask.completed ? 'opacity-75' : ''
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
                                                      newExpanded.delete(currentTask.id);
                                                    } else {
                                                      newExpanded.add(currentTask.id);
                                                    }
                                                    setExpandedTasks(newExpanded);
                                                  }}
                                                  className="mt-1 p-1 hover:bg-gray-100 rounded transition-colors"
                                                >
                                                  {isExpanded ? (
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                  ) : (
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                  )}
                                                </button>
                                              )}

                                              {/* Contenido principal de la tarea */}
                                              <div className="flex-1 min-w-0">
                                                {isParentTask ? (
                                                  // Vista simplificada para tareas padre
                                                  <div className="flex items-center space-x-2">
                                                    <h3 className="text-sm font-medium text-gray-700">
                                                      {currentTask.title}
                                                    </h3>
                                                    {hasSubtasks && (
                                                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                                        {currentTask.subtasks.filter(st => st.completed).length}/{currentTask.subtasks.length} subtareas
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
                                                        checked={subtaskEdits[currentTask.id]?.completed ?? currentTask.completed}
                                                        onChange={(e) => {
                                                          setSubtaskEdits(prev => ({
                                                            ...prev,
                                                            [currentTask.id]: {
                                                              ...prev[currentTask.id],
                                                              completed: e.target.checked
                                                            }
                                                          }));
                                                        }}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 transition-all duration-200"
                                                      />
                                                      <input
                                                        type="text"
                                                        value={subtaskEdits[currentTask.id]?.title ?? currentTask.title}
                                                        onChange={(e) => {
                                                          setSubtaskEdits(prev => ({
                                                            ...prev,
                                                            [currentTask.id]: {
                                                              ...prev[currentTask.id],
                                                              title: e.target.value
                                                            }
                                                          }));
                                                        }}
                                                        className="flex-1 text-sm font-medium border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 bg-transparent px-0 py-1"
                                                        placeholder="Título de la subtarea"
                                                      />
                                                    </div>

                                                    {/* Descripción editable */}
                                                    <div className="mb-3">
                                                      <textarea
                                                        value={subtaskEdits[currentTask.id]?.description ?? currentTask.description ?? ''}
                                                        onChange={(e) => {
                                                          setSubtaskEdits(prev => ({
                                                            ...prev,
                                                            [currentTask.id]: {
                                                              ...prev[currentTask.id],
                                                              description: e.target.value
                                                            }
                                                          }));
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
                                                        value={subtaskEdits[currentTask.id]?.priority ?? currentTask.priority}
                                                        onChange={(e) => {
                                                          setSubtaskEdits(prev => ({
                                                            ...prev,
                                                            [currentTask.id]: {
                                                              ...prev[currentTask.id],
                                                              priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
                                                            }
                                                          }));
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
                                                        value={subtaskEdits[currentTask.id]?.startDate ?? currentTask.startDate ?? ''}
                                                        onChange={(e) => {
                                                          setSubtaskEdits(prev => ({
                                                            ...prev,
                                                            [currentTask.id]: {
                                                              ...prev[currentTask.id],
                                                              startDate: e.target.value
                                                            }
                                                          }));
                                                        }}
                                                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                      />

                                                      {/* Fecha de vencimiento editable */}
                                                      <input
                                                        type="date"
                                                        value={subtaskEdits[currentTask.id]?.dueDate ?? currentTask.dueDate ?? ''}
                                                        onChange={(e) => {
                                                          setSubtaskEdits(prev => ({
                                                            ...prev,
                                                            [currentTask.id]: {
                                                              ...prev[currentTask.id],
                                                              dueDate: e.target.value
                                                            }
                                                          }));
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
                                            {currentTask.subtasks && currentTask.subtasks
                                              .filter(subtask => {
                                                // Filtrar subtareas que ya aparecen en grupos similares
                                                const { similarGroups } = groupSimilarTasks();
                                                const isInSimilarGroup = similarGroups.some(([groupKey, tasks]) => 
                                                  tasks.some(task => task.id === subtask.id)
                                                );
                                                return !isInSimilarGroup;
                                              })
                                              .map(subtask => renderTask(subtask, level + 1))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  };
                                  
                                  return renderTask(task, 0);
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Resumen de cambios */}
                  {Object.keys(subtaskEdits).length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
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
              type="submit"
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
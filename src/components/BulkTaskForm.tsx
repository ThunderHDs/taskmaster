'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Tag as TagIcon, Users, AlertCircle } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';

// TypeScript interfaces
interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TaskGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface BulkTaskData {
  titles: string[];
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate: Date | null;
  dueDate: Date | null;
  tagIds: string[];
  groupId?: string;
  subtasks: string[];
  individualData?: IndividualTaskData[];
}

interface IndividualTaskData {
  title: string;
  startDate?: Date | null;
  dueDate?: Date | null;
  groupId?: string;
  tagIds?: string[];
}

interface BulkTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: BulkTaskData) => void;
  availableTags: Tag[];
  availableGroups: TaskGroup[];
  isLoading?: boolean;
}

const BulkTaskForm: React.FC<BulkTaskFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availableTags,
  availableGroups,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<BulkTaskData>({
    titles: [''],
    description: '',
    priority: 'MEDIUM',
    startDate: null,
    dueDate: null,
    tagIds: [],
    groupId: '',
    subtasks: ['']
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Estados para asignación individual
  const [individualMode, setIndividualMode] = useState({
    dates: false,
    groups: false,
    tags: false
  });
  const [individualData, setIndividualData] = useState<IndividualTaskData[]>([]);

  // Priority options
  const priorityOptions = [
    { value: 'LOW', label: 'Baja', color: 'text-green-600' },
    { value: 'MEDIUM', label: 'Media', color: 'text-yellow-600' },
    { value: 'HIGH', label: 'Alta', color: 'text-orange-600' },
    { value: 'URGENT', label: 'Urgente', color: 'text-red-600' }
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        titles: [''],
        description: '',
        priority: 'MEDIUM',
        startDate: null,
        dueDate: null,
        tagIds: [],
        groupId: '',
        subtasks: ['']
      });
      setErrors({});
      setIndividualMode({ dates: false, groups: false, tags: false });
      initializeIndividualData(['']);
    }
  }, [isOpen]);
  
  // Initialize individual data when titles change
  useEffect(() => {
    initializeIndividualData(formData.titles);
  }, [formData.titles.length]);

  // FUNCIÓN: Inicializar datos individuales
  const initializeIndividualData = (titles: string[]) => {
    const newIndividualData = titles.map(title => ({
      title: title,
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      groupId: formData.groupId,
      tagIds: [...formData.tagIds]
    }));
    setIndividualData(newIndividualData);
  };

  // FUNCIÓN: Alternar modo individual
  const toggleIndividualMode = (field: 'dates' | 'groups' | 'tags') => {
    setIndividualMode(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // FUNCIÓN: Actualizar datos individuales
  const updateIndividualData = (index: number, field: string, value: any) => {
    setIndividualData(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  // Add new title field
  const addTitleField = () => {
    setFormData(prev => ({
      ...prev,
      titles: [...prev.titles, '']
    }));
  };

  // Remove title field
  const removeTitleField = (index: number) => {
    if (formData.titles.length > 1) {
      setFormData(prev => ({
        ...prev,
        titles: prev.titles.filter((_, i) => i !== index)
      }));
    }
  };

  // Update title field
  const updateTitleField = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      titles: prev.titles.map((title, i) => i === index ? value : title)
    }));
  };

  // Add new subtask field
  const addSubtaskField = () => {
    setFormData(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, '']
    }));
  };

  // Remove subtask field
  const removeSubtaskField = (index: number) => {
    if (formData.subtasks.length > 1) {
      setFormData(prev => ({
        ...prev,
        subtasks: prev.subtasks.filter((_, i) => i !== index)
      }));
    }
  };

  // Update subtask field
  const updateSubtaskField = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.map((subtask, i) => i === index ? value : subtask)
    }));
  };

  // Handle tag selection
  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate titles
    const validTitles = formData.titles.filter(title => title.trim());
    if (validTitles.length === 0) {
      newErrors.titles = 'Al menos un título de tarea es requerido';
    } else if (validTitles.some(title => title.trim().length > 200)) {
      newErrors.titles = 'Los títulos deben tener menos de 200 caracteres';
    }

    // Check for duplicate titles
    const titleSet = new Set(validTitles.map(title => title.trim().toLowerCase()));
    if (titleSet && titleSet.size !== undefined && titleSet.size !== validTitles.length) {
      newErrors.titles = 'No se permiten títulos duplicados';
    }

    // Validate description
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'La descripción debe tener menos de 1000 caracteres';
    }



    // Validate date range
    if (formData.startDate && formData.dueDate) {
      if (formData.startDate > formData.dueDate) {
        newErrors.dateRange = 'La fecha de inicio no puede ser posterior a la fecha límite';
      }
    }
    
    if (formData.startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (formData.startDate < today) {
        newErrors.dateRange = 'La fecha de inicio no puede ser en el pasado';
      }
    }
    
    if (formData.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (formData.dueDate < today) {
        newErrors.dateRange = 'La fecha límite no puede ser en el pasado';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Filter out empty titles and subtasks
      const cleanedTitles = formData.titles.filter(title => title.trim());
      const cleanedSubtasks = formData.subtasks.filter(subtask => subtask.trim());
      
      // Prepare individual data if any individual mode is active
      let individualDataToSend: IndividualTaskData[] | undefined;
      
      if (individualMode.dates || individualMode.groups || individualMode.tags) {
        individualDataToSend = cleanedTitles.map((title, index) => ({
          title,
          startDate: individualMode.dates ? (individualData[index]?.startDate || null) : undefined,
          dueDate: individualMode.dates ? (individualData[index]?.dueDate || null) : undefined,
          groupId: individualMode.groups ? (individualData[index]?.groupId || '') : undefined,
          tagIds: individualMode.tags ? (individualData[index]?.tagIds || []) : undefined
        }));
      }
      
      const cleanedData = {
        ...formData,
        titles: cleanedTitles,
        subtasks: cleanedSubtasks,
        individualData: individualDataToSend
      };
      
      onSubmit(cleanedData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Crear Múltiples Tareas
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form id="bulk-task-form" onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Títulos de las tareas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Títulos de las Tareas *
            </label>
            <div className="space-y-2">
              {formData.titles.map((title, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => updateTitleField(index, e.target.value)}
                    placeholder={`Título de la tarea ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-300"
                    disabled={isLoading}
                  />
                  {formData.titles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTitleField(index)}
                      className="px-3 py-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addTitleField}
              className="mt-2 flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4" />
              Agregar otro título
            </button>
            {errors.titles && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.titles}
              </p>
            )}
          </div>

          {/* Descripción común */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descripción (común para todas las tareas)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción opcional que se aplicará a todas las tareas..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-300"
              disabled={isLoading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.description}
              </p>
            )}
          </div>

          {/* Grupo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <Users className="w-4 h-4 inline mr-1" />
                Grupo
              </label>
              <button
                type="button"
                onClick={() => toggleIndividualMode('groups')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  individualMode.groups
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                disabled={isLoading}
              >
                {individualMode.groups ? 'Modo Global' : 'Asignar Individual'}
              </button>
            </div>
            
            {!individualMode.groups ? (
              <select
                value={formData.groupId}
                onChange={(e) => setFormData(prev => ({ ...prev, groupId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={isLoading}
              >

                <option value="">Sin grupo</option>
                {availableGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-3">
                {formData.titles.map((title, index) => (
                  <div key={index} className="p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tarea {index + 1}: {title || `Título ${index + 1}`}
                    </div>
                    <select
                      value={individualData[index]?.groupId || ''}
                      onChange={(e) => updateIndividualData(index, { groupId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      disabled={isLoading}
                    >
                      <option value="">Sin grupo</option>
                      {availableGroups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
            
            {errors.groupId && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.groupId}
              </p>
            )}
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prioridad
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fechas
              </label>
              <button
                type="button"
                onClick={() => toggleIndividualMode('dates')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  individualMode.dates
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                disabled={isLoading}
              >
                {individualMode.dates ? 'Modo Global' : 'Asignar Individual'}
              </button>
            </div>
            
            {!individualMode.dates ? (
              <DateRangePicker
                startDate={formData.startDate}
                endDate={formData.dueDate}
                onDateChange={(startDate, endDate) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    startDate: startDate, 
                    dueDate: endDate 
                  }));
                }}
                disabled={isLoading}
              />
            ) : (
              <div className="space-y-3">
                {formData.titles.map((title, index) => (
                  title.trim() && (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {title || `Tarea ${index + 1}`}
                      </div>
                      <DateRangePicker
                        startDate={individualData[index]?.startDate || null}
                        endDate={individualData[index]?.dueDate || null}
                        onDateChange={(startDate, endDate) => {
                          updateIndividualData(index, 'startDate', startDate);
                          updateIndividualData(index, 'dueDate', endDate);
                        }}
                        disabled={isLoading}
                      />
                    </div>
                  )
                ))}
              </div>
            )}
            
            {errors.dateRange && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.dateRange}
              </p>
            )}
          </div>

          {/* Etiquetas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <TagIcon className="w-4 h-4 inline mr-1" />
                Etiquetas
              </label>
              <button
                type="button"
                onClick={() => toggleIndividualMode('tags')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  individualMode.tags
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                disabled={isLoading}
              >
                {individualMode.tags ? 'Modo Global' : 'Asignar Individual'}
              </button>
            </div>
            
            {!individualMode.tags ? (
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      formData.tagIds.includes(tag.id)
                        ? 'text-white'
                        : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    style={{
                      backgroundColor: formData.tagIds.includes(tag.id) ? tag.color : undefined
                    }}
                    disabled={isLoading}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {formData.titles.map((title, index) => (
                  <div key={index} className="p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tarea {index + 1}: {title || `Título ${index + 1}`}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map(tag => {
                        const currentTags = individualData[index]?.tagIds || [];
                        const isSelected = currentTags.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              const newTags = isSelected
                                ? currentTags.filter(id => id !== tag.id)
                                : [...currentTags, tag.id];
                              updateIndividualData(index, { tagIds: newTags });
                            }}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              isSelected
                                ? 'text-white'
                                : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                            style={{
                              backgroundColor: isSelected ? tag.color : undefined
                            }}
                            disabled={isLoading}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subtareas comunes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subtareas (comunes para todas las tareas)
            </label>
            <div className="space-y-2">
              {formData.subtasks.map((subtask, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={subtask}
                    onChange={(e) => updateSubtaskField(index, e.target.value)}
                    placeholder={`Subtarea ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    disabled={isLoading}
                  />
                  {formData.subtasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubtaskField(index)}
                      className="px-3 py-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSubtaskField}
              className="mt-2 flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4" />
              Agregar subtarea
            </button>
          </div>

        </form>
        
        {/* Botones fijos en la parte inferior */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 dark:bg-gray-800 dark:border-gray-600">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="bulk-task-form"
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Creando...' : `Crear ${formData.titles.filter(t => t.trim()).length} Tareas`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkTaskForm;
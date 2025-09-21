import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import BulkEditForm from './BulkEditForm';
import BulkEditPreview from './BulkEditPreview';
import BulkEditValidation, { ValidationError } from './BulkEditValidation';

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

interface BulkEditContainerProps {
  isOpen: boolean;
  tasks: Task[];
  availableTags: Tag[];
  availableGroups: TaskGroup[];
  onClose: () => void;
  onSave: (updates: BulkUpdateData, individualUpdates: IndividualTaskData, subtaskUpdates: Record<string, Partial<Task>>) => Promise<void>;
}

const BulkEditContainer: React.FC<BulkEditContainerProps> = ({
  isOpen,
  tasks,
  availableTags,
  availableGroups,
  onClose,
  onSave
}) => {
  // Estados principales
  const [formData, setFormData] = useState<BulkUpdateData>({});
  const [fieldsToUpdate, setFieldsToUpdate] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para modo individual
  const [individualMode, setIndividualMode] = useState<Record<string, boolean>>({});
  const [individualData, setIndividualData] = useState<IndividualTaskData>({});
  
  // Estados para subtareas
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [subtaskEdits, setSubtaskEdits] = useState<Record<string, Partial<Task>>>({});
  
  // Estados para validación y errores
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [fieldComparisons, setFieldComparisons] = useState<Record<string, FieldComparison>>({});

  // Analizar campos cuando se abra el modal
  useEffect(() => {
    if (isOpen && tasks.length > 0) {
      analyzeFields();
      initializeIndividualData();
    }
  }, [isOpen, tasks]);

  // Función para analizar similitudes y diferencias entre tareas
  const analyzeFields = () => {
    const comparisons: Record<string, FieldComparison> = {};
    
    const fields = ['title', 'description', 'priority', 'startDate', 'dueDate', 'group', 'tags'];
    
    fields.forEach(field => {
      const values = tasks.map(task => {
        switch (field) {
          case 'group':
            return task.group;
          case 'tags':
            return task.tags;
          default:
            return (task as any)[field];
        }
      });
      
      // Verificar si todos los valores son iguales
      const firstValue = values[0];
      const hasCommonValue = values.every(value => {
        if (field === 'tags') {
          return JSON.stringify(value) === JSON.stringify(firstValue);
        } else if (field === 'group') {
          return value?.id === firstValue?.id;
        }
        return value === firstValue;
      });
      
      comparisons[field] = {
        hasCommonValue,
        commonValue: hasCommonValue ? firstValue : undefined,
        differentValues: hasCommonValue ? [] : [...new Set(values)]
      };
    });
    
    setFieldComparisons(comparisons);
  };

  // Inicializar datos individuales
  const initializeIndividualData = () => {
    const initialData: IndividualTaskData = {};
    tasks.forEach(task => {
      initialData[task.id] = {
        title: task.title,
        description: task.description,
        priority: task.priority,
        startDate: task.startDate,
        dueDate: task.dueDate,
        groupId: task.group?.id,
        tagIds: task.tags.map(tag => tag.id),
        completed: task.completed
      };
    });
    setIndividualData(initialData);
  };

  // Alternar modo individual para un campo
  const toggleIndividualMode = (field: string) => {
    setIndividualMode(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Manejar cambios en el formulario principal
  const handleFormDataChange = (field: keyof BulkUpdateData, value: any) => {
    console.log('🔧 handleFormDataChange called:', { field, value });
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      console.log('🔧 Updated formData:', newData);
      return newData;
    });
  };

  // Manejar toggle de campos a actualizar
  const handleFieldToggle = (field: string) => {
    console.log('🔧 handleFieldToggle called:', { field });
    setFieldsToUpdate(prev => {
      const newSet = new Set(prev);
      if (newSet.has(field)) {
        newSet.delete(field);
        console.log('🔧 Field removed from update:', field);
      } else {
        newSet.add(field);
        console.log('🔧 Field added to update:', field);
      }
      console.log('🔧 Updated fieldsToUpdate:', Array.from(newSet));
      return newSet;
    });
  };

  // Manejar cambios en datos individuales
  const handleIndividualDataChange = (taskId: string, field: keyof BulkUpdateData, value: any) => {
    setIndividualData(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value
      }
    }));
  };

  // Manejar cambios en subtareas
  const handleSubtaskEditChange = (taskId: string, field: keyof Task, value: any) => {
    setSubtaskEdits(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value
      }
    }));
  };

  // Validar formulario
  const validateForm = (): ValidationError[] => {
    const validationErrors: ValidationError[] = [];

    // Validar que al menos un campo esté seleccionado
    if (fieldsToUpdate.size === 0) {
      validationErrors.push({
        field: 'general',
        message: 'Debe seleccionar al menos un campo para actualizar'
      });
    }

    // Validar título
    if (fieldsToUpdate.has('title')) {
      if (!individualMode.title) {
        if (!formData.title || formData.title.trim().length === 0) {
          validationErrors.push({
            field: 'title',
            message: 'El título no puede estar vacío'
          });
        }
      } else {
        tasks.forEach(task => {
          const individualTitle = individualData[task.id]?.title;
          if (individualTitle !== undefined && (!individualTitle || individualTitle.trim().length === 0)) {
            validationErrors.push({
              field: 'title',
              message: `El título de "${task.title}" no puede estar vacío`,
              taskId: task.id
            });
          }
        });
      }
    }

    // Validar fechas
    if (fieldsToUpdate.has('startDate') || fieldsToUpdate.has('dueDate')) {
      if (!individualMode.dates) {
        if (formData.startDate && formData.dueDate) {
          const startDate = new Date(formData.startDate);
          const dueDate = new Date(formData.dueDate);
          if (startDate > dueDate) {
            validationErrors.push({
              field: 'dates',
              message: 'La fecha de inicio no puede ser posterior a la fecha de vencimiento'
            });
          }
        }
      } else {
        tasks.forEach(task => {
          const individualStartDate = individualData[task.id]?.startDate;
          const individualDueDate = individualData[task.id]?.dueDate;
          
          if (individualStartDate && individualDueDate) {
            const startDate = new Date(individualStartDate);
            const dueDate = new Date(individualDueDate);
            if (startDate > dueDate) {
              validationErrors.push({
                field: 'dates',
                message: `En "${task.title}", la fecha de inicio no puede ser posterior a la fecha de vencimiento`,
                taskId: task.id
              });
            }
          }
        });
      }
    }

    return validationErrors;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔧 BulkEditContainer - Datos antes de enviar:');
    console.log('formData:', formData);
    console.log('fieldsToUpdate:', Array.from(fieldsToUpdate));
    console.log('individualData:', individualData);
    console.log('subtaskEdits:', subtaskEdits);
    
    // Filtrar solo los campos seleccionados para actualizar
    const filteredUpdates: BulkUpdateData = {};
    fieldsToUpdate.forEach(field => {
      if (formData[field as keyof BulkUpdateData] !== undefined) {
        (filteredUpdates as any)[field] = formData[field as keyof BulkUpdateData];
      }
    });
    
    console.log('🔧 BulkEditContainer - Datos filtrados:', filteredUpdates);
    
    // Validar que se hayan seleccionado campos para actualizar
    if (Object.keys(filteredUpdates).length === 0) {
      setErrors([{
        field: 'general',
        message: 'Debe seleccionar al menos un campo para actualizar.'
      }]);
      setIsLoading(false);
      return;
    }
    
    const validationErrors = validateForm();
    setErrors(validationErrors);
    
    if (validationErrors.length > 0) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await onSave(filteredUpdates, individualData, subtaskEdits);
      onClose();
    } catch (error) {
      console.error('Error al guardar cambios:', error);
      setErrors([{
        field: 'general',
        message: 'Error al guardar los cambios. Por favor, inténtalo de nuevo.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Limpiar estados al cerrar
  const handleClose = () => {
    setFormData({});
    setFieldsToUpdate(new Set());
    setIndividualMode({});
    setIndividualData({});
    setExpandedTasks(new Set());
    setSubtaskEdits({});
    setErrors([]);
    onClose();
  };

  // Usar el hook de validación
  const validation = BulkEditValidation({
    tasks,
    formData,
    fieldsToUpdate,
    individualMode,
    individualData,
    subtaskEdits,
    errors,
    onValidate: validateForm
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Edición masiva de tareas
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {tasks.length} tarea(s) seleccionada(s)
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden">
          <form onSubmit={handleSubmit} className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              {/* Resumen de validación */}
              <div className="mb-6">
                <validation.ValidationSummary />
              </div>

              {/* Análisis de campos */}
              {tasks.length > 1 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Análisis de campos
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Campos con valores comunes:</span>
                        <div className="mt-1 space-y-1">
                          {Object.entries(fieldComparisons)
                            .filter(([_, comparison]) => comparison.hasCommonValue)
                            .map(([field, _]) => (
                              <div key={field} className="text-green-600">• {field}</div>
                            ))}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Campos con valores diferentes:</span>
                        <div className="mt-1 space-y-1">
                          {Object.entries(fieldComparisons)
                            .filter(([_, comparison]) => !comparison.hasCommonValue)
                            .map(([field, _]) => (
                              <div key={field} className="text-amber-600">• {field}</div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario de edición */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración</h3>
                  <BulkEditForm
                    tasks={tasks}
                    formData={formData}
                    fieldsToUpdate={fieldsToUpdate}
                    fieldComparisons={fieldComparisons}
                    individualMode={individualMode}
                    individualData={individualData}
                    availableTags={availableTags}
                    availableGroups={availableGroups}
                    onFormDataChange={handleFormDataChange}
                    onFieldToggle={handleFieldToggle}
                    onIndividualModeToggle={toggleIndividualMode}
                    onIndividualDataChange={handleIndividualDataChange}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Vista previa</h3>
                  <BulkEditPreview
                    tasks={tasks}
                    individualMode={individualMode}
                    expandedTasks={expandedTasks}
                    subtaskEdits={subtaskEdits}
                    onExpandedTasksChange={setExpandedTasks}
                    onSubtaskEditChange={handleSubtaskEditChange}
                  />
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between p-6 border-t bg-gray-50">
              <div className="text-sm text-gray-500">
                {fieldsToUpdate.size} campos seleccionados para actualizar
                {Object.keys(subtaskEdits).length > 0 && (
                  <span className="ml-2">
                    • {Object.keys(subtaskEdits).length} subtarea(s) modificada(s)
                  </span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || fieldsToUpdate.size === 0 || validation.hasErrors}
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
          </form>
        </div>
      </div>
    </div>
  );
};

export default BulkEditContainer;
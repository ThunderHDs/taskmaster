import React from 'react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

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

interface ValidationError {
  field: string;
  message: string;
  taskId?: string;
}

interface BulkEditValidationProps {
  tasks: Task[];
  formData: BulkUpdateData;
  fieldsToUpdate: Set<string>;
  individualMode: Record<string, boolean>;
  individualData: IndividualTaskData;
  subtaskEdits: Record<string, Partial<Task>>;
  errors: ValidationError[];
  onValidate: () => ValidationError[];
}

const BulkEditValidation: React.FC<BulkEditValidationProps> = ({
  tasks,
  formData,
  fieldsToUpdate,
  individualMode,
  individualData,
  subtaskEdits,
  errors,
  onValidate
}) => {
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
        } else if (formData.title.length > 200) {
          validationErrors.push({
            field: 'title',
            message: 'El título no puede exceder 200 caracteres'
          });
        }
      } else {
        // Validar títulos individuales
        (tasks || []).forEach(task => {
          const individualTitle = individualData[task.id]?.title;
          if (individualTitle !== undefined) {
            if (!individualTitle || individualTitle.trim().length === 0) {
              validationErrors.push({
                field: 'title',
                message: `El título de "${task.title}" no puede estar vacío`,
                taskId: task.id
              });
            } else if (individualTitle.length > 200) {
              validationErrors.push({
                field: 'title',
                message: `El título de "${task.title}" no puede exceder 200 caracteres`,
                taskId: task.id
              });
            }
          }
        });
      }
    }

    // Validar descripción
    if (fieldsToUpdate.has('description')) {
      if (!individualMode.description) {
        if (formData.description && formData.description.length > 1000) {
          validationErrors.push({
            field: 'description',
            message: 'La descripción no puede exceder 1000 caracteres'
          });
        }
      } else {
        // Validar descripciones individuales
        (tasks || []).forEach(task => {
          const individualDescription = individualData[task.id]?.description;
          if (individualDescription !== undefined && individualDescription.length > 1000) {
            validationErrors.push({
              field: 'description',
              message: `La descripción de "${task.title}" no puede exceder 1000 caracteres`,
              taskId: task.id
            });
          }
        });
      }
    }

    // Validar fechas
    if (fieldsToUpdate.has('startDate') || fieldsToUpdate.has('dueDate')) {
      if (!individualMode.dates) {
        // Validar fechas globales
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
        // Validar fechas individuales
        (tasks || []).forEach(task => {
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

    // Validar subtareas editadas
    Object.entries(subtaskEdits || {}).forEach(([taskId, edits]) => {
      const task = (tasks || []).find(t => t.id === taskId) || 
                   (tasks || []).flatMap(t => t.subtasks).find(st => st.id === taskId);
      
      if (task) {
        if (edits.title !== undefined) {
          if (!edits.title || edits.title.trim().length === 0) {
            validationErrors.push({
              field: 'subtask',
              message: `El título de la subtarea "${task.title}" no puede estar vacío`,
              taskId: taskId
            });
          } else if (edits.title.length > 200) {
            validationErrors.push({
              field: 'subtask',
              message: `El título de la subtarea "${task.title}" no puede exceder 200 caracteres`,
              taskId: taskId
            });
          }
        }

        if (edits.description !== undefined && edits.description.length > 1000) {
          validationErrors.push({
            field: 'subtask',
            message: `La descripción de la subtarea "${task.title}" no puede exceder 1000 caracteres`,
            taskId: taskId
          });
        }

        if (edits.startDate && edits.dueDate) {
          const startDate = new Date(edits.startDate);
          const dueDate = new Date(edits.dueDate);
          if (startDate > dueDate) {
            validationErrors.push({
              field: 'subtask',
              message: `En la subtarea "${task.title}", la fecha de inicio no puede ser posterior a la fecha de vencimiento`,
              taskId: taskId
            });
          }
        }
      }
    });

    return validationErrors;
  };

  const currentErrors = onValidate ? onValidate() : validateForm();
  const hasErrors = currentErrors.length > 0;
  const hasWarnings = false; // Placeholder para futuras validaciones de advertencia

  const getErrorsByField = (field: string) => {
    return currentErrors.filter(error => error.field === field);
  };

  const getErrorsByTask = (taskId: string) => {
    return currentErrors.filter(error => error.taskId === taskId);
  };

  const renderValidationSummary = () => {
    if (currentErrors.length === 0) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="text-sm font-medium text-green-800">
                Validación exitosa
              </h3>
              <p className="text-xs text-green-700 mt-1">
                Todos los campos están correctamente configurados. Puedes proceder a guardar los cambios.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Se encontraron {currentErrors.length} error(es) de validación
            </h3>
            <p className="text-xs text-red-700 mt-1">
              Corrige los siguientes errores antes de continuar:
            </p>
            <ul className="mt-2 space-y-1">
              {currentErrors.map((error, index) => (
                <li key={index} className="text-xs text-red-700 flex items-start space-x-1">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{error.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderFieldValidation = (field: string) => {
    const fieldErrors = getErrorsByField(field);
    if (fieldErrors.length === 0) return null;

    return (
      <div className="mt-1">
        {fieldErrors.map((error, index) => (
          <div key={index} className="flex items-center space-x-1 text-xs text-red-600">
            <AlertCircle className="h-3 w-3" />
            <span>{error.message}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderTaskValidation = (taskId: string) => {
    const taskErrors = getErrorsByTask(taskId);
    if (taskErrors.length === 0) return null;

    return (
      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
        {taskErrors.map((error, index) => (
          <div key={index} className="flex items-center space-x-1 text-xs text-red-600">
            <AlertCircle className="h-3 w-3" />
            <span>{error.message}</span>
          </div>
        ))}
      </div>
    );
  };

  const getValidationStats = () => {
    const totalFields = fieldsToUpdate.size;
    const fieldsWithErrors = new Set(currentErrors.map(e => e.field)).size;
    const tasksWithErrors = new Set(currentErrors.filter(e => e.taskId).map(e => e.taskId)).size;
    
    return {
      totalFields,
      fieldsWithErrors,
      tasksWithErrors,
      totalTasks: tasks?.length || 0,
      totalSubtaskEdits: Object.keys(subtaskEdits || {}).length
    };
  };

  const stats = getValidationStats();

  return {
    // Componente de resumen de validación
    ValidationSummary: () => renderValidationSummary(),
    
    // Función para renderizar validación de campo específico
    renderFieldValidation,
    
    // Función para renderizar validación de tarea específica
    renderTaskValidation,
    
    // Estado de validación
    hasErrors,
    hasWarnings,
    errors: currentErrors,
    
    // Estadísticas
    stats,
    
    // Función de validación manual
    validate: validateForm,
    
    // Utilidades
    getErrorsByField,
    getErrorsByTask
  };
};

export default BulkEditValidation;
export type { ValidationError };
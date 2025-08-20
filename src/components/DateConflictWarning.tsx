import React from 'react';
import { AlertTriangle, Calendar, Clock } from 'lucide-react';

interface DateConflictWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onKeepSubtaskDates: () => void;
  onAdjustSubtaskDates: () => void;
  parentTask: {
    title: string;
    startDate?: string;
    dueDate?: string;
  };
  subtaskDates: {
    startDate?: Date | null;
    dueDate?: Date | null;
  };
  conflictType: 'start_before' | 'end_after' | 'both';
}

const DateConflictWarning: React.FC<DateConflictWarningProps> = ({
  isOpen,
  onClose,
  onKeepSubtaskDates,
  onAdjustSubtaskDates,
  parentTask,
  subtaskDates,
  conflictType
}) => {
  if (!isOpen) return null;

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'No definida';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getConflictMessage = () => {
    switch (conflictType) {
      case 'start_before':
        return 'La fecha de inicio de la subtarea es anterior a la fecha de inicio de la tarea padre.';
      case 'end_after':
        return 'La fecha de fin de la subtarea es posterior a la fecha de fin de la tarea padre.';
      case 'both':
        return 'Las fechas de la subtarea están fuera del rango de fechas de la tarea padre.';
      default:
        return 'Hay un conflicto de fechas entre la subtarea y la tarea padre.';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                Conflicto de Fechas Detectado
              </h3>
            </div>
          </div>

          {/* Conflict Description */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              {getConflictMessage()}
            </p>

            {/* Date Comparison */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Tarea Padre: "{parentTask.title}"
                </h4>
                <div className="text-sm text-gray-600 ml-5">
                  <div>Inicio: {formatDate(parentTask.startDate)}</div>
                  <div>Fin: {formatDate(parentTask.dueDate)}</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Nueva Subtarea:
                </h4>
                <div className="text-sm text-gray-600 ml-5">
                  <div>Inicio: {formatDate(subtaskDates.startDate)}</div>
                  <div>Fin: {formatDate(subtaskDates.dueDate)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Options */}
          <div className="mb-6">
            <p className="text-sm text-gray-700 mb-3">
              ¿Qué deseas hacer?
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <strong>Mantener fechas de la subtarea:</strong> Se ajustarán automáticamente las fechas de la tarea padre para incluir el rango de la subtarea.
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <strong>Ajustar fechas de la subtarea:</strong> Podrás modificar las fechas para que estén dentro del rango de la tarea padre.
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onKeepSubtaskDates}
              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Mantener fechas de subtarea
            </button>
            <button
              onClick={onAdjustSubtaskDates}
              className="flex-1 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Ajustar fechas de subtarea
            </button>
          </div>

          {/* Cancel Button */}
          <div className="mt-3">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateConflictWarning;
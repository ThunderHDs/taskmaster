import React from 'react';
import { Button } from './ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { Task } from '@prisma/client';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  task: Task & {
    subtasks?: Task[];
  } | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  task,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  if (!isOpen || !task) return null;

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const subtaskCount = task.subtasks?.length || 0;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onCancel}
      >
        {/* Modal */}
        <div 
          className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmar eliminación
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                ¿Estás seguro de que quieres eliminar la tarea:
              </p>
              <p className="font-medium text-gray-900 bg-gray-50 p-3 rounded-md border-l-4 border-blue-500">
                "{task.title}"
              </p>
            </div>

            {hasSubtasks && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-amber-800 font-medium mb-1">
                      Esta tarea tiene {subtaskCount} subtarea{subtaskCount > 1 ? 's' : ''}
                    </p>
                    <p className="text-amber-700 text-sm">
                      Al eliminar esta tarea, también se eliminarán automáticamente todas sus subtareas.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!hasSubtasks && (
              <p className="text-sm text-gray-600">
                Esta acción no se puede deshacer.
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Eliminando...
                </>
              ) : (
                'Eliminar tarea'
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteConfirmationModal;
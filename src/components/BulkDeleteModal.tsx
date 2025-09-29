import React from 'react';
import { Button } from './ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { Task } from '@prisma/client';

interface BulkDeleteModalProps {
  isOpen: boolean;
  tasks: (Task & {
    subtasks?: Task[];
  })[];
  onConfirm: () => void;
  onCancel: () => void;
  onClearSelection?: () => void;
  isLoading?: boolean;
}

const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  isOpen,
  tasks,
  onConfirm,
  onCancel,
  onClearSelection,
  isLoading = false
}) => {
  if (!isOpen || !tasks || tasks.length === 0) return null;

  const taskCount = tasks.length;
  const totalSubtasks = tasks.reduce((acc, task) => acc + (task.subtasks?.length || 0), 0);
  const hasSubtasks = totalSubtasks > 0;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onCancel}
      >
        {/* Modal */}
        <div 
          className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 transform transition-all max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmar eliminación múltiple
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
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            <div className="mb-4">
              <p className="text-gray-700 mb-4">
                ¿Estás seguro de que quieres eliminar {taskCount} tarea{taskCount > 1 ? 's' : ''}?
              </p>
              
              {/* Lista de tareas */}
              <div className="bg-gray-50 rounded-md border max-h-48 overflow-y-auto">
                <div className="p-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Tareas a eliminar:
                  </h4>
                  <ul className="space-y-1">
                    {tasks.map((task, index) => (
                      <li key={task.id} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">•</span>
                        <span className="flex-1">
                          {task.title}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <span className="text-xs text-amber-600 ml-2">
                              (+{task.subtasks.length} subtarea{task.subtasks.length > 1 ? 's' : ''})
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {hasSubtasks && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-amber-800 font-medium mb-1">
                      Estas tareas incluyen {totalSubtasks} subtarea{totalSubtasks > 1 ? 's' : ''}
                    </p>
                    <p className="text-amber-700 text-sm">
                      Al eliminar estas tareas, también se eliminarán automáticamente todas sus subtareas.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm text-gray-600">
              Esta acción no se puede deshacer.
            </p>
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
              onClick={async () => {
                 try {
                   await onConfirm();
                   
                   // Dar tiempo para que la eliminación se complete
                   setTimeout(() => {
                     onClearSelection?.();
                   }, 200);
                 } catch (error) {
                   console.error('Error in bulk delete:', error);
                   // Aún así intentar limpiar la selección
                   onClearSelection?.();
                 }
               }}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Eliminando...
                </>
              ) : (
                `Eliminar ${taskCount} tarea${taskCount > 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BulkDeleteModal;
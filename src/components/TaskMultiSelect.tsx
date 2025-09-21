import React from 'react';
import { X, Edit, Trash2 } from 'lucide-react';
import { Task } from '../types';

interface TaskMultiSelectProps {
  isMultiSelectMode: boolean;
  selectedTasks: Set<string>;
  tasks: Task[];
  onClearSelection: () => void;
  onBulkEdit: () => void;
  onBulkDelete: () => void;
  onExitMultiSelect: () => void;
}

/**
 * Componente TaskMultiSelect - Maneja la barra de acciones para selección múltiple
 * Extraído de TaskList.tsx para mejorar la modularidad
 */
export const TaskMultiSelect: React.FC<TaskMultiSelectProps> = ({
  isMultiSelectMode,
  selectedTasks,
  tasks,
  onClearSelection,
  onBulkEdit,
  onBulkDelete,
  onExitMultiSelect
}) => {
  if (!isMultiSelectMode) return null;

  const selectedCount = selectedTasks.size;
  const selectedTasksList = tasks.filter(task => selectedTasks.has(task.id));

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">
            {selectedCount} tarea{selectedCount !== 1 ? 's' : ''} seleccionada{selectedCount !== 1 ? 's' : ''}
          </span>
          
          {selectedCount > 0 && (
            <button
              onClick={onClearSelection}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Limpiar selección
            </button>
          )}
        </div>
        
        <button
          onClick={onExitMultiSelect}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded hover:bg-gray-100"
          title="Salir del modo selección múltiple"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {selectedCount > 0 && (
        <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={onBulkEdit}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <Edit className="w-4 h-4" />
            <span>Editar</span>
          </button>
          
          <button
            onClick={onBulkDelete}
            className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar</span>
          </button>
        </div>
      )}
      
      {selectedCount > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Tareas seleccionadas:</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {selectedTasksList.map(task => (
              <div key={task.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                <span className="truncate flex-1 mr-2" title={task.title}>
                  {task.title}
                </span>
                <button
                  onClick={() => {
                    const newSelected = new Set(selectedTasks);
                    newSelected.delete(task.id);
                    // Esta funcionalidad se manejará desde el componente padre
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Quitar de la selección"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
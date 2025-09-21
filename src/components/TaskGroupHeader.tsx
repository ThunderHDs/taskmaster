import React from 'react';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { TaskGroup } from '../types';

interface TaskGroupHeaderProps {
  group: TaskGroup | null;
  taskCount: number;
  completedCount: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

/**
 * Componente TaskGroupHeader - Renderiza el encabezado de un grupo de tareas
 * Extraído de TaskList.tsx para mejorar la modularidad
 */
export const TaskGroupHeader: React.FC<TaskGroupHeaderProps> = ({
  group,
  taskCount,
  completedCount,
  isExpanded,
  onToggleExpanded
}) => {
  const completionPercentage = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
  
  return (
    <div className="mb-4">
      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-500" />
            )}
            
            {group ? (
              <>
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: group.color }}
                />
                <h3 className="text-lg font-semibold text-gray-800">
                  {group.name}
                </h3>
              </>
            ) : (
              <>
                <Users className="w-4 h-4 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-800">
                  Sin Grupo
                </h3>
              </>
            )}
          </div>
          
          {group?.description && (
            <span className="text-sm text-gray-600">
              {group.description}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Barra de progreso */}
          <div className="flex items-center space-x-2">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-600">
              {completionPercentage}%
            </span>
          </div>
          
          {/* Contador de tareas */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="font-medium">
              {completedCount}/{taskCount}
            </span>
            <span>
              tarea{taskCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </button>
      
      {/* Línea de separación con color del grupo */}
      {group && (
        <div 
          className="h-1 rounded-full mt-2 opacity-30"
          style={{ backgroundColor: group.color }}
        />
      )}
    </div>
  );
};
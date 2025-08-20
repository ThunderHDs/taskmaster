'use client';

/*
 * SISTEMA DE DETECCIÓN DE CONFLICTOS - REACTIVADO
 * 
 * Este componente maneja la visualización de alertas de conflictos de fechas entre tareas.
 * 
 * FUNCIONALIDADES INCLUIDAS:
 * - Detección de solapamientos de fechas (OVERLAP)
 * - Detección de sobrecarga de trabajo (OVERLOAD) 
 * - Niveles de severidad: LOW, MEDIUM, HIGH
 * - Sugerencias automáticas para resolución
 * - Navegación directa a tareas en conflicto
 * - Opciones para resolver o descartar alertas
 * - Expansión/contracción de sugerencias
 * - Estilos dinámicos basados en severidad
 */

import React, { useState } from 'react';
import { AlertTriangle, Clock, Calendar, X, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

export interface ConflictData {
  id?: string;
  type: 'OVERLAP' | 'OVERLOAD';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  conflictingTaskId: string;
  conflictingTaskTitle: string;
  suggestions: string[];
}

interface ConflictAlertProps {
  conflicts: ConflictData[];
  onResolveConflict?: (conflictId: string) => void;
  onViewTask?: (taskId: string) => void;
  className?: string;
}

const ConflictAlert: React.FC<ConflictAlertProps> = ({
  conflicts,
  onResolveConflict,
  onViewTask,
  className = ''
}) => {
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(new Set());
  const [dismissedConflicts, setDismissedConflicts] = useState<Set<string>>(new Set());

  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  const visibleConflicts = conflicts.filter(
    conflict => !dismissedConflicts.has(conflict.conflictingTaskId)
  );

  if (visibleConflicts.length === 0) {
    return null;
  }

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          icon: 'text-red-600',
          badge: 'bg-red-100 text-red-800'
        };
      case 'MEDIUM':
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          icon: 'text-yellow-600',
          badge: 'bg-yellow-100 text-yellow-800'
        };
      case 'LOW':
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800',
          icon: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-800'
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200 text-gray-800',
          icon: 'text-gray-600',
          badge: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'OVERLAP':
        return <Calendar className="w-4 h-4" />;
      case 'OVERLOAD':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const toggleExpanded = (conflictId: string) => {
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(conflictId)) {
      newExpanded.delete(conflictId);
    } else {
      newExpanded.add(conflictId);
    }
    setExpandedConflicts(newExpanded);
  };

  const dismissConflict = (conflictId: string) => {
    const newDismissed = new Set(dismissedConflicts);
    newDismissed.add(conflictId);
    setDismissedConflicts(newDismissed);
  };

  const handleResolveConflict = (conflictId: string) => {
    if (onResolveConflict) {
      onResolveConflict(conflictId);
    }
    dismissConflict(conflictId);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {visibleConflicts.map((conflict, index) => {
        const conflictId = conflict.id || `${conflict.conflictingTaskId}-${index}`;
        const styles = getSeverityStyles(conflict.severity);
        const isExpanded = expandedConflicts.has(conflictId);

        return (
          <div
            key={conflictId}
            className={`border rounded-lg p-4 ${styles.container} transition-all duration-200`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className={`mt-0.5 ${styles.icon}`}>
                  {getConflictIcon(conflict.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles.badge}`}>
                      {conflict.severity} {conflict.type === 'OVERLAP' ? 'OVERLAP' : 'OVERLOAD'}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1">
                    {conflict.message}
                  </p>
                  <button
                    onClick={() => onViewTask?.(conflict.conflictingTaskId)}
                    className="text-sm underline hover:no-underline transition-all duration-150"
                  >
                    Ver tarea: "{conflict.conflictingTaskTitle}"
                  </button>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                {conflict.suggestions && conflict.suggestions.length > 0 && (
                  <button
                    onClick={() => toggleExpanded(conflictId)}
                    className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors duration-150"
                    title={isExpanded ? 'Ocultar sugerencias' : 'Ver sugerencias'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                )}
                
                {conflict.id && onResolveConflict && (
                  <button
                    onClick={() => handleResolveConflict(conflict.id!)}
                    className="px-3 py-1 text-xs font-medium bg-white bg-opacity-80 hover:bg-opacity-100 rounded transition-all duration-150"
                    title="Marcar como resuelto"
                  >
                    Resolver
                  </button>
                )}
                
                <button
                  onClick={() => dismissConflict(conflictId)}
                  className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors duration-150"
                  title="Descartar alerta"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isExpanded && conflict.suggestions && conflict.suggestions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                <div className="flex items-center space-x-2 mb-2">
                  <Lightbulb className="w-4 h-4" />
                  <span className="text-sm font-medium">Sugerencias:</span>
                </div>
                <ul className="space-y-1 text-sm">
                  {conflict.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-current opacity-60 mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ConflictAlert;
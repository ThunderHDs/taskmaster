import React from 'react';
import { Filter, X, Tag, Users, Calendar, AlertCircle } from 'lucide-react';
import { Task, Tag as TagType, TaskGroup, Priority } from '../types';
import { useFilterStore } from '../stores/useFilterStore';

interface TaskFiltersProps {
  tasks: Task[];
  filteredTasks: Task[];
  availableTags: TagType[];
  availableGroups: TaskGroup[];
}

/**
 * Componente TaskFilters - Maneja todos los filtros de tareas
 * Extraído de TaskList.tsx para mejorar la modularidad
 */
export const TaskFilters: React.FC<TaskFiltersProps> = ({
  tasks,
  filteredTasks,
  availableTags,
  availableGroups
}) => {
  // Obtener estado y acciones del store de filtros
  const {
    selectedTags,
    selectedGroups,
    selectedPriorities,
    showCompleted,
    showOverdue,
    dateFilter,
    toggleTagFilter,
    toggleGroupFilter,
    togglePriorityFilter,
    setShowCompleted,
    setShowOverdue,
    setDateFilter,
    clearAllFilters
  } = useFilterStore();
  const hasActiveFilters = 
    selectedTags.size > 0 || 
    selectedGroups.size > 0 || 
    selectedPriorities.size > 0 || 
    !showCompleted || 
    showOverdue || 
    dateFilter !== 'all';

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  const getDateFilterLabel = (filter: 'all' | 'today' | 'week' | 'month') => {
    switch (filter) {
      case 'all': return 'Todas las fechas';
      case 'today': return 'Hoy';
      case 'week': return 'Esta semana';
      case 'month': return 'Este mes';
      default: return filter;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
          <span className="text-sm text-gray-500">
            ({filteredTasks.length} de {tasks.length} tareas)
          </span>
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filtro por etiquetas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Tag className="w-4 h-4 inline mr-1" />
            Etiquetas
          </label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {availableTags.map(tag => (
              <label key={tag.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTags.has(tag.id)}
                  onChange={() => toggleTagFilter(tag.id)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex items-center space-x-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm text-gray-700">{tag.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
        
        {/* Filtro por grupos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Users className="w-4 h-4 inline mr-1" />
            Grupos
          </label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {availableGroups.map(group => (
              <label key={group.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedGroups.has(group.id)}
                  onChange={() => toggleGroupFilter(group.id)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex items-center space-x-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-sm text-gray-700">{group.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
        
        {/* Filtro por prioridades */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            Prioridades
          </label>
          <div className="space-y-2">
            {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(priority => (
              <label key={priority} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPriorities.has(priority)}
                  onChange={() => togglePriorityFilter(priority)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(priority)}`}>
                  {getPriorityLabel(priority)}
                </span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Filtros de estado y fecha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Estado y Fecha
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Mostrar completadas</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOverdue}
                onChange={(e) => setShowOverdue(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Solo vencidas</span>
            </label>
            
            <div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todas las fechas</option>
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mes</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filtros activos */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {Array.from(selectedTags).map(tagId => {
              const tag = availableTags.find(t => t.id === tagId);
              if (!tag) return null;
              return (
                <span
                  key={tagId}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                  <button
                    onClick={() => toggleTagFilter(tagId)}
                    className="ml-1 hover:bg-black hover:bg-opacity-20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            
            {Array.from(selectedGroups).map(groupId => {
              const group = availableGroups.find(g => g.id === groupId);
              if (!group) return null;
              return (
                <span
                  key={groupId}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                  style={{ 
                    backgroundColor: `${group.color}20`, 
                    borderColor: group.color,
                    color: group.color
                  }}
                >
                  {group.name}
                  <button
                    onClick={() => toggleGroupFilter(groupId)}
                    className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            
            {Array.from(selectedPriorities).map(priority => (
              <span
                key={priority}
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(priority)}`}
              >
                {getPriorityLabel(priority)}
                <button
                  onClick={() => togglePriorityFilter(priority)}
                  className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            
            {!showCompleted && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                Ocultar completadas
                <button
                  onClick={() => setShowCompleted(true)}
                  className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            
            {showOverdue && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                Solo vencidas
                <button
                  onClick={() => setShowOverdue(false)}
                  className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            
            {dateFilter !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                {getDateFilterLabel(dateFilter)}
                <button
                  onClick={() => setDateFilter('all')}
                  className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
'use client';

import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, CheckSquare, Clock, Tag as TagIcon, AlertCircle } from 'lucide-react';
import { Task, Tag, Priority } from '../types/task';
import { safeDate, safeNow, isSameDay, safeFormatDate } from '../utils/dateUtils';

// Interfaz para los grupos de tareas
interface TaskGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// Props del componente CalendarView
interface CalendarViewProps {
  tasks: Task[];                                    // Lista de todas las tareas
  onTaskToggle: (taskId: string, completed: boolean) => void;  // Función para cambiar estado de completado
  onTaskEdit: (task: Task) => void;                // Función para editar una tarea
  availableTags: Tag[];                           // Lista de etiquetas disponibles
  availableGroups?: TaskGroup[];                  // Lista de grupos disponibles
  isGroupedView?: boolean;                        // Si mostrar vista agrupada
  isLoading?: boolean;                            // Estado de carga
  onDateSelect?: (date: Date) => void;            // Función para comunicar fecha seleccionada
}

const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  onTaskToggle,
  onTaskEdit,
  availableTags,
  availableGroups = [],
  isGroupedView = false,
  isLoading = false,
  onDateSelect
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(() => safeNow());

  // Función para formatear fecha a string (corregida para evitar desfases de zona horaria)
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función para formatear string de fecha de la DB a string local
  const formatDateStringToLocal = (dateString: string): string => {
    // Si ya está en formato YYYY-MM-DD, devolverla tal como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Si tiene información de hora, extraer solo la parte de fecha
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    
    // Para otros casos, parsear y usar formateo local
    const date = new Date(dateString);
    return formatDateToString(date);
  };

  // Función para verificar si una tarea está vencida
  const isOverdue = (dueDate: string, completed: boolean): boolean => {
    if (completed) return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Función para obtener el color de prioridad
  const getPriorityColor = (priority: Priority): string => {
    switch (priority) {
      case 'URGENT': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  // Calcular fechas que tienen tareas (usando formateo corregido)
  const datesWithTasks = useMemo(() => {
    const dates = new Set<string>();
    // Validar que tasks existe y es un array
    if (!tasks || !Array.isArray(tasks)) {
      return dates;
    }
    
    tasks.forEach(task => {
      if (task && task.startDate) {
        dates.add(formatDateStringToLocal(task.startDate));
      }
      if (task && task.dueDate) {
        dates.add(formatDateStringToLocal(task.dueDate));
      }
      if (task && task.progress && task.progress.length > 0) {
        task.progress.forEach(p => {
          if (p && p.date) {
            dates.add(formatDateStringToLocal(p.date));
          }
        });
      }
    });
    return dates;
  }, [tasks]);

  // Filtrar tareas para la fecha seleccionada (usando formateo corregido)
  const tasksForSelectedDate = useMemo(() => {
    const selectedDateStr = formatDateToString(selectedDate);
    // Validar que tasks existe y es un array
    if (!tasks || !Array.isArray(tasks)) {
      return [];
    }
    
    return tasks
      .filter(task => {
        // Validar que task existe
        if (!task) return false;
        
        // Excluir subtareas
        if (task.parentId) return false;
        
        // Incluir tareas que empiezan en la fecha seleccionada
        if (task.startDate && formatDateStringToLocal(task.startDate) === selectedDateStr) {
          return true;
        }
        
        // Incluir tareas que vencen en la fecha seleccionada
        if (task.dueDate && formatDateStringToLocal(task.dueDate) === selectedDateStr) {
          return true;
        }
        
        // Incluir tareas con progreso en la fecha seleccionada
        if (task.progress && task.progress.some(p => 
          p && p.date && formatDateStringToLocal(p.date) === selectedDateStr
        )) {
          return true;
        }
        
        return false;
      })
      .sort((a, b) => {
        // Ordenar por prioridad y luego por fecha de vencimiento
         const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
         const aPriority = priorityOrder[a.priority] || 0;
         const bPriority = priorityOrder[b.priority] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        
        return 0;
      });
  }, [tasks, selectedDate]);

  // Filtrar tareas sin fechas
  const tasksWithoutDates = useMemo(() => {
    // Validar que tasks existe y es un array
    if (!tasks || !Array.isArray(tasks)) {
      return [];
    }
    
    return tasks
      .filter(task => {
        // Validar que task existe
        if (!task) return false;
        
        // Excluir subtareas
        if (task.parentId) return false;
        
        // Incluir solo tareas sin fechas de inicio ni vencimiento
        return !task.startDate && !task.dueDate;
      })
      .sort((a, b) => {
         const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
         const aPriority = priorityOrder[a.priority] || 0;
         const bPriority = priorityOrder[b.priority] || 0;
         return bPriority - aPriority;
       });
  }, [tasks]);

  // Función para renderizar una tarjeta de tarea
  const renderTaskCard = (task: Task) => {
    return (
      <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <button
              onClick={() => onTaskToggle(task.id, task.status === 'completed' ? 'pending' : 'completed')}
              className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                task.status === 'completed'
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-green-400'
              }`}
            >
              {task.status === 'completed' && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            
            <div className="flex-1">
              <h3 className={`font-medium text-gray-900 ${
                task.status === 'completed' ? 'line-through text-gray-500' : ''
              }`}>
                {task.title}
              </h3>
              
              {task.description && (
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              )}
              
              <div className="flex items-center space-x-4 mt-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                   task.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                   task.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                   task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                   'bg-green-100 text-green-800'
                 }`}>
                   {task.priority === 'URGENT' ? 'Urgente' : 
                    task.priority === 'HIGH' ? 'Alta' : 
                    task.priority === 'MEDIUM' ? 'Media' : 'Baja'}
                 </span>
                
                {task.dueDate && (
                  <div className={`flex items-center space-x-1 text-xs ${
                    isOverdue(task.dueDate, task.status === 'completed') ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>{new Date(task.dueDate).toLocaleDateString('es-ES')}</span>
                  </div>
                )}
              </div>
              
              {task.tags && task.tags.length > 0 && (
                 <div className="flex flex-wrap gap-1 mt-2">
                   {task.tags.map((tagItem, index) => {
                     // Manejar tanto string[] como { tag: Tag }[]
                     const tag = typeof tagItem === 'string' 
                       ? availableTags.find(t => t.id === tagItem)
                       : tagItem.tag;
                     
                     return tag ? (
                       <span
                         key={tag.id || index}
                         className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                         style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                       >
                         <TagIcon className="w-3 h-3 mr-1" />
                         {tag.name}
                       </span>
                     ) : null;
                   })}
                 </div>
               )}
            </div>
          </div>
          
          <button
            onClick={() => onTaskEdit(task)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  // Función para renderizar tareas agrupadas
  const renderGroupedTasks = (tasksToRender: Task[]) => {
    const tasksByGroup = new Map<string, Task[]>();
    const tasksWithoutGroup: Task[] = [];
    
    tasksToRender.forEach(task => {
      if (task.groupId) {
        if (!tasksByGroup.has(task.groupId)) {
          tasksByGroup.set(task.groupId, []);
        }
        const groupTasks = tasksByGroup.get(task.groupId);
        if (groupTasks) {
          groupTasks.push(task);
        }
      } else {
        tasksWithoutGroup.push(task);
      }
    });

    return (
      <>
        {/* Tareas agrupadas */}
        {Array.from(tasksByGroup.entries()).map(([groupId, groupTasks]) => {
          const group = availableGroups.find(g => g.id === groupId);
          return (
            <div key={groupId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div 
                className="px-4 py-3 border-b border-gray-200 flex items-center space-x-3"
                style={{ backgroundColor: group?.color ? `${group.color}15` : '#f9fafb' }}
              >
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group?.color || '#6b7280' }}
                />
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900">
                    {group?.name || 'Grupo desconocido'}
                  </h5>
                  {group?.description && (
                    <p className="text-sm text-gray-600">{group.description}</p>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {groupTasks.length} tarea{groupTasks.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="p-4 space-y-4">
                {groupTasks.map(renderTaskCard)}
              </div>
            </div>
          );
        })}
        
        {/* Tareas sin grupo */}
        {tasksWithoutGroup.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center space-x-3">
              <div className="w-4 h-4 rounded-full bg-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <h5 className="font-medium text-gray-900">Sin grupo</h5>
                <p className="text-sm text-gray-600">Tareas no asignadas a ningún grupo</p>
              </div>
              <span className="text-sm text-gray-500">
                {tasksWithoutGroup.length} tarea{tasksWithoutGroup.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="p-4 space-y-4">
              {tasksWithoutGroup.map(renderTaskCard)}
            </div>
          </div>
        )}
      </>
    );
  };

  // Función para generar el calendario
  const generateCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dateStr = formatDateToString(current);
      const isCurrentMonth = current.getMonth() === month;
      const isToday = formatDateToString(new Date()) === dateStr;
      const isSelected = formatDateToString(selectedDate) === dateStr;
      const hasTasks = datesWithTasks && datesWithTasks.has ? datesWithTasks.has(dateStr) : false;
      
      days.push(
        <button
          key={dateStr}
          onClick={() => {
            setSelectedDate(new Date(current));
            if (onDateSelect) {
              onDateSelect(new Date(current));
            }
          }}
          className={`
            p-3 text-center text-sm font-medium rounded-lg transition-colors relative
            ${
              isSelected
                ? 'bg-blue-600 text-white'
                : isToday
                ? 'bg-blue-100 text-blue-800'
                : isCurrentMonth
                ? 'text-gray-900 hover:bg-gray-100'
                : 'text-gray-400 hover:bg-gray-50'
            }
          `}
        >
          {current.getDate()}
          {hasTasks && (
            <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
              isSelected ? 'bg-white' : 'bg-blue-500'
            }`} />
          )}
        </button>
      );
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Panel del calendario */}
      <div className="flex-1 p-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 h-full">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
            <CalendarIcon className="w-8 h-8 mr-3 text-blue-600" />
            Vista de Calendario
          </h2>
          
          {/* Navegación del calendario */}
          <div className="w-full">
            {/* Controles de navegación */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setSelectedDate(newDate);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <h3 className="text-2xl font-semibold text-gray-900">
                {selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </h3>
              
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setSelectedDate(newDate);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {/* Encabezados de días */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50 rounded-lg">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Grid del calendario */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendar()}
            </div>
          </div>
          
          {/* Leyenda */}
          <div className="mt-8 flex items-center justify-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full shadow-md"></div>
              <span className="text-sm font-medium text-gray-700">Días con tareas</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Días sin tareas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel de tareas */}
      <div className="w-[420px] bg-white border-l border-gray-200 flex flex-col shadow-xl">
        {/* Encabezado del panel */}
        <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            Tareas para {selectedDate.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          <div className="flex items-center space-x-2">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
              {tasksForSelectedDate.length} tarea{tasksForSelectedDate.length !== 1 ? 's' : ''}
            </div>
            {tasksForSelectedDate.some(task => task.status !== 'completed') && (
              <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                {tasksForSelectedDate.filter(task => task.status !== 'completed').length} pendiente{tasksForSelectedDate.filter(task => task.status !== 'completed').length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Contenido del panel */}
        <div className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
              <span className="ml-3 text-gray-600 font-medium">Cargando tareas...</span>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Tareas programadas para la fecha seleccionada */}
              {tasksForSelectedDate.length > 0 ? (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
                  </h4>
                  {isGroupedView ? (
                    <div className="space-y-6">
                      {renderGroupedTasks(tasksForSelectedDate)}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tasksForSelectedDate.map(renderTaskCard)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-gray-400" />
                  </div>

                  <p className="text-gray-500">
                    No hay tareas para el {selectedDate.toLocaleDateString('es-ES')}.
                  </p>
                </div>
              )}
              
              {/* Tareas sin fechas */}
              {tasksWithoutDates.length > 0 && (
                <div>
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CheckSquare className="w-5 h-5 mr-2 text-gray-600" />
                      Tareas sin fecha ({tasksWithoutDates.length})
                    </h4>
                    {isGroupedView ? (
                      <div className="space-y-6">
                        {renderGroupedTasks(tasksWithoutDates)}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {tasksWithoutDates.map(renderTaskCard)}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Mensaje cuando no hay tareas */}
              {tasksForSelectedDate.length === 0 && tasksWithoutDates.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">
                    ¡Perfecto día para relajarse! 🎉
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
'use client';

import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, CheckSquare, AlertCircle, Tag as TagIcon } from 'lucide-react';
import { Task } from '../types/task';
import { Tag } from '../types/tag';

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  tasks: Task[];
}

const Calendar: React.FC<CalendarProps> = ({
  tasks,
  selectedDate,
  onDateSelect
}) => {
  /**
   * Función para formatear fecha a string YYYY-MM-DD (corregida para evitar desfases)
   */
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * Función para formatear string de fecha de la DB a string local
   */
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



  /**
   * Memoización: Obtener fechas que tienen tareas
   */
  const datesWithTasks = useMemo(() => {
    const dates = new Set<string>();
    
    tasks.forEach(task => {
      // Solo incluir tareas padre (excluir subtareas)
      if (task.parentId) return;
      
      // Si la tarea tiene tanto startDate como dueDate, agregar todas las fechas en el rango
      if (task.startDate && task.dueDate) {
        const startDateStr = formatDateStringToLocal(task.startDate);
        const endDateStr = formatDateStringToLocal(task.dueDate);
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          dates.add(formatDateToString(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        // Agregar fecha de inicio si existe (sin dueDate)
        if (task.startDate) {
          dates.add(formatDateStringToLocal(task.startDate));
        }
        // Agregar fecha de vencimiento si existe (sin startDate)
        if (task.dueDate) {
          dates.add(formatDateStringToLocal(task.dueDate));
        }
      }
    });
    
    return dates;
  }, [tasks]);



  const handlePrevMonth = () => {
    const prevMonth = new Date(selectedDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    onDateSelect(prevMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(selectedDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    onDateSelect(nextMonth);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 h-fit">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <CalendarIcon className="w-6 h-6 mr-2 text-blue-600" />
        Calendario
      </h2>
      

      
      {/* Header del calendario con navegación */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-lg font-semibold text-gray-900">
          {selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </h3>
        
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
          <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 bg-gray-50 rounded">
            {day}
          </div>
        ))}
      </div>
      
      {/* Grid del calendario */}
      <div className="grid grid-cols-7 gap-1">
        {(() => {
          const year = selectedDate.getFullYear();
          const month = selectedDate.getMonth();
          const firstDay = new Date(year, month, 1);
          const lastDay = new Date(year, month + 1, 0);
          const startDate = new Date(firstDay);
          startDate.setDate(startDate.getDate() - firstDay.getDay());
          
          const days = [];
          const currentDate = new Date(startDate);
          
          for (let i = 0; i < 42; i++) {
            // Crear una copia de la fecha para este día específico
            const dayDate = new Date(currentDate);
            const dateStr = formatDateToString(dayDate);
            const isCurrentMonth = dayDate.getMonth() === month;
            const isToday = dateStr === formatDateToString(new Date());
            const isSelected = dateStr === formatDateToString(selectedDate);
            const dayTasks = tasks.filter(task => {
              // Solo incluir tareas padre (excluir subtareas)
              if (task.parentId) return false;
              
              // Excluir tareas que no tienen fechas establecidas
              if (!task.startDate && !task.dueDate) return false;
              
              const taskStartDate = task.startDate ? formatDateStringToLocal(task.startDate) : null;
              const taskDueDate = task.dueDate ? formatDateStringToLocal(task.dueDate) : null;
              
              // Incluir tareas que inician en esta fecha
              const startsOnDate = taskStartDate === dateStr;
              // Incluir tareas que vencen en esta fecha
              const duesOnDate = taskDueDate === dateStr;
              // Incluir tareas que están en progreso (entre fecha de inicio y vencimiento)
              const inProgress = taskStartDate && taskDueDate && 
                taskStartDate <= dateStr && taskDueDate >= dateStr;
              
              return startsOnDate || duesOnDate || inProgress;
            });
            
            const hasTask = dayTasks.length > 0;
            const tasksCount = dayTasks.length;
            const completedTasksCount = dayTasks.filter(task => task.completed).length;
            const hasOnlyCompletedTasks = hasTask && completedTasksCount === tasksCount;
            
            days.push(
              <button
                key={i}
                onClick={() => {
                  const newDate = new Date(dayDate);
                  onDateSelect(newDate);
                }}
                className={`
                  relative h-10 p-1 text-left rounded transition-all duration-200
                  ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md font-semibold hover:bg-blue-700'
                      : isToday
                      ? 'bg-blue-100 border-blue-300 text-blue-900 font-semibold hover:bg-blue-200'
                      : isCurrentMonth
                      ? 'text-gray-900 bg-white border border-gray-200 hover:bg-blue-50'
                      : 'text-gray-400 bg-gray-50 border border-gray-100 hover:bg-blue-50'
                  }
                `}
              >
                <div className={`font-medium ${
                  isSelected 
                    ? 'text-sm font-bold text-white' 
                    : 'text-xs'
                }`}>
                  {dayDate.getDate()}
                </div>
                
                {hasTask && (
                  <div className="absolute bottom-0.5 left-0.5 right-0.5">
                    <div className={`
                      h-1 rounded-full transition-all duration-200
                      ${
                        isSelected
                          ? 'bg-white'
                          : hasOnlyCompletedTasks
                          ? tasksCount > 3
                            ? 'bg-red-300 opacity-60'
                            : tasksCount > 1
                            ? 'bg-yellow-300 opacity-60'
                            : 'bg-green-300 opacity-60'
                          : tasksCount > 3
                          ? 'bg-red-500'
                          : tasksCount > 1
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }
                    `} />
                  </div>
                )}
              </button>
            );
            
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          return days;
        })()}
      </div>


    </div>
  );
};

export default Calendar;
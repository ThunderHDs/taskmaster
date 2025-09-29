'use client';

import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { safeDate } from '@/utils/dateUtils';

interface CalendarHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  selectedDate,
  onDateChange
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between">
        {/* Título del calendario */}
        <div className="flex items-center">
          <CalendarIcon className="w-6 h-6 mr-3 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Vista de Calendario
          </h2>
        </div>
        
        {/* Navegación de mes */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              const prevMonth = safeDate(selectedDate.getTime());
              if (prevMonth) {
                prevMonth.setMonth(prevMonth.getMonth() - 1);
                onDateChange(prevMonth);
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h3 className="text-lg font-medium text-gray-900 min-w-[200px] text-center">
            {selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </h3>
          
          <button
            onClick={() => {
              const nextMonth = safeDate(selectedDate.getTime());
              if (nextMonth) {
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                onDateChange(nextMonth);
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {/* Fecha seleccionada */}
        <div className="text-sm text-gray-600">
          Fecha seleccionada: <span className="font-medium">
            {selectedDate.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
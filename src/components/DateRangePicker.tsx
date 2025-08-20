import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from './ui/button'
import { CalendarIcon, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'

interface DateRangePickerProps {
  startDate?: Date | null
  endDate?: Date | null
  onDateChange: (startDate: Date | null, endDate: Date | null) => void
  placeholder?: string
  className?: string
}

// Función de validación de fechas para compatibilidad con componentes existentes
export const validateDate = (dateValue: string | Date | null | undefined): Date | null => {
  if (!dateValue) return null
  
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue
  }
  
  if (typeof dateValue === 'string') {
    // Para strings en formato YYYY-MM-DD, crear la fecha usando componentes individuales
    // para evitar problemas de zona horaria
    if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateValue.split('-').map(Number)
      const date = new Date(year, month - 1, day) // month - 1 porque los meses en JS van de 0-11
      return isNaN(date.getTime()) ? null : date
    }
    
    // Para otros formatos, usar el constructor normal
    const date = new Date(dateValue)
    return isNaN(date.getTime()) ? null : date
  }
  
  return null
}

// Función para convertir Date a formato YYYY-MM-DD usando zona horaria local
export const formatDateToISO = (date: Date | null | undefined): string | null => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null
  }
  
  // Usar componentes locales para evitar problemas de zona horaria
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear()
}

const isDateInRange = (date: Date, start: Date | null, end: Date | null): boolean => {
  if (!start || !end) return false
  return date >= start && date <= end
}

const getDaysInMonth = (year: number, month: number): Date[] => {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()
  
  const days: Date[] = []
  
  // Días del mes anterior para completar la primera semana
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i))
  }
  
  // Días del mes actual
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day))
  }
  
  // Días del mes siguiente para completar la última semana
  const remainingDays = 42 - days.length // 6 semanas × 7 días
  for (let day = 1; day <= remainingDays; day++) {
    days.push(new Date(year, month + 1, day))
  }
  
  return days
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onDateChange,
  placeholder = 'Seleccionar fechas',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null)
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null)
  const [selectionMode, setSelectionMode] = useState<'start' | 'end'>('start')
  const containerRef = useRef<HTMLDivElement>(null)

  // Sincronizar con props externas
  useEffect(() => {
    setTempStartDate(startDate)
    setTempEndDate(endDate)
  }, [startDate, endDate])

  // Detectar clicks fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isOpen && tempStartDate && tempEndDate) {
          // Aplicar automáticamente si ambas fechas están seleccionadas
          onDateChange(tempStartDate, tempEndDate)
        }
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, tempStartDate, tempEndDate, onDateChange])



  const formatDateRange = () => {
    if (!startDate && !endDate) {
      return placeholder
    }
    
    if (startDate && !endDate) {
      return formatDate(startDate)
    }
    
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`
    }
    
    return placeholder
  }

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  // Calcular los dos meses a mostrar
  const firstMonthDays = useMemo(() => getDaysInMonth(currentYear, currentMonth), [currentYear, currentMonth])
  const secondMonthDays = useMemo(() => {
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
    return getDaysInMonth(nextYear, nextMonth)
  }, [currentYear, currentMonth])

  const getSecondMonthInfo = () => {
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
    return { month: nextMonth, year: nextYear }
  }

  const handleDateClick = (date: Date) => {
    // Crear una nueva fecha usando los componentes individuales para evitar problemas de zona horaria
    const clickedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (selectionMode === 'start') {
      setTempStartDate(clickedDate)
      setTempEndDate(null)
      setSelectionMode('end')
    } else {
      // Si está seleccionando la fecha final
      if (!tempStartDate) {
        setTempStartDate(clickedDate)
        setSelectionMode('end')
      } else if (clickedDate < tempStartDate) {
        // Si la fecha seleccionada es anterior a la fecha inicial, intercambiar
        setTempEndDate(tempStartDate)
        setTempStartDate(clickedDate)
        setSelectionMode('start')
      } else {
        setTempEndDate(clickedDate)
        setSelectionMode('start')
      }
    }
  }



  const clearDates = () => {
    setTempStartDate(null)
    setTempEndDate(null)
    setSelectionMode('start')
    // Usar setTimeout para evitar conflictos con el manejador global de clics
    setTimeout(() => {
      onDateChange(null, null)
    }, 0)
    // No cerrar automáticamente el picker para evitar conflictos con el manejador global
    // setIsOpen(false)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11)
        setCurrentYear(currentYear - 1)
      } else {
        setCurrentMonth(currentMonth - 1)
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0)
        setCurrentYear(currentYear + 1)
      } else {
        setCurrentMonth(currentMonth + 1)
      }
    }
  }

  return (
    <div ref={containerRef} className={cn('relative flex gap-2', className)} data-date-range-picker>
      <Button
        type="button"
        variant="outline"
        className={cn(
          'flex-1 justify-start text-left font-normal h-10',
          !startDate && !endDate && 'text-muted-foreground'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {formatDateRange()}
      </Button>
      
      {(startDate || endDate) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            clearDates()
          }}
          className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          title="Limpiar fechas"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[640px] overflow-hidden">
          {/* Header del calendario */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex gap-8">
              <h3 className="font-semibold text-gray-900">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <h3 className="font-semibold text-gray-900">
                {monthNames[getSecondMonthInfo().month]} {getSecondMonthInfo().year}
              </h3>
            </div>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Vista de dos meses */}
          <div className="flex">
            {/* Primer mes */}
            <div className="flex-1">
              {/* Días de la semana - Primer mes */}
              <div className="grid grid-cols-7 gap-0 border-b border-r">
                {dayNames.map((day) => (
                  <div key={`first-${day}`} className="p-2 text-center text-xs font-medium text-gray-500 bg-gray-50">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendario - Primer mes */}
              <div className="grid grid-cols-7 gap-0 border-r">
                {firstMonthDays.map((day, index) => {
                  const isCurrentMonth = day.getMonth() === currentMonth
                  const isToday = isSameDay(day, new Date())
                  const isStartDate = tempStartDate && isSameDay(day, tempStartDate)
                  const isEndDate = tempEndDate && isSameDay(day, tempEndDate)
                  const isInRange = isDateInRange(day, tempStartDate, tempEndDate)
                  const isPastDate = day < new Date(new Date().setHours(0, 0, 0, 0))
                  
                  return (
                    <button
                      key={`first-${index}`}
                      type="button"
                      onClick={() => handleDateClick(new Date(day))}
                      disabled={!isCurrentMonth}
                      className={cn(
                        'h-10 text-sm transition-all duration-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                        {
                          'text-gray-300': !isCurrentMonth,
                          'text-gray-900': isCurrentMonth,
                          'bg-blue-500 text-white hover:bg-blue-600': isStartDate || isEndDate,
                          'bg-blue-100 text-blue-900': isInRange && !isStartDate && !isEndDate,
                          'ring-2 ring-blue-300': isToday && !isStartDate && !isEndDate,
                          'opacity-50': isPastDate && isCurrentMonth,
                          'font-semibold': isStartDate || isEndDate,
                          'rounded-l-md': isStartDate,
                          'rounded-r-md': isEndDate && !tempEndDate,
                          'cursor-not-allowed': !isCurrentMonth
                        }
                      )}
                    >
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Segundo mes */}
            <div className="flex-1">
              {/* Días de la semana - Segundo mes */}
              <div className="grid grid-cols-7 gap-0 border-b">
                {dayNames.map((day) => (
                  <div key={`second-${day}`} className="p-2 text-center text-xs font-medium text-gray-500 bg-gray-50">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendario - Segundo mes */}
              <div className="grid grid-cols-7 gap-0">
                {secondMonthDays.map((day, index) => {
                  const secondMonthInfo = getSecondMonthInfo()
                  const isCurrentMonth = day.getMonth() === secondMonthInfo.month
                  const isToday = isSameDay(day, new Date())
                  const isStartDate = tempStartDate && isSameDay(day, tempStartDate)
                  const isEndDate = tempEndDate && isSameDay(day, tempEndDate)
                  const isInRange = isDateInRange(day, tempStartDate, tempEndDate)
                  const isPastDate = day < new Date(new Date().setHours(0, 0, 0, 0))
                  
                  return (
                    <button
                      key={`second-${index}`}
                      type="button"
                      onClick={() => handleDateClick(new Date(day))}
                      disabled={!isCurrentMonth}
                      className={cn(
                        'h-10 text-sm transition-all duration-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                        {
                          'text-gray-300': !isCurrentMonth,
                          'text-gray-900': isCurrentMonth,
                          'bg-blue-500 text-white hover:bg-blue-600': isStartDate || isEndDate,
                          'bg-blue-100 text-blue-900': isInRange && !isStartDate && !isEndDate,
                          'ring-2 ring-blue-300': isToday && !isStartDate && !isEndDate,
                          'opacity-50': isPastDate && isCurrentMonth,
                          'font-semibold': isStartDate || isEndDate,
                          'rounded-l-md': isStartDate && !tempStartDate,
                          'rounded-r-md': isEndDate,
                          'cursor-not-allowed': !isCurrentMonth
                        }
                      )}
                    >
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          
          {/* Footer con información */}
          <div className="p-4 bg-gray-50 border-t">
            <div className="text-xs text-gray-600">
              {tempStartDate && tempEndDate ? (
                <span className="text-green-600 font-medium">
                  Fecha seleccionada: {`${formatDate(tempStartDate)} - ${formatDate(tempEndDate)}`}
                </span>
              ) : tempStartDate ? (
                <span className="text-blue-600 font-medium">
                  Fecha seleccionada: {formatDate(tempStartDate)}
                </span>
              ) : (
                'Selecciona una fecha'
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
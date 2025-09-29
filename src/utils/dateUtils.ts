/**
 * Utilidades para manejo seguro de fechas que evitan TypeError: Illegal constructor
 * durante el renderizado del lado del servidor (SSR)
 */

/**
 * Crea una nueva instancia de Date de forma segura
 * @param value - Valor para crear la fecha (opcional)
 * @returns Date instance o null si hay error
 */
export function safeDate(value?: string | number | Date): Date | null {
  try {
    if (value === undefined || value === null) {
      return new Date();
    }
    
    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }
    
    const date = new Date(value);
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  } catch (error) {
    console.warn('Error creating Date:', error);
    return null;
  }
}

/**
 * Obtiene la fecha actual de forma segura
 * @returns Date instance o fecha por defecto
 */
export function safeNow(): Date {
  try {
    return new Date();
  } catch (error) {
    console.warn('Error creating current Date:', error);
    // Fecha de fallback si hay problemas con Date constructor
    return new Date(2024, 0, 1);
  }
}

/**
 * Convierte una fecha a string de forma segura
 * @param date - Fecha a convertir
 * @returns String de fecha o string vacío si hay error
 */
export function safeDateToString(date: Date | string | null | undefined): string {
  try {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? safeDate(date) : date;
    if (!dateObj) return '';
    
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.warn('Error converting date to string:', error);
    return '';
  }
}

/**
 * Formatea una fecha para mostrar de forma segura
 * @param date - Fecha a formatear
 * @param locale - Locale para el formato (default: 'es-ES')
 * @returns String formateado o string vacío si hay error
 */
export function safeFormatDate(date: Date | string | null | undefined, locale: string = 'es-ES'): string {
  try {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? safeDate(date) : date;
    if (!dateObj) return '';
    
    return dateObj.toLocaleDateString(locale);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return '';
  }
}

/**
 * Verifica si una fecha es válida
 * @param date - Fecha a verificar
 * @returns true si es válida, false si no
 */
export function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Compara dos fechas de forma segura
 * @param date1 - Primera fecha
 * @param date2 - Segunda fecha
 * @returns true si son el mismo día, false si no
 */
export function isSameDay(date1: Date | string | null, date2: Date | string | null): boolean {
  try {
    if (!date1 || !date2) return false;
    
    const d1 = typeof date1 === 'string' ? safeDate(date1) : date1;
    const d2 = typeof date2 === 'string' ? safeDate(date2) : date2;
    
    if (!d1 || !d2) return false;
    
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  } catch (error) {
    console.warn('Error comparing dates:', error);
    return false;
  }
}
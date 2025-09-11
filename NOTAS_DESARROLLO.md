# Notas de Desarrollo - TaskMaster

## Issues Identificados

### Problemas de UI/UX

1. **Date picker no se abre correctamente en vista de grupos**
   - **Problema:** Al crear subtareas en la vista de grupos, el date picker no se despliega correctamente
   - **Estado:** Pendiente de revisión
   - **Prioridad:** Media
   - **Fecha reportado:** 2025-01-08
   - **Posible causa:** Conflicto de z-index o problema de posicionamiento en el modal/dropdown

2. **Desfase de fechas en vista de calendario**
   - **Problema:** Las fechas de las tareas se muestran con un día de retraso en la vista de calendario. Si una tarea comienza el 8 Sep, se muestra en el calendario a partir del 9 Sep
   - **Estado:** Pendiente de revisión
   - **Prioridad:** Media
   - **Fecha reportado:** 2025-01-08
   - **Posible causa:** Problema de zona horaria o manejo de fechas UTC vs local

3. **Subtareas de segundo nivel no se registran**
   - **Problema:** Las subtareas no permiten crear subtareas de segundo nivel (subtareas anidadas)
   - **Estado:** Pendiente de verificación si la funcionalidad está implementada o deshabilitada
   - **Prioridad:** Media
   - **Fecha reportado:** 2025-01-08
   - **Investigación necesaria:**
     - Verificar si existe la funcionalidad en el código
     - Comprobar si está deshabilitada por configuración
     - Evaluar la estructura de base de datos para soporte de múltiples niveles

4. **Filtro de tareas pendientes no funciona correctamente en vista de calendario**
   - **Descripción:** En la vista de calendario, se muestran tareas completadas sin fecha definida aún cuando el filtro está configurado para mostrar solo tareas pendientes
   - **Comportamiento esperado:** El filtro de tareas pendientes debería ocultar todas las tareas completadas, independientemente de si tienen fecha o no
   - **Comportamiento actual:** Las tareas completadas sin fecha se siguen mostrando en la vista de calendario
   - **Impacto:** Confusión visual y filtrado inconsistente entre vistas
   - **Prioridad:** Media-Alta
   - **Fecha identificada:** 2025-01-08
   - **Área afectada:** Vista de calendario, sistema de filtros
   - **Investigación necesaria:**
     - Revisar lógica de filtrado en componente de calendario
     - Verificar si el problema afecta solo a tareas sin fecha
     - Comprobar consistencia de filtros entre diferentes vistas

---

## Mejoras Propuestas

### 1. Conteo de tareas en vista calendario
- **Descripción:** En la vista calendario, el conteo de tareas debería mostrar solo las tareas padre y discriminar entre tareas completadas y no completadas
- **Beneficio:** Mejor organización visual y comprensión del estado de las tareas
- **Prioridad:** Media
- **Fecha propuesta:** 2025-01-08
- **Implementación:** Modificar la lógica de conteo para filtrar solo tareas padre y mostrar estados separados

### 2. Vista normal por defecto sin tareas completadas
- **Descripción:** En la vista normal, por defecto debería mostrar solo las tareas no completadas para evitar saturación visual
- **Beneficio:** Interfaz más limpia y enfocada en tareas pendientes
- **Prioridad:** Alta
- **Fecha propuesta:** 2025-01-08
- **Implementación:** Agregar filtro por defecto que oculte tareas completadas con opción de mostrarlas

### 3. Cursor pointer en checkboxes de completado
- **Descripción:** Cuando haya hover en los checks de completado de las tareas, debe aparecer la mano (cursor: pointer) en lugar de la flecha por defecto
- **Beneficio:** Mejora la experiencia de usuario haciendo la interfaz más dinámica e intuitiva
- **Prioridad:** Baja
- **Fecha propuesta:** 2025-01-08
- **Implementación:** Agregar CSS `cursor: pointer` a los elementos checkbox de tareas

### 4. Sistema de análisis de productividad
- **Descripción:** Implementar la diferencia entre fechas finales estimadas y fechas reales de completado de tareas
- **Objetivo:** Generar estadísticas del tiempo real invertido en cada tarea para análisis de productividad
- **Beneficio:** Permitir sugerencias e implementación de mejoras en productividad basadas en datos históricos
- **Prioridad:** Media-Alta
- **Fecha propuesta:** 2025-01-08
- **Funcionalidades:**
  - Registro de tiempo estimado vs tiempo real
  - Dashboard de métricas de productividad
  - Sugerencias automáticas de mejora
  - Reportes de rendimiento por tipo de tarea

### 5. Mantener foco en input de título de tarea
- **Descripción:** Cuando se borra todo el contenido del título de una tarea, el foco en el input se pierde porque el formulario expandido se cierra
- **Problema:** Al borrar completamente el texto del título, el usuario pierde el foco y debe hacer clic nuevamente para continuar escribiendo
- **Solución propuesta:** Implementar lógica para restaurar automáticamente el foco en el input del título después de que se cierre el formulario expandido
- **Beneficio:** Mejora la experiencia de usuario permitiendo escritura continua sin interrupciones
- **Prioridad:** Media
- **Fecha propuesta:** 2025-01-08
- **Implementación:** Usar useEffect o callback para enfocar el input después del cierre del formulario

### 6. Simplificar apartado de filtros
- **Descripción:** El sistema actual de filtros puede ser complejo o confuso para los usuarios
- **Objetivo:** Rediseñar la interfaz de filtros para hacerla más intuitiva y fácil de usar
- **Beneficio:** Mejorar la experiencia de usuario al filtrar tareas, reduciendo la curva de aprendizaje
- **Prioridad:** Media
- **Fecha propuesta:** 2025-01-08
- **Consideraciones:**
  - Reducir el número de opciones visibles simultáneamente
  - Agrupar filtros relacionados
  - Implementar filtros rápidos o presets comunes
  - Mejorar la claridad visual de los filtros activos

### 7. Edición de tareas en masa
- **Descripción:** Implementar funcionalidad para modificar o actualizar múltiples tareas simultáneamente
- **Objetivo:** Simplificar tiempos de gestión cuando se necesita aplicar cambios similares a varias tareas
- **Beneficio:** Aumentar la eficiencia del usuario al gestionar grandes volúmenes de tareas
- **Prioridad:** Alta
- **Fecha propuesta:** 2025-01-08
- **Funcionalidades propuestas:**
  - Selección múltiple de tareas con checkboxes
  - Edición en cadena de propiedades comunes (estado, prioridad, fecha, grupo)
  - Aplicación de cambios masivos con confirmación
  - Operaciones de eliminación múltiple
  - Movimiento de tareas entre grupos en masa
- **Consideraciones técnicas:**
  - Implementar transacciones de base de datos para consistencia
  - Validación de permisos para operaciones masivas
  - Interfaz intuitiva para selección y edición

---

## Notas Técnicas

_Pendiente de agregar..._

---

*Última actualización: 8 de enero de 2025*

Este archivo será actualizado conforme se identifiquen nuevos issues o se pro
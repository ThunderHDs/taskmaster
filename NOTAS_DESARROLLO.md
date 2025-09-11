# Notas de Desarrollo - TaskMaster

## Issues Identificados

### Problemas de UI/UX

~~1. **Date picker no se abre correctamente en vista de grupos**~~ ✅ **COMPLETADO**
   - ~~**Problema:** Al crear subtareas en la vista de grupos, el date picker no se despliega correctamente~~
   - **Estado:** ✅ Resuelto
   - **Prioridad:** Media
   - **Fecha reportado:** 2025-01-08
   - **Fecha resuelto:** 2025-01-08
   - **Solución:** Cambiado `overflow-hidden` por `overflow-visible` en contenedores de grupos en TaskList.tsx

~~2. **Desfase de fechas en vista de calendario**~~ ✅ **COMPLETADO**
   - ~~**Problema:** Las fechas de las tareas se muestran con un día de retraso en la vista de calendario. Si una tarea comienza el 8 Sep, se muestra en el calendario a partir del 9 Sep~~
   - **Estado:** ✅ Resuelto
   - **Prioridad:** Media
   - **Fecha reportado:** 2025-01-08
   - **Fecha resuelto:** 2025-01-08
   - **Solución:** Corregido el manejo de fechas UTC vs local en la vista de calendario

~~3. **Subtareas de segundo nivel no se registran**~~ ✅ **COMPLETADO**
   - ~~**Problema:** Las subtareas no permiten crear subtareas de segundo nivel (subtareas anidadas)~~
   - **Estado:** ✅ Resuelto
   - **Prioridad:** Media
   - **Fecha reportado:** 2025-01-08
   - **Fecha resuelto:** 2025-01-08
   - **Solución:** Implementado soporte completo para subtareas anidadas de múltiples niveles

~~4. **Filtro de tareas pendientes no funciona correctamente en vista de calendario**~~ ✅
   - **Descripción:** ~~En la vista de calendario, se muestran tareas completadas sin fecha definida aún cuando el filtro está configurado para mostrar solo tareas pendientes~~ **SOLUCIONADO**
   - **Comportamiento esperado:** ~~El filtro de tareas pendientes debería ocultar todas las tareas completadas, independientemente de si tienen fecha o no~~ **IMPLEMENTADO**
   - **Comportamiento actual:** ~~Las tareas completadas sin fecha se siguen mostrando en la vista de calendario~~ **CORREGIDO**
   - **Impacto:** ~~Confusión visual y filtrado inconsistente entre vistas~~ **RESUELTO**
   - **Prioridad:** ~~Media-Alta~~ **COMPLETADO**
   - **Fecha identificada:** 2025-01-08
   - **Área afectada:** ~~Vista de calendario, sistema de filtros~~ **COMPLETADO**
   - **Investigación necesaria:** ~~COMPLETADA - Se corrigió la lógica de filtrado para aplicar correctamente los filtros en todas las secciones~~

~~5. **Aviso de overdue se presenta prematuramente**~~ ✅
   - **Descripción:** El aviso de overdue se está presentando cuando las tareas están en su fecha final, cuando debería aparecer una vez que la tarea sobrepasó la fecha límite
   - **Comportamiento esperado:** El aviso de overdue debería mostrarse solo después de que la fecha límite haya pasado
   - **Comportamiento actual:** ~~El aviso aparece el mismo día de la fecha límite~~ **SOLUCIONADO**
   - **Posible causa:** ~~Esto puede deberse al salto de fecha que tiene el sistema, que tiene un día adelantado a lo que muestra~~ **CORREGIDO**
   - **Impacto:** ~~Confusión en la gestión de tiempos y fechas límite~~ **RESUELTO**
   - **Prioridad:** ~~Media~~ **COMPLETADO**
   - **Fecha identificada:** 2025-01-08
   - **Área afectada:** ~~Sistema de notificaciones, manejo de fechas~~ **IMPLEMENTADO: Último día (naranja) + Overdue (rojo)**
   - **Investigación necesaria:** ~~COMPLETADA - Se implementó lógica de "último día" con color naranja y overdue real con color rojo~~

---

## Mejoras Propuestas

~~### 1. Conteo de tareas en vista calendario~~ ✅ **COMPLETADO**
- ~~**Descripción:** En la vista calendario, el conteo de tareas debería mostrar solo las tareas padre y discriminar entre tareas completadas y no completadas~~
- **Beneficio:** Mejor organización visual y comprensión del estado de las tareas
- **Prioridad:** Media
- **Fecha propuesta:** 2025-01-08
- **Fecha completado:** 2025-01-08
- **Solución:** Implementado conteo discriminado de tareas padre con estados separados

### ~~2. Vista normal por defecto sin tareas completadas~~ ✅
- **Descripción:** En la vista normal, por defecto debería mostrar solo las tareas no completadas para evitar saturación visual
- **Beneficio:** Interfaz más limpia y enfocada en tareas pendientes
- **Prioridad:** Alta
- **Fecha propuesta:** 2025-01-08
- **Implementación:** ~~Agregar filtro por defecto que oculte tareas completadas con opción de mostrarlas~~ **COMPLETADO**

### ~~3. Cursor pointer en checkboxes de completado~~ ✅
- ~~**Descripción:** Cuando haya hover en los checks de completado de las tareas, debe aparecer la mano (cursor: pointer) en lugar de la flecha por defecto~~
- **Beneficio:** Mejora la experiencia de usuario haciendo la interfaz más dinámica e intuitiva
- **Prioridad:** Baja
- **Fecha propuesta:** 2025-01-08
- **Fecha completado:** 2024-12-19
- **Solución:** Se agregó `cursor-pointer` a todos los checkboxes interactivos en TaskList.tsx, página principal e InlineTaskForm.tsx

### ~~4. Sistema de análisis de productividad~~ ✅
- ~~**Descripción:** Implementar la diferencia entre fechas finales estimadas y fechas reales de completado de tareas~~
- ~~**Objetivo:** Generar estadísticas del tiempo real invertido en cada tarea para análisis de productividad~~
- **Beneficio:** Permitir sugerencias e implementación de mejoras en productividad basadas en datos históricos
- **Prioridad:** ~~Media-Alta~~ **COMPLETADO**
- **Fecha propuesta:** 2025-01-08
- **Fecha completado:** 2025-01-13
- **Estado:** ✅ **Completado**
- **Implementación realizada:**
  - ✅ Modificada la lógica de completado de tareas en `src/app/api/tasks/[id]/route.ts`
  - ✅ Actualización automática de fecha final (`dueDate`) a la fecha actual cuando se marca como completada
  - ✅ Cálculo automático de diferencia de días entre fecha prevista y fecha real
  - ✅ Registro en historial de actividades (`ActivityLog`) con mensaje personalizado:
    - "Completada X días antes de lo previsto" (cuando se completa antes)
    - "Completada X días después de lo previsto" (cuando se completa tarde)
    - "Completada en la fecha prevista" (cuando coincide)
  - ✅ Cambio de acción en el historial a "COMPLETED" para mejor seguimiento
  - ✅ Funcionalidad probada y verificada con tareas de prueba

### ~~5. Mantener foco en input de título de tarea~~ ✅
- ~~**Descripción:** Cuando se borra todo el contenido del título de una tarea, el foco en el input se pierde porque el formulario expandido se cierra~~
- ~~**Problema:** Al borrar completamente el texto del título, el usuario pierde el foco y debe hacer clic nuevamente para continuar escribiendo~~
- ~~**Solución propuesta:** Implementar lógica para restaurar automáticamente el foco en el input del título después de que se cierre el formulario expandido~~
- **Beneficio:** Mejora la experiencia de usuario permitiendo escritura continua sin interrupciones
- **Prioridad:** ~~Media~~ **COMPLETADO**
- **Fecha propuesta:** 2025-01-08
- **Fecha completado:** 2025-01-08
- ~~**Implementación:** Usar useEffect o callback para enfocar el input después del cierre del formulario~~
- **Estado:** ✅ **Completado**
- **Solución:** Se agregó una referencia `collapsedInputRef` al input colapsado y se modificó la función `handleCollapsedInputChange` para mantener el foco en el input después del colapso automático cuando se borra el título. Se utiliza `setTimeout` para asegurar que el foco se aplique después de que el DOM se actualice.

### ~~6. Simplificar apartado de filtros~~ ✅
- ~~**Descripción:** El sistema actual de filtros puede ser complejo o confuso para los usuarios~~
- ~~**Objetivo:** Rediseñar la interfaz de filtros para hacerla más intuitiva y fácil de usar~~
- ~~**Beneficio:** Mejorar la experiencia de usuario al filtrar tareas, reduciendo la curva de aprendizaje~~
- **Estado:** ✅ **COMPLETADO**
- **Fecha de resolución:** 2025-01-12
- **Solución implementada:**
  - ✅ Movido el selector de estado (All/Pending/Completed) al header principal
  - ✅ Simplificado el panel de filtros avanzados removiendo el selector de estado
  - ✅ Reorganizado el layout del panel de filtros para mejor distribución visual
  - ✅ Verificado funcionamiento correcto en ambos modos (calendario y lista)
  - ✅ Mejorada la accesibilidad con título descriptivo y tooltip en el selector de estado

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
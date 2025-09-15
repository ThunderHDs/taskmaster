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

6. **No se pueden ingresar espacios al editar nombres de tareas o subtareas**
   - **Descripción:** Al editar el nombre de una tarea o subtarea, no es posible ingresar espacios en el campo de texto
   - **Comportamiento esperado:** Debería permitir ingresar espacios normalmente para crear nombres descriptivos
   - **Comportamiento actual:** Los espacios no se registran o se eliminan automáticamente
   - **Impacto:** Limitación en la capacidad de crear nombres descriptivos y claros para las tareas
   - **Prioridad:** Media-Alta
   - **Fecha identificada:** 2025-01-13
   - **Área afectada:** Formularios de edición de tareas y subtareas
   - **Investigación necesaria:**
     - Revisar la lógica de manejo de input en los formularios de edición
     - Verificar si hay validaciones o filtros que estén removiendo espacios
     - Comprobar el comportamiento en diferentes navegadores
     - Identificar si el problema afecta solo a espacios o a otros caracteres especiales

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

### 8. Modificación masiva de datos de subtareas
- **Descripción:** Implementar la capacidad de modificar los datos de las subtareas cuando se realiza una edición masiva de tareas
- **Objetivo:** Permitir que los cambios aplicados a las tareas padre se propaguen automáticamente a sus subtareas cuando sea necesario
- **Beneficio:** Mejorar la eficiencia en la gestión de proyectos complejos con múltiples niveles de subtareas, evitando la necesidad de editar cada subtarea individualmente
- **Prioridad:** Media-Alta
- **Fecha propuesta:** 2025-01-13
- **Funcionalidades requeridas:**
  - Opción para aplicar cambios a subtareas durante edición masiva
  - Selector de qué propiedades propagar (fechas, prioridad, grupo, estado)
  - Vista previa de cambios antes de aplicar
  - Respeto a la jerarquía de subtareas (aplicar solo a nivel inmediato o a todos los niveles)
  - Confirmación explícita del usuario antes de modificar subtareas
- **Consideraciones técnicas:**
  - Implementar lógica recursiva para navegación de jerarquías de subtareas
  - Validar que los cambios sean coherentes con la estructura de dependencias
  - Manejar conflictos cuando las subtareas tienen valores específicos que no deben ser sobrescritos
  - Implementar rollback en caso de errores durante la aplicación masiva
  - Registrar en el historial de actividades los cambios realizados en cada subtarea

### 9. Sección de productividad, estadísticas y estatus de grupos
- **Descripción:** Agregar una sección de productividad, estadísticas y estatus de los grupos, a modo de proyecto, que sea visual, práctica y sencilla
- **Objetivo:** Proporcionar una vista general del rendimiento y progreso de los grupos de tareas de manera visual e intuitiva
- **Beneficio:** Permitir un mejor seguimiento del progreso de proyectos y análisis de productividad a nivel de grupo
- **Prioridad:** Media
- **Fecha propuesta:** 2025-01-15
- **Estado:** Planificado (no se trabajará de momento)
- **Funcionalidades propuestas:**
  - Dashboard visual con métricas de productividad por grupo
  - Gráficos de progreso y estadísticas de completado
  - Indicadores de estatus y salud de cada grupo/proyecto
  - Métricas de tiempo estimado vs tiempo real
  - Vista comparativa entre diferentes grupos
- **Consideraciones de diseño:**
  - Interfaz visual, práctica y sencilla
  - Gráficos y visualizaciones claras
  - Información resumida y de fácil comprensión
  - Integración fluida con el sistema actual de grupos

### 10. Sistema de plantillas de grupos
- **Descripción:** Crear un sistema de plantillas de grupos con tareas y subtareas ya predefinidas, que se seleccione el tipo de grupo según se necesite, con la cantidad de tareas a especificar por el usuario, y los nombres de estas tareas
- **Objetivo:** Facilitar la creación rápida de grupos de tareas basados en plantillas predefinidas para diferentes tipos de proyectos
- **Beneficio:** Acelerar la configuración inicial de proyectos y estandarizar estructuras de trabajo comunes
- **Prioridad:** Media
- **Fecha propuesta:** 2025-01-15
- **Estado:** Planificado (no se trabajará de momento)
- **Funcionalidades propuestas:**
  - Biblioteca de plantillas predefinidas por tipo de proyecto
  - Selector de tipo de grupo/plantilla
  - Configuración de cantidad de tareas por el usuario
  - Personalización de nombres de tareas durante la creación
  - Estructura de subtareas predefinida según el tipo de plantilla
  - Opción de guardar configuraciones personalizadas como nuevas plantillas
- **Consideraciones técnicas:**
  - Sistema de templates flexible y extensible
  - Interfaz intuitiva para selección y configuración
  - Validación de estructura de tareas y subtareas
  - Integración con el sistema actual de grupos y tareas

---

## Notas Técnicas

### Mejoras en Logs de Actividad

- **Hay logs dentro del histórico de actividades, que no dan información de las tareas actualizadas, solo dice "Se actualizó la tarea" pero no dice cuál, ni qué se actualizó, vamos a prestar atención a eso...**
  - **Descripción:** Los logs actuales en el historial de actividades son muy genéricos y no proporcionan información específica sobre qué tarea fue modificada ni qué campos fueron actualizados
  - **Impacto:** Dificulta el seguimiento detallado de cambios y la auditoría de modificaciones
  - **Prioridad:** Media
  - **Fecha identificada:** 2025-01-15
  - **Área afectada:** Sistema de logging, historial de actividades
  - **Mejora propuesta:** Implementar logs más descriptivos que incluyan:
    - Nombre específico de la tarea modificada
    - Campos que fueron actualizados
    - Valores anteriores y nuevos (cuando sea relevante)
    - Contexto adicional de la modificación

---

*Última actualización: 8 de enero de 2025*

Este archivo será actualizado conforme se identifiquen nuevos issues o se pro
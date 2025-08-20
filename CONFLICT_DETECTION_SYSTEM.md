# Sistema de Detección de Conflictos - TaskMaster

## Estado Actual
**DESHABILITADO** - El sistema de detección de conflictos ha sido completamente deshabilitado para resolver problemas de funcionalidad.

## Descripción del Sistema

El sistema de detección de conflictos era una funcionalidad avanzada que permitía:

1. **Detección de conflictos de fechas entre tareas padre e hijas**
   - Verificaba si las fechas de una subtarea estaban fuera del rango de fechas de su tarea padre
   - Detectaba conflictos de fecha de inicio (subtarea inicia antes que el padre)
   - Detectaba conflictos de fecha de fin (subtarea termina después que el padre)

2. **Resolución interactiva de conflictos**
   - Modal de advertencia cuando se detectaban conflictos
   - Opciones para ajustar fechas de la subtarea o expandir fechas del padre
   - Actualización automática de fechas del padre cuando era necesario

## Componentes Afectados

### Componentes Deshabilitados/Modificados:

1. **`src/components/ConflictAlert.tsx`**
   - Componente completamente comentado
   - Mostraba alertas de conflictos en la interfaz

2. **`src/components/InlineTaskEditForm.tsx`**
   - Lógica de detección de conflictos completamente removida
   - Función `checkDateConflicts()` eliminada
   - Estados de conflicto eliminados
   - Modal `DateConflictWarning` removido
   - Funciones de resolución de conflictos eliminadas

3. **`src/components/InlineSubtaskForm.tsx`**
   - Llamadas a detección de conflictos comentadas
   - Componente `ConflictAlert` comentado

4. **`src/app/page.tsx`**
   - Llamadas a API de conflictos comentadas
   - Estados de conflictos comentados
   - Funciones de manejo de conflictos comentadas

### APIs Relacionadas:

1. **`src/app/api/conflicts/route.ts`**
   - API endpoint para obtener conflictos (aún funcional)

2. **`src/app/api/tasks/route.ts`**
   - Incluye relaciones padre-hijo necesarias para detección

## Problemas Identificados

Antes de la deshabilitación, se identificaron los siguientes problemas:

1. **Problema de propagación de datos padre**
   - `task.parent` llegaba como `undefined` en algunos casos
   - `localParentTask` no se actualizaba correctamente
   - La API devolvía datos correctos, pero se perdían en el frontend

2. **Problemas de timing y estado**
   - Estados de React no se sincronizaban correctamente
   - `useEffect` no se ejecutaba en el momento adecuado

## Pasos para Reactivación

### 1. Restaurar Componentes

```bash
# Descomentar en src/components/InlineSubtaskForm.tsx
# Líneas relacionadas con ConflictAlert

# Descomentar en src/app/page.tsx
# - Import de ConflictAlert
# - Estados de conflictos
# - Llamadas a API de conflictos
# - Funciones de manejo de conflictos
```

### 2. Restaurar InlineTaskEditForm.tsx

Este es el componente más complejo que necesita restauración completa:

```typescript
// Restaurar imports
import DateConflictWarning from './DateConflictWarning';

// Restaurar estados
const [localParentTask, setLocalParentTask] = useState<ParentTask | undefined>(parentTask);
const [showConflictWarning, setShowConflictWarning] = useState(false);
const [conflictType, setConflictType] = useState<'start_before' | 'end_after' | 'both'>('both');
const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);

// Restaurar useEffects
useEffect(() => {
  setLocalParentTask(parentTask);
}, [parentTask]);

// Restaurar función checkDateConflicts
// Restaurar funciones de resolución de conflictos
// Restaurar modal DateConflictWarning
```

### 3. Descomentar ConflictAlert.tsx

Remover los comentarios del archivo completo.

### 4. Debugging Recomendado

Para resolver los problemas originales:

1. **Verificar propagación de datos padre**
   ```typescript
   // En TaskList.tsx, verificar que task.parent esté definido
   console.log('Parent data:', task.parent);
   
   // En InlineTaskEditForm.tsx, verificar recepción de parentTask
   console.log('Received parentTask:', parentTask);
   ```

2. **Verificar timing de useEffect**
   ```typescript
   useEffect(() => {
     console.log('ParentTask updated:', parentTask);
     setLocalParentTask(parentTask);
   }, [parentTask]);
   ```

3. **Verificar datos de API**
   - Confirmar que `/api/tasks` incluye `parent: true`
   - Verificar que las relaciones se cargan correctamente

### 5. Testing

1. Crear una tarea padre con fechas
2. Crear una subtarea con fechas que conflicten
3. Editar la subtarea y verificar detección de conflictos
4. Probar ambas opciones de resolución

## Archivos de Backup

Si es necesario, se pueden consultar los commits anteriores para ver la implementación completa del sistema.

## Notas Técnicas

- El sistema usaba comparación de objetos Date para detectar conflictos
- Las fechas se manejaban en formato ISO string
- Se implementó lógica para expandir automáticamente las fechas del padre
- El modal de conflictos ofrecía dos opciones: ajustar subtarea o expandir padre

## Contacto

Para preguntas sobre la reactivación del sistema, consultar con el equipo de desarrollo.
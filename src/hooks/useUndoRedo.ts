import { useState, useCallback, useRef } from 'react';

/**
 * Tipos de acciones que se pueden deshacer
 */
export type UndoableActionType = 
  | 'TASK_TOGGLE' 
  | 'TASK_UPDATE' 
  | 'TASK_DELETE' 
  | 'TASK_CREATE' 
  | 'BULK_UPDATE'
  | 'SUBTASK_CREATE';

/**
 * Estructura de una acción que se puede deshacer
 */
export interface UndoableAction {
  id: string;
  type: UndoableActionType;
  timestamp: number;
  description: string;
  data: {
    taskId?: string;
    taskIds?: string[];
    previousState?: any;
    newState?: any;
    parentId?: string;
  };
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

/**
 * Estado del toast de notificación
 */
interface ToastState {
  isVisible: boolean;
  message: string;
  actionId: string;
}

/**
 * Hook personalizado para manejar funcionalidad de deshacer/rehacer
 */
export const useUndoRedo = () => {
  const [undoStack, setUndoStack] = useState<UndoableAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoableAction[]>([]);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isRedoing, setIsRedoing] = useState(false);
  const [toastState, setToastState] = useState<ToastState>({
    isVisible: false,
    message: '',
    actionId: ''
  });
  
  // Referencia para generar IDs únicos
  const actionIdRef = useRef(0);

  /**
   * Genera un ID único para cada acción
   */
  const generateActionId = useCallback(() => {
    actionIdRef.current += 1;
    return `action_${actionIdRef.current}_${Date.now()}`;
  }, []);

  /**
   * Muestra el toast de notificación
   */
  const showToast = useCallback((message: string, actionId: string) => {
    setToastState({
      isVisible: true,
      message,
      actionId
    });
  }, []);

  /**
   * Oculta el toast de notificación
   */
  const hideToast = useCallback(() => {
    setToastState(prev => ({
      ...prev,
      isVisible: false
    }));
  }, []);

  /**
   * Agrega una nueva acción al historial de deshacer
   */
  const addAction = useCallback((action: Omit<UndoableAction, 'id' | 'timestamp'>) => {
    const newAction: UndoableAction = {
      ...action,
      id: generateActionId(),
      timestamp: Date.now()
    };

    setUndoStack(prev => {
      // Limitar el historial a las últimas 50 acciones para evitar problemas de memoria
      const newStack = [...prev, newAction];
      return newStack.slice(-50);
    });
    
    // Limpiar el stack de rehacer cuando se agrega una nueva acción
    setRedoStack([]);

    // Mostrar toast de notificación de forma asíncrona para evitar setState durante render
    setTimeout(() => {
      showToast(action.description, newAction.id);
    }, 0);

    return newAction.id;
  }, [generateActionId, showToast]);

  /**
   * Deshace una acción desde el toast
   */
  const undoFromToast = useCallback(async () => {
    if (undoStack.length === 0 || isUndoing || isRedoing) {
      return;
    }

    const lastAction = undoStack[undoStack.length - 1];
    if (!lastAction || lastAction.id !== toastState.actionId) {
      return;
    }

    setIsUndoing(true);
    hideToast();

    try {
      await lastAction.undo();
      
      // Mover la acción del stack de deshacer al stack de rehacer
      setUndoStack(prev => prev.slice(0, -1));
      setRedoStack(prev => [...prev, lastAction]);
      
      console.log(`Acción deshecha desde toast: ${lastAction.description}`);
    } catch (error) {
      console.error('Error al deshacer acción desde toast:', error);
      throw error;
    } finally {
      setIsUndoing(false);
    }
  }, [undoStack, isUndoing, isRedoing, toastState.actionId, hideToast]);

  /**
   * Deshace la última acción
   */
  const undo = useCallback(async () => {
    if (undoStack.length === 0 || isUndoing || isRedoing) {
      return;
    }

    const lastAction = undoStack[undoStack.length - 1];
    setIsUndoing(true);

    try {
      await lastAction.undo();
      
      // Mover la acción del stack de deshacer al stack de rehacer
      setUndoStack(prev => prev.slice(0, -1));
      setRedoStack(prev => [...prev, lastAction]);
      
      console.log(`Acción deshecha: ${lastAction.description}`);
    } catch (error) {
      console.error('Error al deshacer acción:', error);
      throw error;
    } finally {
      setIsUndoing(false);
    }
  }, [undoStack, isUndoing, isRedoing]);

  /**
   * Rehace la última acción deshecha
   */
  const redo = useCallback(async () => {
    if (redoStack.length === 0 || isUndoing || isRedoing) {
      return;
    }

    const lastRedoAction = redoStack[redoStack.length - 1];
    setIsRedoing(true);

    try {
      await lastRedoAction.redo();
      
      // Mover la acción del stack de rehacer al stack de deshacer
      setRedoStack(prev => prev.slice(0, -1));
      setUndoStack(prev => [...prev, lastRedoAction]);
      
      console.log(`Acción rehecha: ${lastRedoAction.description}`);
    } catch (error) {
      console.error('Error al rehacer acción:', error);
      throw error;
    } finally {
      setIsRedoing(false);
    }
  }, [redoStack, isUndoing, isRedoing]);

  /**
   * Limpia todo el historial
   */
  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  /**
   * Obtiene información sobre el estado actual del historial
   */
  const getHistoryInfo = useCallback(() => {
    return {
      canUndo: undoStack.length > 0 && !isUndoing && !isRedoing,
      canRedo: redoStack.length > 0 && !isUndoing && !isRedoing,
      undoCount: undoStack.length,
      redoCount: redoStack.length,
      lastAction: undoStack.length > 0 ? undoStack[undoStack.length - 1] : null,
      nextRedoAction: redoStack.length > 0 ? redoStack[redoStack.length - 1] : null
    };
  }, [undoStack, redoStack, isUndoing, isRedoing]);

  return {
    addAction,
    undo,
    undoFromToast,
    redo,
    clearHistory,
    getHistoryInfo,
    isUndoing,
    isRedoing,
    showToast,
    hideToast,
    toastState
  };
};

export default useUndoRedo;
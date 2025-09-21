import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Task } from '../types';

// ============================================================================
// INTERFACES PARA EL STORE DE UI
// ============================================================================

interface ModalState {
  // Modales de tareas
  isTaskFormOpen: boolean;
  isBulkTaskFormOpen: boolean;
  isInlineTaskFormOpen: boolean;
  
  // Modales de gestión
  isTagManagerOpen: boolean;
  isGroupManagerOpen: boolean;
  
  // Modales de confirmación
  isDeleteConfirmationOpen: boolean;
  isBulkDeleteModalOpen: boolean;
  isBulkEditModalOpen: boolean;
  
  // Datos para modales
  editingTask: Task | null;
  taskToDelete: Task | null;
  tasksToDelete: string[];
  tasksToEdit: string[];
}

interface ViewState {
  // Vistas principales
  currentView: 'list' | 'calendar' | 'kanban';
  
  // Estados de sidebar y paneles
  isSidebarOpen: boolean;
  isFiltersOpen: boolean;
  isCalendarHeaderOpen: boolean;
  
  // Estados de carga
  isLoading: boolean;
  loadingMessage: string;
  
  // Estados de notificaciones
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>;
  
  // Estados de undo/redo
  canUndo: boolean;
  canRedo: boolean;
  undoMessage: string;
}

interface UIStore {
  // Estado de modales
  modals: ModalState;
  
  // Estado de vistas
  views: ViewState;
  
  // ============================================================================
  // ACCIONES PARA MODALES
  // ============================================================================
  
  // Modales de tareas
  openTaskForm: (task?: Task) => void;
  closeTaskForm: () => void;
  
  openBulkTaskForm: () => void;
  closeBulkTaskForm: () => void;
  
  openInlineTaskForm: () => void;
  closeInlineTaskForm: () => void;
  
  // Modales de gestión
  openTagManager: () => void;
  closeTagManager: () => void;
  
  openGroupManager: () => void;
  closeGroupManager: () => void;
  
  // Modales de confirmación
  openDeleteConfirmation: (task: Task) => void;
  closeDeleteConfirmation: () => void;
  
  openBulkDeleteModal: (taskIds: string[]) => void;
  closeBulkDeleteModal: () => void;
  
  openBulkEditModal: (taskIds: string[]) => void;
  closeBulkEditModal: () => void;
  
  // Cerrar todos los modales
  closeAllModals: () => void;
  
  // ============================================================================
  // ACCIONES PARA VISTAS
  // ============================================================================
  
  // Cambio de vista
  setCurrentView: (view: 'list' | 'calendar' | 'kanban') => void;
  
  // Estados de sidebar y paneles
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  
  setFiltersOpen: (open: boolean) => void;
  toggleFilters: () => void;
  
  setCalendarHeaderOpen: (open: boolean) => void;
  toggleCalendarHeader: () => void;
  
  // Estados de carga
  setLoading: (loading: boolean, message?: string) => void;
  
  // Notificaciones
  addNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Estados de undo/redo
  setUndoRedoState: (canUndo: boolean, canRedo: boolean, undoMessage?: string) => void;
  
  // ============================================================================
  // UTILIDADES
  // ============================================================================
  
  resetUIState: () => void;
}

// ============================================================================
// ESTADO INICIAL
// ============================================================================

const initialModalState: ModalState = {
  isTaskFormOpen: false,
  isBulkTaskFormOpen: false,
  isInlineTaskFormOpen: false,
  isTagManagerOpen: false,
  isGroupManagerOpen: false,
  isDeleteConfirmationOpen: false,
  isBulkDeleteModalOpen: false,
  isBulkEditModalOpen: false,
  editingTask: null,
  taskToDelete: null,
  tasksToDelete: [],
  tasksToEdit: []
};

const initialViewState: ViewState = {
  currentView: 'list',
  isSidebarOpen: true,
  isFiltersOpen: false,
  isCalendarHeaderOpen: false,
  isLoading: false,
  loadingMessage: '',
  notifications: [],
  canUndo: false,
  canRedo: false,
  undoMessage: ''
};

// ============================================================================
// STORE DE UI
// ============================================================================

export const useUIStore = create<UIStore>()(devtools((set, get) => ({
  // Estado inicial
  modals: initialModalState,
  views: initialViewState,
  
  // ============================================================================
  // ACCIONES PARA MODALES
  // ============================================================================
  
  openTaskForm: (task) => set(
    (state) => ({
      modals: {
        ...state.modals,
        isTaskFormOpen: true,
        editingTask: task || null
      }
    }),
    false,
    'openTaskForm'
  ),
  
  closeTaskForm: () => set(
    (state) => ({
      modals: {
        ...state.modals,
        isTaskFormOpen: false,
        editingTask: null
      }
    }),
    false,
    'closeTaskForm'
  ),
  
  openBulkTaskForm: () => set(
    (state) => ({
      modals: {
        ...state.modals,
        isBulkTaskFormOpen: true
      }
    }),
    false,
    'openBulkTaskForm'
  ),
  
  closeBulkTaskForm: () => set(
    (state) => ({
      modals: {
        ...state.modals,
        isBulkTaskFormOpen: false
      }
    }),
    false,
    'closeBulkTaskForm'
  ),
  
  openInlineTaskForm: () => set(
    (state) => ({
      modals: {
        ...state.modals,
        isInlineTaskFormOpen: true
      }
    }),
    false,
    'openInlineTaskForm'
  ),
  
  closeInlineTaskForm: () => set(
    (state) => ({
      modals: {
        ...state.modals,
        isInlineTaskFormOpen: false
      }
    }),
    false,
    'closeInlineTaskForm'
  ),
  
  openTagManager: () => set(
    (state) => ({
      modals: {
        ...state.modals,
        isTagManagerOpen: true
      }
    }),
    false,
    'openTagManager'
  ),
  
  closeTagManager: () => set(
    (state) => ({
      modals: {
        ...state.modals,
        isTagManagerOpen: false
      }
    }),
    false,
    'closeTagManager'
  ),
  
  openGroupManager: () => set(
    (state) => ({
      modals: {
        ...state.modals,
        isGroupManagerOpen: true
      }
    }),
    false,
    'openGroupManager'
  ),
  
  closeGroupManager: () => set(
    (state) => ({
      modals: {
        ...state.modals,
        isGroupManagerOpen: false
      }
    }),
    false,
    'closeGroupManager'
  ),
  
  openDeleteConfirmation: (task) => set(
    (state) => ({
      modals: {
        ...state.modals,
        isDeleteConfirmationOpen: true,
        taskToDelete: task
      }
    }),
    false,
    'openDeleteConfirmation'
  ),
  
  closeDeleteConfirmation: () => set(
    (state) => ({
      modals: {
        ...state.modals,
        isDeleteConfirmationOpen: false,
        taskToDelete: null
      }
    }),
    false,
    'closeDeleteConfirmation'
  ),
  
  openBulkDeleteModal: (taskIds) => set(
    (state) => ({
      modals: {
        ...state.modals,
        isBulkDeleteModalOpen: true,
        tasksToDelete: taskIds
      }
    }),
    false,
    'openBulkDeleteModal'
  ),
  
  closeBulkDeleteModal: () => set(
    (state) => ({
      modals: {
        ...state.modals,
        isBulkDeleteModalOpen: false,
        tasksToDelete: []
      }
    }),
    false,
    'closeBulkDeleteModal'
  ),
  
  openBulkEditModal: (taskIds) => set(
    (state) => ({
      modals: {
        ...state.modals,
        isBulkEditModalOpen: true,
        tasksToEdit: taskIds
      }
    }),
    false,
    'openBulkEditModal'
  ),
  
  closeBulkEditModal: () => set(
    (state) => ({
      modals: {
        ...state.modals,
        isBulkEditModalOpen: false,
        tasksToEdit: []
      }
    }),
    false,
    'closeBulkEditModal'
  ),
  
  closeAllModals: () => set(
    (state) => ({
      modals: initialModalState
    }),
    false,
    'closeAllModals'
  ),
  
  // ============================================================================
  // ACCIONES PARA VISTAS
  // ============================================================================
  
  setCurrentView: (currentView) => set(
    (state) => ({
      views: {
        ...state.views,
        currentView
      }
    }),
    false,
    'setCurrentView'
  ),
  
  setSidebarOpen: (isSidebarOpen) => set(
    (state) => ({
      views: {
        ...state.views,
        isSidebarOpen
      }
    }),
    false,
    'setSidebarOpen'
  ),
  
  toggleSidebar: () => set(
    (state) => ({
      views: {
        ...state.views,
        isSidebarOpen: !state.views.isSidebarOpen
      }
    }),
    false,
    'toggleSidebar'
  ),
  
  setFiltersOpen: (isFiltersOpen) => set(
    (state) => ({
      views: {
        ...state.views,
        isFiltersOpen
      }
    }),
    false,
    'setFiltersOpen'
  ),
  
  toggleFilters: () => set(
    (state) => ({
      views: {
        ...state.views,
        isFiltersOpen: !state.views.isFiltersOpen
      }
    }),
    false,
    'toggleFilters'
  ),
  
  setCalendarHeaderOpen: (isCalendarHeaderOpen) => set(
    (state) => ({
      views: {
        ...state.views,
        isCalendarHeaderOpen
      }
    }),
    false,
    'setCalendarHeaderOpen'
  ),
  
  toggleCalendarHeader: () => set(
    (state) => ({
      views: {
        ...state.views,
        isCalendarHeaderOpen: !state.views.isCalendarHeaderOpen
      }
    }),
    false,
    'toggleCalendarHeader'
  ),
  
  setLoading: (isLoading, loadingMessage = '') => set(
    (state) => ({
      views: {
        ...state.views,
        isLoading,
        loadingMessage
      }
    }),
    false,
    'setLoading'
  ),
  
  addNotification: (type, message) => set(
    (state) => {
      const newNotification = {
        id: Date.now().toString(),
        type,
        message,
        timestamp: Date.now()
      };
      
      return {
        views: {
          ...state.views,
          notifications: [...state.views.notifications, newNotification]
        }
      };
    },
    false,
    'addNotification'
  ),
  
  removeNotification: (id) => set(
    (state) => ({
      views: {
        ...state.views,
        notifications: state.views.notifications.filter(n => n.id !== id)
      }
    }),
    false,
    'removeNotification'
  ),
  
  clearNotifications: () => set(
    (state) => ({
      views: {
        ...state.views,
        notifications: []
      }
    }),
    false,
    'clearNotifications'
  ),
  
  setUndoRedoState: (canUndo, canRedo, undoMessage = '') => set(
    (state) => ({
      views: {
        ...state.views,
        canUndo,
        canRedo,
        undoMessage
      }
    }),
    false,
    'setUndoRedoState'
  ),
  
  // ============================================================================
  // UTILIDADES
  // ============================================================================
  
  resetUIState: () => set(
    {
      modals: initialModalState,
      views: initialViewState
    },
    false,
    'resetUIState'
  )
}), {
  name: 'ui-store'
}));

export default useUIStore;
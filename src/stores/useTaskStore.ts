import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Task, Tag, TaskGroup, Priority } from '../types';

// ============================================================================
// INTERFACES PARA EL STORE
// ============================================================================

interface TaskFilters {
  selectedTags: Set<string>;
  selectedGroups: Set<string>;
  selectedPriorities: Set<Priority>;
  showCompleted: boolean;
  showOverdue: boolean;
  dateFilter: 'all' | 'today' | 'week' | 'month';
  searchQuery: string;
}

interface TaskUIState {
  selectedTasks: Set<string>;
  expandedTasks: Set<string>;
  expandedGroups: Set<string>;
  editingTasks: Set<string>;
  editingValues: Record<string, string>;
  inlineEditingTasks: Set<string>;
  creatingSubtasks: Set<string>;
  completingTasks: Set<string>;
  animatingProgress: Set<string>;
  openMenus: Set<string>;
  visibleHistory: Set<string>;
  hoveredTasks: Set<string>;
  clickedTasks: Set<string>;
}

interface TaskStore {
  // Estado de datos
  tasks: Task[];
  availableTags: Tag[];
  availableGroups: TaskGroup[];
  
  // Estado de filtros
  filters: TaskFilters;
  
  // Estado de UI
  ui: TaskUIState;
  
  // Estado de modo
  isMultiSelectMode: boolean;
  isGroupedView: boolean;
  
  // ============================================================================
  // ACCIONES PARA DATOS
  // ============================================================================
  
  setTasks: (tasks: Task[]) => void;
  setAvailableTags: (tags: Tag[]) => void;
  setAvailableGroups: (groups: TaskGroup[]) => void;
  
  // ============================================================================
  // ACCIONES PARA FILTROS
  // ============================================================================
  
  setSelectedTags: (tags: Set<string>) => void;
  toggleTag: (tagId: string) => void;
  clearSelectedTags: () => void;
  
  setSelectedGroups: (groups: Set<string>) => void;
  toggleGroup: (groupId: string) => void;
  clearSelectedGroups: () => void;
  
  setSelectedPriorities: (priorities: Set<Priority>) => void;
  togglePriority: (priority: Priority) => void;
  clearSelectedPriorities: () => void;
  
  setShowCompleted: (show: boolean) => void;
  setShowOverdue: (show: boolean) => void;
  setDateFilter: (filter: 'all' | 'today' | 'week' | 'month') => void;
  setSearchQuery: (query: string) => void;
  
  clearAllFilters: () => void;
  
  // ============================================================================
  // ACCIONES PARA UI
  // ============================================================================
  
  // Selección múltiple
  setSelectedTasks: (tasks: Set<string>) => void;
  toggleTaskSelection: (taskId: string) => void;
  selectAllTasks: () => void;
  clearSelectedTasks: () => void;
  
  // Expansión de tareas y grupos
  setExpandedTasks: (tasks: Set<string>) => void;
  toggleTaskExpansion: (taskId: string) => void;
  setExpandedGroups: (groups: Set<string>) => void;
  toggleGroupExpansion: (groupId: string) => void;
  
  // Estados de edición
  setEditingTasks: (tasks: Set<string>) => void;
  toggleTaskEditing: (taskId: string) => void;
  setEditingValues: (values: Record<string, string>) => void;
  updateEditingValue: (taskId: string, value: string) => void;
  addEditingTask: (taskId: string) => void;
  removeEditingTask: (taskId: string) => void;
  setEditingValue: (taskId: string, value: string) => void;
  removeEditingValue: (taskId: string) => void;
  
  setInlineEditingTasks: (tasks: Set<string>) => void;
  toggleInlineEditing: (taskId: string) => void;
  removeInlineEditingTask: (taskId: string) => void;
  
  // Estados de creación y animación
  setCreatingSubtasks: (tasks: Set<string>) => void;
  toggleSubtaskCreation: (taskId: string) => void;
  addCreatingSubtask: (taskId: string) => void;
  removeCreatingSubtask: (taskId: string) => void;
  
  setCompletingTasks: (tasks: Set<string>) => void;
  toggleTaskCompletion: (taskId: string) => void;
  
  setAnimatingProgress: (tasks: Set<string>) => void;
  toggleProgressAnimation: (taskId: string) => void;
  
  // Estados de menús e interacciones
  setOpenMenus: (menus: Set<string>) => void;
  toggleMenu: (menuId: string) => void;
  closeAllMenus: () => void;
  setOpenMenu: (menuId: string) => void;
  
  // Estados de hover
  addHoveredTask: (taskId: string) => void;
  clearHoveredTasks: () => void;
  
  // Estados de completing
  addCompletingTask: (taskId: string) => void;
  removeCompletingTask: (taskId: string) => void;
  
  setVisibleHistory: (history: Set<string>) => void;
  toggleHistoryVisibility: (taskId: string) => void;
  toggleVisibleHistory: (taskId: string) => void;
  
  setHoveredTasks: (tasks: Set<string>) => void;
  toggleTaskHover: (taskId: string) => void;
  
  setClickedTasks: (tasks: Set<string>) => void;
  toggleTaskClick: (taskId: string) => void;
  
  // ============================================================================
  // ACCIONES PARA MODO
  // ============================================================================
  
  setIsMultiSelectMode: (mode: boolean) => void;
  toggleMultiSelectMode: () => void;
  
  setIsGroupedView: (grouped: boolean) => void;
  toggleGroupedView: () => void;
  
  // ============================================================================
  // UTILIDADES
  // ============================================================================
  
  resetUIState: () => void;
  getFilteredTasks: () => Task[];
}

// ============================================================================
// ESTADO INICIAL
// ============================================================================

const initialFilters: TaskFilters = {
  selectedTags: new Set(),
  selectedGroups: new Set(),
  selectedPriorities: new Set(),
  showCompleted: true,
  showOverdue: false,
  dateFilter: 'all',
  searchQuery: ''
};

const initialUIState: TaskUIState = {
  selectedTasks: new Set(),
  expandedTasks: new Set(),
  expandedGroups: new Set(),
  editingTasks: new Set(),
  editingValues: {},
  inlineEditingTasks: new Set(),
  creatingSubtasks: new Set(),
  completingTasks: new Set(),
  animatingProgress: new Set(),
  openMenus: new Set(),
  visibleHistory: new Set(),
  hoveredTasks: new Set(),
  clickedTasks: new Set()
};

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

const isOverdue = (dueDate: string, completed: boolean) => {
  if (completed) return false;
  const today = new Date();
  const due = new Date(dueDate);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
};

const isInDateRange = (task: Task, filter: 'all' | 'today' | 'week' | 'month') => {
  if (filter === 'all') return true;
  if (!task.dueDate && !task.startDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const taskDate = new Date(task.dueDate || task.startDate!);
  taskDate.setHours(0, 0, 0, 0);

  switch (filter) {
    case 'today':
      return taskDate.getTime() === today.getTime();
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return taskDate >= weekStart && taskDate <= weekEnd;
    case 'month':
      return taskDate.getMonth() === today.getMonth() && taskDate.getFullYear() === today.getFullYear();
    default:
      return true;
  }
};

// ============================================================================
// STORE PRINCIPAL
// ============================================================================

export const useTaskStore = create<TaskStore>()(devtools((set, get) => ({
  // Estado inicial
  tasks: [],
  availableTags: [],
  availableGroups: [],
  filters: initialFilters,
  ui: initialUIState,
  isMultiSelectMode: false,
  isGroupedView: false,
  
  // ============================================================================
  // ACCIONES PARA DATOS
  // ============================================================================
  
  setTasks: (tasks) => set({ tasks }, false, 'setTasks'),
  setAvailableTags: (availableTags) => set({ availableTags }, false, 'setAvailableTags'),
  setAvailableGroups: (availableGroups) => set({ availableGroups }, false, 'setAvailableGroups'),
  
  // ============================================================================
  // ACCIONES PARA FILTROS
  // ============================================================================
  
  setSelectedTags: (selectedTags) => set(
    (state) => ({ filters: { ...state.filters, selectedTags } }),
    false,
    'setSelectedTags'
  ),
  
  toggleTag: (tagId) => set(
    (state) => {
      const newSelectedTags = new Set(state.filters.selectedTags);
      if (newSelectedTags.has(tagId)) {
        newSelectedTags.delete(tagId);
      } else {
        newSelectedTags.add(tagId);
      }
      return { filters: { ...state.filters, selectedTags: newSelectedTags } };
    },
    false,
    'toggleTag'
  ),
  
  clearSelectedTags: () => set(
    (state) => ({ filters: { ...state.filters, selectedTags: new Set() } }),
    false,
    'clearSelectedTags'
  ),
  
  setSelectedGroups: (selectedGroups) => set(
    (state) => ({ filters: { ...state.filters, selectedGroups } }),
    false,
    'setSelectedGroups'
  ),
  
  toggleGroup: (groupId) => set(
    (state) => {
      const newSelectedGroups = new Set(state.filters.selectedGroups);
      if (newSelectedGroups.has(groupId)) {
        newSelectedGroups.delete(groupId);
      } else {
        newSelectedGroups.add(groupId);
      }
      return { filters: { ...state.filters, selectedGroups: newSelectedGroups } };
    },
    false,
    'toggleGroup'
  ),
  
  clearSelectedGroups: () => set(
    (state) => ({ filters: { ...state.filters, selectedGroups: new Set() } }),
    false,
    'clearSelectedGroups'
  ),
  
  setSelectedPriorities: (selectedPriorities) => set(
    (state) => ({ filters: { ...state.filters, selectedPriorities } }),
    false,
    'setSelectedPriorities'
  ),
  
  togglePriority: (priority) => set(
    (state) => {
      const newSelectedPriorities = new Set(state.filters.selectedPriorities);
      if (newSelectedPriorities.has(priority)) {
        newSelectedPriorities.delete(priority);
      } else {
        newSelectedPriorities.add(priority);
      }
      return { filters: { ...state.filters, selectedPriorities: newSelectedPriorities } };
    },
    false,
    'togglePriority'
  ),
  
  clearSelectedPriorities: () => set(
    (state) => ({ filters: { ...state.filters, selectedPriorities: new Set() } }),
    false,
    'clearSelectedPriorities'
  ),
  
  setShowCompleted: (showCompleted) => set(
    (state) => ({ filters: { ...state.filters, showCompleted } }),
    false,
    'setShowCompleted'
  ),
  
  setShowOverdue: (showOverdue) => set(
    (state) => ({ filters: { ...state.filters, showOverdue } }),
    false,
    'setShowOverdue'
  ),
  
  setDateFilter: (dateFilter) => set(
    (state) => ({ filters: { ...state.filters, dateFilter } }),
    false,
    'setDateFilter'
  ),
  
  setSearchQuery: (searchQuery) => set(
    (state) => ({ filters: { ...state.filters, searchQuery } }),
    false,
    'setSearchQuery'
  ),
  
  clearAllFilters: () => set(
    (state) => ({ filters: initialFilters }),
    false,
    'clearAllFilters'
  ),
  
  // ============================================================================
  // ACCIONES PARA UI
  // ============================================================================
  
  setSelectedTasks: (selectedTasks) => set(
    (state) => ({ ui: { ...state.ui, selectedTasks } }),
    false,
    'setSelectedTasks'
  ),
  
  toggleTaskSelection: (taskId) => set(
    (state) => {
      const newSelectedTasks = new Set(state.ui.selectedTasks);
      if (newSelectedTasks.has(taskId)) {
        newSelectedTasks.delete(taskId);
      } else {
        newSelectedTasks.add(taskId);
      }
      return { ui: { ...state.ui, selectedTasks: newSelectedTasks } };
    },
    false,
    'toggleTaskSelection'
  ),
  
  selectAllTasks: () => set(
    (state) => {
      const filteredTasks = get().getFilteredTasks();
      const allTaskIds = new Set(filteredTasks.map(task => task.id));
      return { ui: { ...state.ui, selectedTasks: allTaskIds } };
    },
    false,
    'selectAllTasks'
  ),
  
  clearSelectedTasks: () => set(
    (state) => ({ ui: { ...state.ui, selectedTasks: new Set() } }),
    false,
    'clearSelectedTasks'
  ),
  
  setExpandedTasks: (expandedTasks) => set(
    (state) => ({ ui: { ...state.ui, expandedTasks } }),
    false,
    'setExpandedTasks'
  ),
  
  toggleTaskExpansion: (taskId) => set(
    (state) => {
      const newExpandedTasks = new Set(state.ui.expandedTasks);
      if (newExpandedTasks.has(taskId)) {
        newExpandedTasks.delete(taskId);
      } else {
        newExpandedTasks.add(taskId);
      }
      return { ui: { ...state.ui, expandedTasks: newExpandedTasks } };
    },
    false,
    'toggleTaskExpansion'
  ),
  
  setExpandedGroups: (expandedGroups) => set(
    (state) => ({ ui: { ...state.ui, expandedGroups } }),
    false,
    'setExpandedGroups'
  ),
  
  toggleGroupExpansion: (groupId) => set(
    (state) => {
      const newExpandedGroups = new Set(state.ui.expandedGroups);
      if (newExpandedGroups.has(groupId)) {
        newExpandedGroups.delete(groupId);
      } else {
        newExpandedGroups.add(groupId);
      }
      return { ui: { ...state.ui, expandedGroups: newExpandedGroups } };
    },
    false,
    'toggleGroupExpansion'
  ),
  
  setEditingTasks: (editingTasks) => set(
    (state) => ({ ui: { ...state.ui, editingTasks } }),
    false,
    'setEditingTasks'
  ),
  
  toggleTaskEditing: (taskId) => set(
    (state) => {
      const newEditingTasks = new Set(state.ui.editingTasks);
      if (newEditingTasks.has(taskId)) {
        newEditingTasks.delete(taskId);
      } else {
        newEditingTasks.add(taskId);
      }
      return { ui: { ...state.ui, editingTasks: newEditingTasks } };
    },
    false,
    'toggleTaskEditing'
  ),
  
  setEditingValues: (editingValues) => set(
    (state) => ({ ui: { ...state.ui, editingValues } }),
    false,
    'setEditingValues'
  ),
  
  updateEditingValue: (taskId, value) => set(
    (state) => ({
      ui: {
        ...state.ui,
        editingValues: { ...state.ui.editingValues, [taskId]: value }
      }
    }),
    false,
    'updateEditingValue'
  ),
  
  addEditingTask: (taskId) => set(
    (state) => {
      const newEditingTasks = new Set(state.ui.editingTasks);
      newEditingTasks.add(taskId);
      return { ui: { ...state.ui, editingTasks: newEditingTasks } };
    },
    false,
    'addEditingTask'
  ),
  
  removeEditingTask: (taskId) => set(
    (state) => {
      const newEditingTasks = new Set(state.ui.editingTasks);
      newEditingTasks.delete(taskId);
      return { ui: { ...state.ui, editingTasks: newEditingTasks } };
    },
    false,
    'removeEditingTask'
  ),
  
  setEditingValue: (taskId, value) => set(
    (state) => ({
      ui: {
        ...state.ui,
        editingValues: { ...state.ui.editingValues, [taskId]: value }
      }
    }),
    false,
    'setEditingValue'
  ),
  
  removeEditingValue: (taskId) => set(
    (state) => {
      const { [taskId]: removed, ...rest } = state.ui.editingValues;
      return { ui: { ...state.ui, editingValues: rest } };
    },
    false,
    'removeEditingValue'
  ),
  
  setInlineEditingTasks: (inlineEditingTasks) => set(
    (state) => ({ ui: { ...state.ui, inlineEditingTasks } }),
    false,
    'setInlineEditingTasks'
  ),
  
  toggleInlineEditing: (taskId) => set(
    (state) => {
      const newInlineEditingTasks = new Set(state.ui.inlineEditingTasks);
      if (newInlineEditingTasks.has(taskId)) {
        newInlineEditingTasks.delete(taskId);
      } else {
        newInlineEditingTasks.add(taskId);
      }
      return { ui: { ...state.ui, inlineEditingTasks: newInlineEditingTasks } };
    },
    false,
    'toggleInlineEditing'
  ),
  
  removeInlineEditingTask: (taskId) => set(
    (state) => {
      const newInlineEditingTasks = new Set(state.ui.inlineEditingTasks);
      newInlineEditingTasks.delete(taskId);
      return { ui: { ...state.ui, inlineEditingTasks: newInlineEditingTasks } };
    },
    false,
    'removeInlineEditingTask'
  ),
  
  setCreatingSubtasks: (creatingSubtasks) => set(
    (state) => ({ ui: { ...state.ui, creatingSubtasks } }),
    false,
    'setCreatingSubtasks'
  ),
  
  toggleSubtaskCreation: (taskId) => set(
    (state) => {
      const newCreatingSubtasks = new Set(state.ui.creatingSubtasks);
      if (newCreatingSubtasks.has(taskId)) {
        newCreatingSubtasks.delete(taskId);
      } else {
        newCreatingSubtasks.add(taskId);
      }
      return { ui: { ...state.ui, creatingSubtasks: newCreatingSubtasks } };
    },
    false,
    'toggleSubtaskCreation'
  ),
  
  addCreatingSubtask: (taskId) => set(
    (state) => {
      const newCreatingSubtasks = new Set(state.ui.creatingSubtasks);
      newCreatingSubtasks.add(taskId);
      return { ui: { ...state.ui, creatingSubtasks: newCreatingSubtasks } };
    },
    false,
    'addCreatingSubtask'
  ),
  
  removeCreatingSubtask: (taskId) => set(
    (state) => {
      const newCreatingSubtasks = new Set(state.ui.creatingSubtasks);
      newCreatingSubtasks.delete(taskId);
      return { ui: { ...state.ui, creatingSubtasks: newCreatingSubtasks } };
    },
    false,
    'removeCreatingSubtask'
  ),
  
  setCompletingTasks: (completingTasks) => set(
    (state) => ({ ui: { ...state.ui, completingTasks } }),
    false,
    'setCompletingTasks'
  ),
  
  toggleTaskCompletion: (taskId) => set(
    (state) => {
      const newCompletingTasks = new Set(state.ui.completingTasks);
      if (newCompletingTasks.has(taskId)) {
        newCompletingTasks.delete(taskId);
      } else {
        newCompletingTasks.add(taskId);
      }
      return { ui: { ...state.ui, completingTasks: newCompletingTasks } };
    },
    false,
    'toggleTaskCompletion'
  ),
  
  setAnimatingProgress: (animatingProgress) => set(
    (state) => ({ ui: { ...state.ui, animatingProgress } }),
    false,
    'setAnimatingProgress'
  ),
  
  toggleProgressAnimation: (taskId) => set(
    (state) => {
      const newAnimatingProgress = new Set(state.ui.animatingProgress);
      if (newAnimatingProgress.has(taskId)) {
        newAnimatingProgress.delete(taskId);
      } else {
        newAnimatingProgress.add(taskId);
      }
      return { ui: { ...state.ui, animatingProgress: newAnimatingProgress } };
    },
    false,
    'toggleProgressAnimation'
  ),
  
  setOpenMenus: (openMenus) => set(
    (state) => ({ ui: { ...state.ui, openMenus } }),
    false,
    'setOpenMenus'
  ),
  
  toggleMenu: (menuId) => set(
    (state) => {
      const newOpenMenus = new Set(state.ui.openMenus);
      if (newOpenMenus.has(menuId)) {
        newOpenMenus.delete(menuId);
      } else {
        newOpenMenus.add(menuId);
      }
      return { ui: { ...state.ui, openMenus: newOpenMenus } };
    },
    false,
    'toggleMenu'
  ),
  
  closeAllMenus: () => set(
    (state) => ({ ui: { ...state.ui, openMenus: new Set() } }),
    false,
    'closeAllMenus'
  ),
  
  setOpenMenu: (menuId) => set(
    (state) => ({ ui: { ...state.ui, openMenus: new Set([menuId]) } }),
    false,
    'setOpenMenu'
  ),
  
  addHoveredTask: (taskId) => set(
    (state) => {
      const newHoveredTasks = new Set(state.ui.hoveredTasks);
      newHoveredTasks.add(taskId);
      return { ui: { ...state.ui, hoveredTasks: newHoveredTasks } };
    },
    false,
    'addHoveredTask'
  ),
  
  clearHoveredTasks: () => set(
    (state) => ({ ui: { ...state.ui, hoveredTasks: new Set() } }),
    false,
    'clearHoveredTasks'
  ),
  
  addCompletingTask: (taskId) => set(
    (state) => {
      const newCompletingTasks = new Set(state.ui.completingTasks);
      newCompletingTasks.add(taskId);
      return { ui: { ...state.ui, completingTasks: newCompletingTasks } };
    },
    false,
    'addCompletingTask'
  ),
  
  removeCompletingTask: (taskId) => set(
    (state) => {
      const newCompletingTasks = new Set(state.ui.completingTasks);
      newCompletingTasks.delete(taskId);
      return { ui: { ...state.ui, completingTasks: newCompletingTasks } };
    },
    false,
    'removeCompletingTask'
  ),
  
  setVisibleHistory: (visibleHistory) => set(
    (state) => ({ ui: { ...state.ui, visibleHistory } }),
    false,
    'setVisibleHistory'
  ),
  
  toggleHistoryVisibility: (taskId) => set(
    (state) => {
      const newVisibleHistory = new Set(state.ui.visibleHistory);
      if (newVisibleHistory.has(taskId)) {
        newVisibleHistory.delete(taskId);
      } else {
        newVisibleHistory.add(taskId);
      }
      return { ui: { ...state.ui, visibleHistory: newVisibleHistory } };
    },
    false,
    'toggleHistoryVisibility'
  ),
  
  toggleVisibleHistory: (taskId) => set(
    (state) => {
      const newVisibleHistory = new Set(state.ui.visibleHistory);
      if (newVisibleHistory.has(taskId)) {
        newVisibleHistory.delete(taskId);
      } else {
        newVisibleHistory.add(taskId);
      }
      return { ui: { ...state.ui, visibleHistory: newVisibleHistory } };
    },
    false,
    'toggleVisibleHistory'
  ),
  
  setHoveredTasks: (hoveredTasks) => set(
    (state) => ({ ui: { ...state.ui, hoveredTasks } }),
    false,
    'setHoveredTasks'
  ),
  
  toggleTaskHover: (taskId) => set(
    (state) => {
      const newHoveredTasks = new Set(state.ui.hoveredTasks);
      if (newHoveredTasks.has(taskId)) {
        newHoveredTasks.delete(taskId);
      } else {
        newHoveredTasks.add(taskId);
      }
      return { ui: { ...state.ui, hoveredTasks: newHoveredTasks } };
    },
    false,
    'toggleTaskHover'
  ),
  
  setClickedTasks: (clickedTasks) => set(
    (state) => ({ ui: { ...state.ui, clickedTasks } }),
    false,
    'setClickedTasks'
  ),
  
  toggleTaskClick: (taskId) => set(
    (state) => {
      const newClickedTasks = new Set(state.ui.clickedTasks);
      if (newClickedTasks.has(taskId)) {
        newClickedTasks.delete(taskId);
      } else {
        newClickedTasks.add(taskId);
      }
      return { ui: { ...state.ui, clickedTasks: newClickedTasks } };
    },
    false,
    'toggleTaskClick'
  ),
  
  // ============================================================================
  // ACCIONES PARA MODO
  // ============================================================================
  
  setIsMultiSelectMode: (isMultiSelectMode) => set(
    { isMultiSelectMode },
    false,
    'setIsMultiSelectMode'
  ),
  
  toggleMultiSelectMode: () => set(
    (state) => ({ isMultiSelectMode: !state.isMultiSelectMode }),
    false,
    'toggleMultiSelectMode'
  ),
  
  setIsGroupedView: (isGroupedView) => set(
    { isGroupedView },
    false,
    'setIsGroupedView'
  ),
  
  toggleGroupedView: () => set(
    (state) => ({ isGroupedView: !state.isGroupedView }),
    false,
    'toggleGroupedView'
  ),
  
  // ============================================================================
  // UTILIDADES
  // ============================================================================
  
  resetUIState: () => set(
    (state) => ({ ui: initialUIState }),
    false,
    'resetUIState'
  ),
  
  getFilteredTasks: () => {
    const state = get();
    const { tasks, filters } = state;
    
    return tasks.filter(task => {
      // Filtro de completado
      if (!filters.showCompleted && task.completed) return false;
      
      // Filtro de vencido
      if (filters.showOverdue && task.dueDate && !isOverdue(task.dueDate, task.completed)) return false;
      
      // Filtro de tags
      if (filters.selectedTags.size > 0) {
        const taskTags = Array.isArray(task.tags) 
          ? task.tags.map(tag => typeof tag === 'string' ? tag : tag.tag.id)
          : [];
        const hasSelectedTag = taskTags.some(tagId => filters.selectedTags.has(tagId));
        if (!hasSelectedTag) return false;
      }
      
      // Filtro de grupos
      if (filters.selectedGroups.size > 0) {
        const taskGroupId = task.groupId || 'ungrouped';
        if (!filters.selectedGroups.has(taskGroupId)) return false;
      }
      
      // Filtro de prioridades
      if (filters.selectedPriorities.size > 0) {
        if (!filters.selectedPriorities.has(task.priority)) return false;
      }
      
      // Filtro de fecha
      if (!isInDateRange(task, filters.dateFilter)) return false;
      
      // Filtro de búsqueda
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDescription = task.description?.toLowerCase().includes(query) || false;
        if (!matchesTitle && !matchesDescription) return false;
      }
      
      return true;
    });
  }
}), {
  name: 'task-store'
}));

export default useTaskStore;
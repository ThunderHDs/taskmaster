import { create } from 'zustand';
import { Priority } from '../types';

interface FilterState {
  // Estado de filtros
  selectedTags: Set<string>;
  selectedGroups: Set<string>;
  selectedPriorities: Set<Priority>;
  showCompleted: boolean;
  showOverdue: boolean;
  dateFilter: 'all' | 'today' | 'week' | 'month';
  
  // Acciones
  toggleTagFilter: (tagId: string) => void;
  toggleGroupFilter: (groupId: string) => void;
  togglePriorityFilter: (priority: Priority) => void;
  setShowCompleted: (show: boolean) => void;
  setShowOverdue: (show: boolean) => void;
  setDateFilter: (filter: 'all' | 'today' | 'week' | 'month') => void;
  clearAllFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  // Estado inicial
  selectedTags: new Set<string>(),
  selectedGroups: new Set<string>(),
  selectedPriorities: new Set<Priority>(),
  showCompleted: true,
  showOverdue: false,
  dateFilter: 'all',
  
  // Acciones
  toggleTagFilter: (tagId: string) => set((state) => {
    const newSelectedTags = new Set(state.selectedTags);
    if (newSelectedTags.has(tagId)) {
      newSelectedTags.delete(tagId);
    } else {
      newSelectedTags.add(tagId);
    }
    return { selectedTags: newSelectedTags };
  }),
  
  toggleGroupFilter: (groupId: string) => set((state) => {
    const newSelectedGroups = new Set(state.selectedGroups);
    if (newSelectedGroups.has(groupId)) {
      newSelectedGroups.delete(groupId);
    } else {
      newSelectedGroups.add(groupId);
    }
    return { selectedGroups: newSelectedGroups };
  }),
  
  togglePriorityFilter: (priority: Priority) => set((state) => {
    const newSelectedPriorities = new Set(state.selectedPriorities);
    if (newSelectedPriorities.has(priority)) {
      newSelectedPriorities.delete(priority);
    } else {
      newSelectedPriorities.add(priority);
    }
    return { selectedPriorities: newSelectedPriorities };
  }),
  
  setShowCompleted: (show: boolean) => set({ showCompleted: show }),
  
  setShowOverdue: (show: boolean) => set({ showOverdue: show }),
  
  setDateFilter: (filter: 'all' | 'today' | 'week' | 'month') => set({ dateFilter: filter }),
  
  clearAllFilters: () => set({
    selectedTags: new Set<string>(),
    selectedGroups: new Set<string>(),
    selectedPriorities: new Set<Priority>(),
    showCompleted: true,
    showOverdue: false,
    dateFilter: 'all'
  })
}));
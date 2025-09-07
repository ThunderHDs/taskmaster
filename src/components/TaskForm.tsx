'use client';

import React, { useState, useEffect } from 'react';
import { X, Tag as TagIcon, AlertCircle, Users } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';

// TypeScript interfaces
interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TaskGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: string;
  dueDate?: string;
  parentId?: string;
  groupId?: string;
  createdAt: string;
  updatedAt: string;
  tags: { tag: Tag }[];
  subtasks: Task[];
  parent?: Task;
  group?: TaskGroup;
}

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: Partial<Task> & { tagIds: string[]; groupId?: string }) => void;
  task?: Task | null;
  parentTask?: Task | null;
  availableTags: Tag[];
  availableGroups: TaskGroup[];
  isLoading?: boolean;
}

const TaskForm: React.FC<TaskFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  parentTask,
  availableTags,
  availableGroups,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    startDate: null as Date | null,
    dueDate: null as Date | null,
    tagIds: [] as string[],
    groupId: '' as string
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Priority options
  const priorityOptions = [
    { value: 'LOW', label: 'Low', color: 'text-green-600' },
    { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-600' },
    { value: 'HIGH', label: 'High', color: 'text-orange-600' },
    { value: 'URGENT', label: 'Urgent', color: 'text-red-600' }
  ];

  // Initialize form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        startDate: task.startDate ? new Date(task.startDate) : null,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        tagIds: task.tags.map(t => t.tag.id),
        groupId: task.groupId || ''
      });
    } else if (isOpen && !task) {
      // Only reset non-date fields when opening form for new task
      setFormData(prev => ({
        ...prev,
        title: '',
        description: '',
        priority: 'MEDIUM',
        tagIds: [],
        groupId: ''
        // Preserve startDate and dueDate
      }));
    }
    setErrors({});
  }, [task, isOpen]);

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    } else if (formData.title.trim().length > 200) {
      newErrors.title = 'Task title must be less than 200 characters';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    // Validate date range
    if (formData.startDate && formData.dueDate) {
      if (formData.startDate > formData.dueDate) {
        newErrors.dateRange = 'Start date cannot be after end date';
      }
    }
    
    if (formData.startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (formData.startDate < today) {
        newErrors.dateRange = 'Start date cannot be in the past';
      }
    }
    
    if (formData.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (formData.dueDate < today) {
        newErrors.dateRange = 'End date cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Auto-assign current date as start date if only end date is provided
    let startDate = formData.startDate;
    if (!startDate && formData.dueDate) {
      startDate = new Date();
    }
    
    const submitData: Partial<Task> & { tagIds: string[]; groupId?: string } = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      priority: formData.priority,
      startDate: startDate instanceof Date ? startDate.toISOString().split('T')[0] : undefined,
      dueDate: formData.dueDate instanceof Date ? formData.dueDate.toISOString().split('T')[0] : undefined,
      tagIds: formData.tagIds,
      groupId: formData.groupId || undefined,
      parentId: parentTask?.id
    };

    if (task) {
      submitData.id = task.id;
    }

    onSubmit(submitData);
  };

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle tag selection
  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }));
  };

  // Handle close
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {task ? 'Edit Task' : parentTask ? 'Create Subtask' : 'Create Task'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Parent task info */}
        {parentTask && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center text-sm text-blue-800">
              <TagIcon className="w-4 h-4 mr-2" />
              <span>Subtask of: <strong>{parentTask.title}</strong></span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter task title..."
              disabled={isLoading}
            />
            {errors.title && (
              <div className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.title}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter task description..."
              disabled={isLoading}
            />
            {errors.description && (
              <div className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.description}
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Group */}
          {availableGroups.length > 0 && (
            <div>
              <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-1">
                Group
              </label>
              <select
                id="group"
                value={formData.groupId}
                onChange={(e) => handleInputChange('groupId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              >
                <option value="">No group</option>
                {availableGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              {formData.groupId && (
                <div className="mt-2 flex items-center text-sm text-gray-600">
                  <div
                    className="w-3 h-3 rounded-full mr-2 border border-gray-300"
                    style={{ backgroundColor: availableGroups.find(g => g.id === formData.groupId)?.color }}
                  />
                  <Users className="w-4 h-4 mr-1" />
                  <span>{availableGroups.find(g => g.id === formData.groupId)?.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <DateRangePicker
              startDate={formData.startDate}
              endDate={formData.dueDate}
              onDateChange={(start, end) => {
                setFormData({ ...formData, startDate: start, dueDate: end });
                if (errors.dateRange) {
                setErrors({ ...errors, dateRange: '' });
              }
            }}
          />
            {errors.dateRange && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.dateRange}
              </p>
            )}
          </div>

          {/* Tags */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    disabled={isLoading}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                      formData.tagIds.includes(tag.id)
                        ? 'text-white border-transparent'
                        : 'text-gray-700 border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                    style={{
                      backgroundColor: formData.tagIds.includes(tag.id) ? tag.color : undefined
                    }}
                  >
                    <TagIcon className="w-3 h-3 mr-1" />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
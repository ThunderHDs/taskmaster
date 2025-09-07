'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Users, AlertCircle, Palette } from 'lucide-react';

// TypeScript interfaces
interface TaskGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  _count?: {
    tasks: number;
  };
}

interface GroupManagerProps {
  isOpen: boolean;
  onClose: () => void;
  groups: TaskGroup[];
  onCreateGroup: (groupData: { name: string; description?: string; color: string }) => void;
  onUpdateGroup: (groupId: string, groupData: { name: string; description?: string; color: string }) => void;
  onDeleteGroup: (groupId: string) => void;
  isLoading?: boolean;
}

const GroupManager: React.FC<GroupManagerProps> = ({
  isOpen,
  onClose,
  groups,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  isLoading = false
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TaskGroup | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#3B82F6' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Predefined color palette
  const colorPalette = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#EC4899', // Pink
    '#6B7280', // Gray
    '#14B8A6', // Teal
    '#F43F5E'  // Rose
  ];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setShowForm(false);
      setEditingGroup(null);
      setFormData({ name: '', description: '', color: '#3B82F6' });
      setErrors({});
    }
  }, [isOpen]);

  // Initialize form for editing
  const startEdit = (group: TaskGroup) => {
    setEditingGroup(group);
    setFormData({ 
      name: group.name, 
      description: group.description || '', 
      color: group.color 
    });
    setShowForm(true);
    setErrors({});
  };

  // Start creating new group
  const startCreate = () => {
    setEditingGroup(null);
    setFormData({ name: '', description: '', color: '#3B82F6' });
    setShowForm(true);
    setErrors({});
  };

  // Cancel form
  const cancelForm = () => {
    setShowForm(false);
    setEditingGroup(null);
    setFormData({ name: '', description: '', color: '#3B82F6' });
    setErrors({});
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Group name must be less than 50 characters';
    } else {
      // Check for duplicate names (excluding current group if editing)
      const existingGroup = groups.find(group => 
        group.name.toLowerCase() === formData.name.trim().toLowerCase() && 
        group.id !== editingGroup?.id
      );
      if (existingGroup) {
        newErrors.name = 'A group with this name already exists';
      }
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Description must be less than 200 characters';
    }

    if (!formData.color || !/^#[0-9A-F]{6}$/i.test(formData.color)) {
      newErrors.color = 'Please select a valid color';
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

    const groupData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      color: formData.color
    };

    if (editingGroup) {
      onUpdateGroup(editingGroup.id, groupData);
    } else {
      onCreateGroup(groupData);
    }

    cancelForm();
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle delete with confirmation
  const handleDelete = (group: TaskGroup) => {
    const taskCount = group._count?.tasks || 0;
    const message = taskCount > 0 
      ? `Are you sure you want to delete "${group.name}"? This will remove the group from ${taskCount} task${taskCount === 1 ? '' : 's'}.`
      : `Are you sure you want to delete "${group.name}"?`;
    
    if (window.confirm(message)) {
      onDeleteGroup(group.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Manage Task Groups</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Create Button */}
          {!showForm && (
            <button
              onClick={startCreate}
              disabled={isLoading}
              className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Group</span>
            </button>
          )}

          {/* Form */}
          {showForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingGroup ? 'Edit Group' : 'Create New Group'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter group name"
                    maxLength={50}
                  />
                  {errors.name && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.name}
                    </div>
                  )}
                </div>

                {/* Description Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                      errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter group description"
                    rows={3}
                    maxLength={200}
                  />
                  {errors.description && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.description}
                    </div>
                  )}
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color *
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {colorPalette.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleInputChange('color', color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.color === color
                            ? 'border-gray-800 scale-110'
                            : 'border-gray-300 hover:border-gray-500'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    className="w-16 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                  {errors.color && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.color}
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex space-x-3 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                  >
                    {editingGroup ? 'Update Group' : 'Create Group'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Groups List */}
          <div className="space-y-3">
            {groups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No groups created yet</p>
                <p className="text-sm">Create your first group to organize your tasks</p>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: group.color }}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{group.name}</h4>
                      {group.description && (
                        <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                      )}
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <span>
                          {group._count?.tasks || 0} task{(group._count?.tasks || 0) === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => startEdit(group)}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                      title="Edit group"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(group)}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Delete group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupManager;
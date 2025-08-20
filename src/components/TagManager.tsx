'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Tag as TagIcon, AlertCircle, Palette } from 'lucide-react';

// TypeScript interfaces
interface Tag {
  id: string;
  name: string;
  color: string;
  _count?: {
    tasks: number;
  };
}

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
  onCreateTag: (tagData: { name: string; color: string }) => void;
  onUpdateTag: (tagId: string, tagData: { name: string; color: string }) => void;
  onDeleteTag: (tagId: string) => void;
  isLoading?: boolean;
}

const TagManager: React.FC<TagManagerProps> = ({
  isOpen,
  onClose,
  tags,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  isLoading = false
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#3B82F6' });
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
      setEditingTag(null);
      setFormData({ name: '', color: '#3B82F6' });
      setErrors({});
    }
  }, [isOpen]);

  // Initialize form for editing
  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, color: tag.color });
    setShowForm(true);
    setErrors({});
  };

  // Start creating new tag
  const startCreate = () => {
    setEditingTag(null);
    setFormData({ name: '', color: '#3B82F6' });
    setShowForm(true);
    setErrors({});
  };

  // Cancel form
  const cancelForm = () => {
    setShowForm(false);
    setEditingTag(null);
    setFormData({ name: '', color: '#3B82F6' });
    setErrors({});
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tag name is required';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Tag name must be less than 50 characters';
    } else {
      // Check for duplicate names (excluding current tag if editing)
      const existingTag = tags.find(tag => 
        tag.name.toLowerCase() === formData.name.trim().toLowerCase() && 
        tag.id !== editingTag?.id
      );
      if (existingTag) {
        newErrors.name = 'A tag with this name already exists';
      }
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

    const tagData = {
      name: formData.name.trim(),
      color: formData.color
    };

    if (editingTag) {
      onUpdateTag(editingTag.id, tagData);
    } else {
      onCreateTag(tagData);
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
  const handleDelete = (tag: Tag) => {
    const taskCount = tag._count?.tasks || 0;
    
    if (taskCount > 0) {
      alert(`Cannot delete "${tag.name}" because it is being used by ${taskCount} task(s). Remove the tag from all tasks first.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete the tag "${tag.name}"?`)) {
      onDeleteTag(tag.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Manage Tags</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col h-[calc(90vh-80px)]">
          {/* Create button */}
          {!showForm && (
            <div className="p-6 border-b border-gray-200">
              <button
                onClick={startCreate}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Tag
              </button>
            </div>
          )}

          {/* Form */}
          {showForm && (
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-md font-medium text-gray-900 mb-4">
                {editingTag ? 'Edit Tag' : 'Create New Tag'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="tagName" className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="tagName"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter tag name..."
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <div className="flex items-center mt-1 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.name}
                    </div>
                  )}
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color *
                  </label>
                  
                  {/* Color palette */}
                  <div className="grid grid-cols-6 gap-2 mb-3">
                    {colorPalette.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleInputChange('color', color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.color === color 
                            ? 'border-gray-900 scale-110' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                        disabled={isLoading}
                      />
                    ))}
                  </div>

                  {/* Custom color input */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => handleInputChange('color', e.target.value)}
                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer disabled:opacity-50"
                      disabled={isLoading}
                    />
                    <span className="text-sm text-gray-600">Custom color</span>
                  </div>
                  
                  {errors.color && (
                    <div className="flex items-center mt-1 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.color}
                    </div>
                  )}
                </div>

                {/* Preview */}
                {formData.name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preview
                    </label>
                    <div
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: formData.color }}
                    >
                      <TagIcon className="w-3 h-3 mr-1" />
                      {formData.name}
                    </div>
                  </div>
                )}

                {/* Form actions */}
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={cancelForm}
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
                    {isLoading ? 'Saving...' : editingTag ? 'Update Tag' : 'Create Tag'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tags list */}
          <div className="flex-1 overflow-y-auto p-6">
            {tags.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <TagIcon className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tags yet</h3>
                <p className="text-gray-500">
                  Create your first tag to organize your tasks better.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tags.map(tag => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: tag.color }}
                      />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{tag.name}</h4>
                        <p className="text-xs text-gray-500">
                          {tag._count?.tasks || 0} task(s)
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => startEdit(tag)}
                        disabled={isLoading}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                        title="Edit tag"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tag)}
                        disabled={isLoading || (tag._count?.tasks || 0) > 0}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={tag._count?.tasks ? `Cannot delete - used by ${tag._count.tasks} task(s)` : 'Delete tag'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TagManager;
'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Filter, Tag as TagIcon, Search, Settings, RefreshCw, Users } from 'lucide-react';
import Link from 'next/link';
import CalendarView from '@/components/CalendarView';
import TaskForm from '@/components/TaskForm';
import TagManager from '@/components/TagManager';
import GroupManager from '@/components/GroupManager';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { Task, Tag, TaskFilters } from '@/types/task';

interface TaskGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<TaskFilters>({
    priority: 'all',
    status: 'all',
    tags: [],
    dateRange: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isGroupedView, setIsGroupedView] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [tasksResponse, tagsResponse, groupsResponse] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/tags?includeTaskCount=true'),
          fetch('/api/groups')
        ]);
        
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          setTasks(tasksData);
        }
        
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          setTags(tagsData);
        }
        
        if (groupsResponse.ok) {
          const groupsData = await groupsResponse.json();
          setGroups(groupsData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update task' }));
        throw new Error(errorData.message || 'Failed to update task');
      }

      const updatedTask = await response.json();
      setTasks(prev => prev.map(task => 
        task.id === taskId ? updatedTask : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
      throw error; // Re-lanzar el error para que lo maneje el componente que llama
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setTasks(prev => prev.filter(task => task.id !== taskId));
        setShowDeleteModal(false);
        setTaskToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleTaskCreate = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      
      if (response.ok) {
        const newTask = await response.json();
        setTasks(prev => [...prev, newTask]);
        setShowTaskForm(false);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleTagUpdate = async () => {
    try {
      const response = await fetch('/api/tags?includeTaskCount=true');
      if (response.ok) {
        const tagsData = await response.json();
        setTags(tagsData);
      }
    } catch (error) {
      console.error('Error updating tags:', error);
    }
  };

  const handleGroupUpdate = async () => {
    try {
      const response = await fetch('/api/groups');
      if (response.ok) {
        const groupsData = await response.json();
        setGroups(groupsData);
      }
    } catch (error) {
      console.error('Error updating groups:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Tasks</span>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-2xl font-bold text-gray-900">Calendar View</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Group View Toggle */}
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-600" />
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGroupedView}
                    onChange={(e) => setIsGroupedView(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
              
              <button
                onClick={() => setShowTaskForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Task</span>
              </button>
              
              <button
                onClick={() => setShowTagManager(true)}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
              >
                <TagIcon className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => setShowGroupManager(true)}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
              >
                <Users className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CalendarView
          tasks={tasks}
          onTaskToggle={(taskId, completed) => {
            handleTaskUpdate(taskId, { completed });
          }}
          onTaskEdit={(task) => {
            setEditingTask(task);
            setShowTaskForm(true);
          }}
          availableTags={tags}
          availableGroups={groups}
          isGroupedView={isGroupedView}
          isLoading={isLoading}
        />
      </main>

      {/* Modals */}
      {showTaskForm && (
        <TaskForm
          tags={tags}
          groups={groups}
          onSubmit={handleTaskCreate}
          onCancel={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
          editingTask={editingTask}
        />
      )}

      {showTagManager && (
        <TagManager
          tags={tags}
          onClose={() => setShowTagManager(false)}
          onTagsUpdate={handleTagUpdate}
        />
      )}

      {showGroupManager && (
        <GroupManager
          groups={groups}
          onClose={() => setShowGroupManager(false)}
          onGroupsUpdate={handleGroupUpdate}
        />
      )}

      {showDeleteModal && taskToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setTaskToDelete(null);
          }}
          onConfirm={() => handleTaskDelete(taskToDelete)}
          taskTitle={tasks.find(t => t.id === taskToDelete)?.title || 'Unknown Task'}
        />
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Clock, MessageSquare, User, Edit, Plus, Check, X, Users, FileText } from 'lucide-react';
import { safeFormatDate } from '@/utils/dateUtils';

interface GroupActivityLog {
  id: string;
  action: string;
  details?: string;
  comment?: string;
  isUserComment: boolean;
  createdAt: string;
  taskId: string;
  taskTitle: string;
  isSubtask: boolean;
  isDirectGroupTask: boolean;
}

interface GroupHistoryResponse {
  groupId: string;
  groupName: string;
  totalTasks: number;
  activities: GroupActivityLog[];
}

interface GroupHistoryProps {
  groupId: string;
  groupName: string;
  isVisible: boolean;
  onClose: () => void;
}

const GroupHistory: React.FC<GroupHistoryProps> = ({ groupId, groupName, isVisible, onClose }) => {
  const [historyData, setHistoryData] = useState<GroupHistoryResponse | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Fetch group activity history
  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/groups/${groupId}/history`);
      if (response.ok) {
        const data = await response.json();
        setHistoryData(data);
      } else {
        console.error('Failed to fetch group history:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching group history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add new comment to group
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      return;
    }

    try {
      const response = await fetch(`/api/groups/${groupId}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'COMMENT',
          comment: newComment.trim(),
          details: `Comentario agregado al grupo "${groupName}"`,
          isUserComment: true,
        }),
      });

      if (response.ok) {
        setNewComment('');
        setIsAddingComment(false);
        fetchHistory(); // Refresh history
      } else {
        console.error('Failed to add group comment:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error adding group comment:', error);
    }
  };

  // Format action text for display
  const formatAction = (activity: GroupActivityLog) => {
    if (activity.isUserComment) {
      return 'Agregó un comentario al grupo';
    }

    const taskType = activity.isSubtask ? 'subtarea' : 'tarea';
    const taskReference = `${taskType} "${activity.taskTitle}"`;

    // Handle group-specific actions
    if (activity.action.startsWith('GROUP_')) {
      const baseAction = activity.action.replace('GROUP_', '').toLowerCase();
      switch (baseAction) {
        case 'comment':
          return 'Agregó un comentario al grupo';
        case 'updated':
          return `Actualizó el grupo "${groupName}"`;
        case 'created':
          return `Creó el grupo "${groupName}"`;
        default:
          return `Realizó acción en el grupo: ${baseAction}`;
      }
    }

    // Handle task-specific actions within the group
    switch (activity.action.toLowerCase()) {
      case 'created':
        return `Creó la ${taskReference}`;
      case 'updated':
        return `Actualizó la ${taskReference}`;
      case 'completed':
        return `Marcó como completada la ${taskReference}`;
      case 'uncompleted':
        return `Marcó como pendiente la ${taskReference}`;
      case 'subtask_added':
        return `Agregó la subtarea "${activity.taskTitle}"`;
      case 'subtask_updated':
        return `Actualizó la subtarea "${activity.taskTitle}"`;
      case 'subtask_completed':
        return `Completó la subtarea "${activity.taskTitle}"`;
      case 'priority_changed':
        return `Cambió la prioridad de la ${taskReference}`;
      case 'due_date_changed':
        return `Cambió la fecha de vencimiento de la ${taskReference}`;
      case 'tags_updated':
        return `Actualizó las etiquetas de la ${taskReference}`;
      default:
        return `${activity.action} - ${taskReference}`;
    }
  };

  // Get icon for activity type
  const getActivityIcon = (activity: GroupActivityLog) => {
    if (activity.isUserComment) {
      return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }

    if (activity.action.startsWith('GROUP_')) {
      return <Users className="w-4 h-4 text-purple-500" />;
    }

    switch (activity.action.toLowerCase()) {
      case 'created':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'updated':
        return <Edit className="w-4 h-4 text-yellow-500" />;
      case 'completed':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'uncompleted':
        return <X className="w-4 h-4 text-red-500" />;
      case 'subtask_added':
      case 'subtask_updated':
      case 'subtask_completed':
        return <FileText className="w-4 h-4 text-indigo-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get background color for activity type
  const getActivityBackground = (activity: GroupActivityLog) => {
    if (activity.isUserComment) {
      return 'bg-blue-50 border-blue-200';
    }

    if (activity.action.startsWith('GROUP_')) {
      return 'bg-purple-50 border-purple-200';
    }

    if (activity.isSubtask) {
      return 'bg-indigo-50 border-indigo-200';
    }

    return 'bg-white border-gray-200 hover:border-gray-300';
  };

  useEffect(() => {
    if (isVisible) {
      fetchHistory();
    }
  }, [isVisible, groupId]);

  if (!isVisible) return null;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Historial del Grupo: {groupName}
          </h3>
          {historyData && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
              {historyData.totalTasks} tareas
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Activity List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            Cargando historial del grupo...
          </div>
        ) : !historyData || historyData.activities.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            No hay actividad registrada para este grupo
          </div>
        ) : (
          historyData.activities.map((activity) => (
            <div key={activity.id} className={`flex gap-3 p-4 rounded-lg border transition-all duration-200 hover:shadow-sm ${
              getActivityBackground(activity)
            }`}>
              <div className="flex-shrink-0 mt-1">
                <div className={`p-2 rounded-full ${
                  activity.isUserComment 
                    ? 'bg-blue-100 dark:bg-blue-900' 
                    : activity.action.startsWith('GROUP_')
                    ? 'bg-purple-100 dark:bg-purple-900'
                    : activity.isSubtask
                    ? 'bg-indigo-100 dark:bg-indigo-900'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {getActivityIcon(activity)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <User className="w-3 h-3 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatAction(activity)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {safeFormatDate(activity.createdAt)}
                  </span>
                </div>
                {activity.comment && (
                  <div className="mt-2 p-3 bg-white dark:bg-gray-700 rounded-lg border border-blue-200 dark:border-blue-700 shadow-sm">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                      {activity.comment}
                    </p>
                  </div>
                )}
                {activity.details && !activity.isUserComment && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded border-l-2 border-gray-300 dark:border-gray-600">
                    {activity.details}
                  </p>
                )}
                {/* Task reference for non-group actions */}
                {!activity.action.startsWith('GROUP_') && !activity.isUserComment && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <FileText className="w-3 h-3" />
                    <span>
                      {activity.isSubtask ? 'Subtarea' : 'Tarea'}: {activity.taskTitle}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Section */}
      <div className="border-t dark:border-gray-700 pt-4">
        {!isAddingComment ? (
          <button
            onClick={() => setIsAddingComment(true)}
            className="flex items-center gap-2 w-full p-3 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 bg-gray-50 dark:bg-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 group"
          >
            <MessageSquare className="w-4 h-4 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
            <span className="flex-1 text-left">Agregar comentario al grupo...</span>
            <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={`Comparte tus pensamientos sobre el grupo "${groupName}"...`}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 min-h-[80px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                rows={3}
                autoFocus
                maxLength={500}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-500">
                {newComment.length}/500
              </div>
            </div>
            <div className="flex gap-2 justify-between items-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                💡 Tip: Documenta decisiones importantes del grupo
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsAddingComment(false);
                    setNewComment('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Comentar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupHistory;
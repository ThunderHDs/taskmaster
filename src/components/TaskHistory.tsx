import React, { useState, useEffect } from 'react';
import { Clock, MessageSquare, User, Edit, Plus, Check, X } from 'lucide-react';
import { logger } from '@/lib/logger';

interface ActivityLog {
  id: string;
  action: string;
  details?: string;
  comment?: string;
  isUserComment: boolean;
  createdAt: string;
  isSubtask?: boolean;
  subtaskTitle?: string;
}

interface TaskHistoryProps {
  taskId: string;
  isVisible: boolean;
  onClose: () => void;
}

const TaskHistory: React.FC<TaskHistoryProps> = ({ taskId, isVisible, onClose }) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Fetch activity history
  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const url = `/api/tasks/${taskId}/history`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      } else {
        logger.error('Failed to fetch task history:', response.status, response.statusText);
      }
    } catch (error) {
      logger.error('Error fetching task history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add new comment
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'comment',
          comment: newComment.trim(),
          isUserComment: true,
        }),
      });

      if (response.ok) {
        setNewComment('');
        setIsAddingComment(false);
        fetchHistory(); // Refresh history
      } else {
        logger.error('Failed to add comment:', response.status, response.statusText);
      }
    } catch (error) {
      logger.error('Error adding comment:', error);
    }
  };

  // Format action text for display
  const formatAction = (activity: ActivityLog) => {
    if (activity.isUserComment) {
      return 'Agregó un comentario';
    }

    switch (activity.action.toLowerCase()) {
      case 'created':
        return 'Creó la tarea';
      case 'updated':
        return 'Actualizó la tarea';
      case 'completed':
        return 'Marcó como completada';
      case 'uncompleted':
        return 'Marcó como pendiente';
      case 'subtask_added':
        return 'Agregó una subtarea';
      case 'subtask_updated':
        return 'Actualizó una subtarea';
      case 'subtask_completed':
        return 'Completó una subtarea';
      case 'priority_changed':
        return 'Cambió la prioridad';
      case 'due_date_changed':
        return 'Cambió la fecha de vencimiento';
      case 'tags_updated':
        return 'Actualizó las etiquetas';
      default:
        return activity.action;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Hace unos minutos';
    } else if (diffInHours < 24) {
      return `Hace ${Math.floor(diffInHours)} horas`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  // Get icon for activity type
  const getActivityIcon = (activity: ActivityLog) => {
    if (activity.isUserComment) {
      return <MessageSquare className="w-4 h-4 text-blue-500" />;
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
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  useEffect(() => {
    console.log('🔄 TaskHistory useEffect triggered:');
    console.log('   isVisible:', isVisible);
    console.log('   taskId:', taskId);
    console.log('   typeof taskId:', typeof taskId);
    
    if (isVisible) {
      console.log('✅ TaskHistory - Calling fetchHistory because isVisible is true');
      fetchHistory();
    } else {
      console.log('⏸️ TaskHistory - Skipping fetchHistory because isVisible is false');
    }
  }, [isVisible, taskId]);

  if (!isVisible) return null;

  return (
    <div className="bg-gray-50 border-t border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Historial de Actividad
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Activity List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">
            Cargando historial...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No hay actividad registrada
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className={`flex gap-3 p-4 rounded-lg border transition-all duration-200 hover:shadow-sm ${
              activity.isUserComment 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}>
              <div className="flex-shrink-0 mt-1">
                <div className={`p-2 rounded-full ${
                  activity.isUserComment 
                    ? 'bg-blue-100' 
                    : 'bg-gray-100'
                }`}>
                  {getActivityIcon(activity)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <User className="w-3 h-3 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {formatAction(activity)}
                  </span>
                  <span className="text-gray-500 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                    {formatDate(activity.createdAt)}
                  </span>
                </div>
                {activity.comment && (
                  <div className="mt-2 p-3 bg-white rounded-lg border border-blue-200 shadow-sm">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      {activity.comment}
                    </p>
                  </div>
                )}
                {activity.details && !activity.isUserComment && (
                  <p className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border-l-2 border-gray-300">
                    {activity.details}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Section */}
      <div className="border-t pt-4" data-comment-section>
        {!isAddingComment ? (
          <button
            onClick={() => setIsAddingComment(true)}
            className="flex items-center gap-2 w-full p-3 text-sm text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 group"
            data-comment-button
          >
            <MessageSquare className="w-4 h-4 group-hover:text-blue-600" />
            <span className="flex-1 text-left">Escribe un comentario...</span>
            <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <div className="space-y-3" data-comment-form>
            <div className="relative">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Comparte tus pensamientos sobre esta tarea..."
                className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 min-h-[80px]"
                rows={3}
                autoFocus
                maxLength={500}
                data-comment-textarea
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {newComment.length}/500
              </div>
            </div>
            <div className="flex gap-2 justify-between items-center">
              <div className="text-xs text-gray-500">
                💡 Tip: Usa comentarios para documentar decisiones importantes
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsAddingComment(false);
                    setNewComment('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                  data-comment-cancel
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                  data-comment-submit
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

export default TaskHistory;
export { TaskHistory };
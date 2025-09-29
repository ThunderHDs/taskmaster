import React, { useEffect, useState } from 'react';
import { Undo2, X } from 'lucide-react';

interface UndoToastProps {
  isVisible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number; // en milisegundos, default 5000
}

const UndoToast: React.FC<UndoToastProps> = ({
  isVisible,
  message,
  onUndo,
  onDismiss,
  duration = 5000
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setTimeLeft(duration);
      setIsAnimating(true);
      
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 100) {
            clearInterval(interval);
            // Usar setTimeout para diferir la llamada onDismiss y evitar setState durante renderizado
            setTimeout(() => {
              onDismiss();
            }, 0);
            return 0;
          }
          return prev - 100;
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setIsAnimating(false);
    }
  }, [isVisible, duration, onDismiss]);

  const handleUndo = () => {
    onUndo();
    onDismiss();
  };

  const progressPercentage = (timeLeft / duration) * 100;

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 transform ${
      isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
    }`}>
      <div className="bg-gray-800 text-white rounded-lg shadow-lg p-4 min-w-[320px] max-w-[400px]">
        {/* Barra de progreso */}
        <div className="absolute top-0 left-0 h-1 bg-blue-500 rounded-t-lg transition-all duration-100 ease-linear"
             style={{ width: `${progressPercentage}%` }}>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{message}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handleUndo}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              <Undo2 className="w-3 h-3 mr-1" />
              Deshacer
            </button>
            
            <button
              onClick={onDismiss}
              className="p-1 text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Contador visual */}
        <div className="mt-2 text-xs text-gray-300">
          Se deshará automáticamente en {Math.ceil(timeLeft / 1000)}s
        </div>
      </div>
    </div>
  );
};

export default UndoToast;
import React from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import type { ToastType } from '../../types';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
};

const borderColors: Record<ToastType, string> = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  warning: 'border-l-yellow-500',
  info: 'border-l-blue-500',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-start gap-3 p-4
            bg-surface-800 border border-surface-700/50 border-l-4 ${borderColors[toast.type]}
            rounded-lg shadow-2xl animate-slide-up
          `}
        >
          <span className="flex-shrink-0 mt-0.5">{icons[toast.type]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200">{toast.title}</p>
            {toast.message && (
              <p className="text-xs text-gray-400 mt-0.5">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 p-0.5 rounded hover:bg-surface-700 text-gray-500 hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

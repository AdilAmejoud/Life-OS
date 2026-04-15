import React, { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return { toasts, showToast };
}

export default function Toast({ toasts }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`px-4 py-3 rounded-[8px] shadow-lg bg-bg-card text-text-primary text-[13px] border-l-[3px] ${
            toast.type === 'error' ? 'border-error' : 'border-accent'
          } animate-fade-in`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

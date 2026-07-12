import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);
let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'success') => {
    const id = ++idCounter;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl backdrop-blur-xl border shadow-glass text-sm font-medium min-w-[240px] ${
              t.type === 'error'
                ? 'bg-clay/15 border-clay/30 text-clay'
                : 'bg-mint-400/15 border-mint-400/25 text-mint-400'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export function apiErrorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || fallback;
}
import React, { useState, useEffect } from 'react';

// Simple singleton-like pattern for triggering Toasts
let toastTimer;
let setToastFn;

export const showToast = (message, type = 'info') => {
  if (setToastFn) {
    setToastFn({ message, type, visible: true });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      setToastFn(prev => ({ ...prev, visible: false }));
    }, 3000);
  }
};

const Toast = () => {
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

  useEffect(() => {
    setToastFn = setToast;
    return () => { setToastFn = null; };
  }, []);

  if (!toast.visible) return null;

  const getStyle = () => {
    switch (toast.type) {
      case 'error': return { borderLeft: '4px solid #FF3B3B' };
      case 'success': return { borderLeft: '4px solid #00E676' };
      default: return { borderLeft: '4px solid #FFEA00' };
    }
  };

  return (
    <div className="toast-notification" style={getStyle()}>
      <div className="toast-message">{toast.message}</div>
    </div>
  );
};

export default Toast;

import React, { useEffect } from 'react';
import './Notification.css';

export default function Notification({ 
  isVisible, 
  message, 
  onUndo, 
  onClose,
  duration = 5000 
}) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="notification">
      <span className="notification-message">{message}</span>
      <button 
        className="notification-button undo-button"
        onClick={onUndo}
      >
        Undo
      </button>
      <button 
        className="notification-button close-button"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
}
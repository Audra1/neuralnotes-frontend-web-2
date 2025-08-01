import { useRef, useEffect } from 'react';
import './ContextMenu.css';

export default function ContextMenu({ 
  isOpen, 
  onClose, 
  onDelete, 
  onComplete, 
  onInbox,
  onReschedule,
  onMultipleDelete,
  onPin,
  onUnpin,
  position, 
  showComplete = false, 
  isCompleted = false,
  hasDeadline = false,
  isPinned = false
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={menuRef}
      className="context-menu"
      style={{
        top: position.y,
        left: position.x,
      }}
    >
      {hasDeadline && (
        <>
          <button 
            className="context-menu-item inbox-item"
            onClick={onInbox}
          >
            📥 Move to Inbox
          </button>
          <button 
            className="context-menu-item reschedule-item"
            onClick={onReschedule}
          >
            📅 Reschedule
          </button>
        </>
      )}
      
      {/* Pin/Unpin option */}
      <button 
        className="context-menu-item pin-item"
        onClick={isPinned ? onUnpin : onPin}
      >
        {isPinned ? '📌 Unpin Note' : '📌 Pin Note'}
      </button>
      
      {showComplete && (
        <button 
          className="context-menu-item complete-item"
          onClick={onComplete}
        >
          {isCompleted ? '↶ Mark Incomplete' : '✓ Mark Complete'}
        </button>
      )}
      <button 
        className="context-menu-item delete-item"
        onClick={onDelete}
      >
        🗑️ Delete
      </button>
      <button 
        className="context-menu-item multiple-delete-item"
        onClick={onMultipleDelete}
      >
        🗑️ Delete Multiple
      </button>
    </div>
  );
}
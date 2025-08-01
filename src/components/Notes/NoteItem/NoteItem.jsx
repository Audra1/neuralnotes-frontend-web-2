import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ContextMenu from './ContextMenu/ContextMenu';
import defaultNoteStar from '../../../assets/defaultnotestar.png';
import './NoteItem.css';
// Static import for quick notes styling - no loading delay
import '../../QuickNotePage/QuickNotesList/QuickNoteItem.css';

// Configuration for responsive child preview character limits
const CHILD_PREVIEW_CONFIG = {
  // Maximum characters at full width (1200px+)
  MAX_CHARS: 90,
  // Minimum characters at mobile width (320px)
  MIN_CHARS: 20,
  // Window width breakpoints and their character limits
  BREAKPOINTS: {
    1200: 90,  // Desktop/full width
    992: 70,   // Large tablet
    768: 50,   // Tablet
    576: 35,   // Small tablet
    320: 20    // Mobile
  }
};

export default function NoteItem({ 
  note, 
  onUpdateStatus, 
  onDeleteNote, 
  onTitleClick, 
  neuralFileName, 
  isFirstNote = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDragging = false,
  dragIndex,
  itemIndex,
  isTodayList = false,
  onTimeUpdate,
  priorityNumber = null,
  showPriorityLine = false,
  isFirstPriorityItem = false,
  isLastPriorityItem = false,
  isInNeuralFileContext = false,
  onRefresh,
  // New props for multiple delete
  isMultipleDeleteMode = false,
  isSelected = false,
  onToggleSelection,
  onStartMultipleDelete,
  // New props for pin functionality
  isPinned = false,
  onPinDrop = null,
  dragOverZone = null, // 'pin-above' | 'pin-below' | 'parent' | null
  // New prop for quick notes context
  isQuickNotesContext = false,
  // New prop for table of contents mode
  isTableOfContentsMode = false
}) {
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [timeInput, setTimeInput] = useState('');
  const [childrenStatus, setChildrenStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: { x: 0, y: 0 } });
  const [subnotesCount, setSubnotesCount] = useState({ total: 0, completed: 0 });
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [parentInfo, setParentInfo] = useState(null);
  const [childrenPreview, setChildrenPreview] = useState([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragZone, setDragZone] = useState(null); // Track which zone is being dragged over

  // Handle window resize for responsive character limits
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Calculate character limit for child preview based on window width
   * Uses linear interpolation between breakpoints for smooth scaling
   * @param {number} width - Current window width
   * @returns {number} - Character limit for child preview
   */
  const getChildPreviewCharLimit = (width) => {
    const breakpoints = Object.keys(CHILD_PREVIEW_CONFIG.BREAKPOINTS)
      .map(Number)
      .sort((a, b) => b - a); // Sort descending

    // If width is larger than max breakpoint, use max chars
    if (width >= breakpoints[0]) {
      return CHILD_PREVIEW_CONFIG.MAX_CHARS;
    }

    // If width is smaller than min breakpoint, use min chars
    if (width <= breakpoints[breakpoints.length - 1]) {
      return CHILD_PREVIEW_CONFIG.MIN_CHARS;
    }

    // Find the two breakpoints to interpolate between
    for (let i = 0; i < breakpoints.length - 1; i++) {
      const upperBreakpoint = breakpoints[i];
      const lowerBreakpoint = breakpoints[i + 1];

      if (width <= upperBreakpoint && width >= lowerBreakpoint) {
        const upperChars = CHILD_PREVIEW_CONFIG.BREAKPOINTS[upperBreakpoint];
        const lowerChars = CHILD_PREVIEW_CONFIG.BREAKPOINTS[lowerBreakpoint];
        
        // Linear interpolation
        const ratio = (width - lowerBreakpoint) / (upperBreakpoint - lowerBreakpoint);
        return Math.round(lowerChars + (upperChars - lowerChars) * ratio);
      }
    }

    return CHILD_PREVIEW_CONFIG.MIN_CHARS;
  };

  // Load children status
  const loadChildrenStatus = async () => {
    try {
      // Quick notes CAN have children, so don't skip loading for them
      const response = await axios.get(`http://localhost:8001/api/notes/${note.id}/children-count`);
      setChildrenStatus(response.data);
    } catch (error) {
      console.error('Error loading children status:', error);
      setChildrenStatus({
        has_children: false,
        children_count: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Load children preview for display
  const loadChildrenPreview = async () => {
    try {
      // Quick notes CAN have children, so load them normally
      const response = await axios.get(`http://localhost:8001/api/notes/children/${note.id}`);
      const children = response.data;
      // Only show first 2-3 children for preview
      setChildrenPreview(children.slice(0, 3));
    } catch (error) {
      console.error('Error loading children preview:', error);
      setChildrenPreview([]);
    }
  };

  useEffect(() => {
    loadChildrenStatus();
    loadChildrenPreview();
  }, [note.id]);

  // Load subnotes count for neural file context
  useEffect(() => {
    if (isInNeuralFileContext) {
      const loadSubnotesCount = async () => {
        try {
          const response = await axios.get(`http://localhost:8001/api/notes/children/${note.id}`);
          const children = response.data;
          const total = children.length;
          setSubnotesCount({ total, completed: 0 });
        } catch (error) {
          console.error('Error loading subnotes count:', error);
          setSubnotesCount({ total: 0, completed: 0 });
        }
      };

      loadSubnotesCount();
    }
  }, [note.id, isInNeuralFileContext]);

  // Load parent information for child notes
  useEffect(() => {
    if (note.parent_id && !isInNeuralFileContext) {
      const loadParentInfo = async () => {
        try {
          const response = await axios.get(`http://localhost:8001/api/notes/id/${note.parent_id}`);
          setParentInfo(response.data);
        } catch (error) {
          console.error('Error loading parent info:', error);
        }
      };
      
      loadParentInfo();
    }
  }, [note.parent_id, isInNeuralFileContext]);

  const handleMenuClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      isOpen: true,
      position: {
        x: rect.left,
        y: rect.bottom + 5
      }
    });
  };

  const handleDelete = () => {
    handleCloseMenu();
    onDeleteNote(note.id);
  };

  const handleMultipleDelete = () => {
    handleCloseMenu();
    if (onStartMultipleDelete) {
      onStartMultipleDelete(note.id);
    }
  };

  const handlePin = async () => {
    handleCloseMenu();
    try {
      const pinContext = note.parent_id ? 'parent' : 'file';
      await axios.post(`http://localhost:8001/api/notes/${note.id}/pin`, {
        position: 0, // Pin at top
        context: pinContext
      });
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error pinning note:', error);
      alert('Failed to pin note. Please try again.');
    }
  };

  const handleUnpin = async () => {
    handleCloseMenu();
    try {
      await axios.post(`http://localhost:8001/api/notes/${note.id}/unpin`);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error unpinning note:', error);
      alert('Failed to unpin note. Please try again.');
    }
  };

  const handleTitleClick = () => {
    console.log('NoteItem clicked:', note.id, 'isInNeuralFileContext:', isInNeuralFileContext);
    if (onTitleClick) {
      onTitleClick(note.id);
    }
  };

  const handleCloseMenu = () => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
  };

  const handleNoteClick = () => {
    if (isMultipleDeleteMode && onToggleSelection) {
      onToggleSelection(note.id);
    } else {
      handleTitleClick();
    }
  };

  // Handle scheduling from calendar button
  const handleScheduleClick = (e) => {
    e.stopPropagation();
    setIsScheduleModalOpen(true);
  };

  const handleSchedule = async (deadline) => {
    try {
      await axios.put(`http://localhost:8001/api/notes/${note.id}`, {
        deadline: deadline
      });
      
      setIsScheduleModalOpen(false);
      
      if (onRefresh) {
        onRefresh();
      }
      
    } catch (error) {
      console.error('Error scheduling note:', error);
      alert('Failed to schedule note. Please try again.');
      setIsScheduleModalOpen(false);
    }
  };

  // Format deadline for display in neural file context
  const formatDeadlineDisplay = () => {
    if (!note.deadline) return null;
    
    try {
      const parts = note.deadline.split(' ');
      if (parts.length !== 2) return null;
      
      const datePart = parts[1];
      const [day, month, year] = datePart.split('/');
      const currentYear = new Date().getFullYear();
      
      if (parseInt(year) === currentYear) {
        return `${day}/${month}`;
      } else {
        return `${day}/${month}/${year.slice(-2)}`;
      }
    } catch (error) {
      return null;
    }
  };

  // Get the subtitle text based on context
  const getSubtitleText = () => {
    // Hide subtitle in table of contents mode
    if (isTableOfContentsMode) {
      return null;
    }
    
    if (isInNeuralFileContext) {
      // In neural file context, show description or subnotes count
      if (note.description && note.description.trim()) {
        return note.description;
      }
      return null;
    } else {
      // In Today/Home context, show neural file name and description
      let subtitle = neuralFileName || "Personal";
      
      if (note.description && note.description.trim()) {
        subtitle += ` • ${note.description}`;
      }
      
      // If this is a child note, add parent breadcrumb
      if (note.parent_id && parentInfo) {
        subtitle = `${parentInfo.title} > ${subtitle}`;
      }
      
      return subtitle;
    }
  };

  /**
   * Truncate child title based on current window width
   * @param {string} title - The child note title
   * @returns {string} - Truncated title with ellipsis if needed
   */
  const truncateChildTitle = (title) => {
    const charLimit = getChildPreviewCharLimit(windowWidth);
    if (title.length > charLimit) {
      return `${title.substring(0, charLimit)}...`;
    }
    return title;
  };

  const showTime = isTodayList && !isFirstNote;
  const subtitleText = getSubtitleText();
  const formattedDeadline = formatDeadlineDisplay();

  if (loading) {
    return (
      <div className={`note-item-container ${isQuickNotesContext ? 'quick-note-context' : ''} ${showTime ? 'with-time' : ''} ${showPriorityLine ? 'with-priority' : ''}`}>
        {showPriorityLine && (
          <div className="priority-indicator">
            <div 
              className={`priority-line-segment ${isFirstPriorityItem ? 'first-item' : ''} ${isLastPriorityItem ? 'last-item' : ''}`}
            ></div>
            <div className="priority-circle">
              <span className="priority-number">{priorityNumber}</span>
            </div>
          </div>
        )}
        {showTime && <div className="time-display">--:--</div>}
        <div className="note-item">
          <div className="note-icon">
            <img src={defaultNoteStar} alt="*" className="note-icon-star" />
          </div>
          <div className="note-content">
            <span className="note-title">{note.title}</span>
            {subtitleText && (
              <span className="note-description">{subtitleText}</span>
            )}
          </div>
          <button className="menu-button">...</button>
        </div>
      </div>
    );
  }

  const handleDragOver = (e) => {
    e.preventDefault();
    
    if (onDragOver && !isDragging) { // Only handle if this item is not being dragged
      // Only handle parent drops now - pin drops are handled by separate divs
      const zone = 'parent';
      setDragZone(zone);
      setIsDragOver(true);
      onDragOver(e, zone);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    // Only clear state if we're leaving the note area and not entering a child element
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
      setDragZone(null);
      
      // Also notify parent to clear its drag over state
      if (onDragLeave) {
        onDragLeave(e);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const currentZone = dragZone;
    setDragZone(null);
    
    if (onDrop) {
      onDrop(e, currentZone);
    }
  };

  const handleDragStart = (e) => {
    if (onDragStart) {
      onDragStart(e);
    }
    
    // Set note data for breadcrumb drop
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: note.id,
      title: note.title,
      parent_id: note.parent_id
    }));
  };

  return (
    <>
      <div className={`note-item-container ${isQuickNotesContext ? 'quick-note-context' : ''} ${showTime ? 'with-time' : ''} ${showPriorityLine ? 'with-priority' : ''}`}>
        {/* Remove pin drop zone indicators - they're now separate divs */}
        
        {showPriorityLine && (
          <div className="priority-indicator">
            <div 
              className={`priority-line-segment ${isFirstPriorityItem ? 'first-item' : ''} ${isLastPriorityItem ? 'last-item' : ''}`}
            ></div>
            <div className="priority-circle">
              <span className="priority-number">{priorityNumber}</span>
            </div>
          </div>
        )}
        
        <div 
          className={`note-item ${isQuickNotesContext ? 'quick-note-item' : ''} ${isFirstNote ? 'first-note' : ''} ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected-for-delete' : ''} ${dragOverZone === 'parent' ? 'parent-drop' : ''} ${isTableOfContentsMode ? 'table-of-contents-mode' : ''}`}
          draggable={!isMultipleDeleteMode}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragEnd={onDragEnd}
          onClick={isMultipleDeleteMode ? handleNoteClick : undefined}
          style={{ 
            backgroundColor: isQuickNotesContext ? 'rgba(45, 45, 45, 0.4)' : undefined,
            cursor: isMultipleDeleteMode ? 'pointer' : 'move' 
          }}
        >
          <div className="note-icon">
            <img src={defaultNoteStar} alt="*" className="note-icon-star" />
          </div>
          
          <div className="note-content">
            <span 
              className={`note-title clickable-title ${isTableOfContentsMode ? 'table-of-contents-title' : ''}`}
              onClick={!isMultipleDeleteMode ? handleTitleClick : undefined}
            >
              {note.title}
            </span>
            
            {subtitleText && (
              <span className="note-description">
                {subtitleText}
              </span>
            )}

            {/* Children Preview - Hide in table of contents mode */}
            {!isTableOfContentsMode && childrenPreview.length > 0 && (
              <div className="children-preview">
                {childrenPreview.map((child, index) => (
                  <div key={child.id} className="child-preview-item">
                    <img src={defaultNoteStar} alt="*" className="child-preview-star" />
                    <span className="child-preview-title">
                      {truncateChildTitle(child.title)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Pin indicator for pinned notes */}
          {isPinned && (
            <div className="pin-indicator">
              📌
            </div>
          )}
          
          {!isMultipleDeleteMode && (
            <button 
              onClick={handleMenuClick}
              className="menu-button"
            >
              ...
            </button>
          )}
        </div>
      </div>

      <ContextMenu
        isOpen={contextMenu.isOpen}
        onClose={handleCloseMenu}
        onDelete={handleDelete}
        onMultipleDelete={handleMultipleDelete}
        onPin={handlePin}
        onUnpin={handleUnpin}
        position={contextMenu.position}
        isPinned={isPinned}
      />
    </>
  );
}
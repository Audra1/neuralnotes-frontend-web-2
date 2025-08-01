import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Breadcrumb.css';

export default function Breadcrumb({ neuralFile, notePath = [], isQuickNotesContext = false, selectedDate = null, onNoteDrop }) {
  const navigate = useNavigate();
  const { neuralFileId } = useParams();
  const [dragOverItem, setDragOverItem] = useState(null);

  // Format date for breadcrumb display (DD/MM/YYYY)
  const formatBreadcrumbDate = (dateObj) => {
    if (!dateObj) return '';
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Check if the selected date is today
  const isToday = (dateObj) => {
    if (!dateObj) return true;
    const today = new Date();
    return dateObj.toDateString() === today.toDateString();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e, itemType, itemId) => {
    e.preventDefault();
    setDragOverItem(`${itemType}-${itemId}`);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    // Only clear if we're actually leaving the breadcrumb area
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverItem(null);
    }
  };

  const handleDrop = (e, dropType, dropId, dropName) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverItem(null);

    // Get the dragged note data from the drag event
    const noteData = e.dataTransfer.getData('application/json');
    if (noteData && onNoteDrop) {
      try {
        const parsedData = JSON.parse(noteData);
        console.log('Breadcrumb drop:', { parsedData, dropType, dropId, dropName });
        
        // Call the parent handler with the correct parent ID
        const newParentId = dropType === 'file' ? null : dropId;
        onNoteDrop(parsedData, dropType, newParentId, dropName);
      } catch (error) {
        console.error('Error parsing dropped note data:', error);
      }
    }
  };

  return (
    <div className="breadcrumb-container">
      {/* Show "Today" for quick notes context */}
      {isQuickNotesContext && (
        <>
          <button 
            className={`breadcrumb-link ${dragOverItem === 'today-quicknotes' ? 'drag-over' : ''}`}
            onClick={() => navigate('/quick-notes/today')}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, 'today', 'quicknotes')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'quicknotes', null, 'Today')}
          >
            Today
          </button>
          
          {/* Show selected date if not today */}
          {selectedDate && !isToday(selectedDate) && (
            <>
              <span className="breadcrumb-separator">></span>
              <span className="breadcrumb-current-date">
                {formatBreadcrumbDate(selectedDate)}
              </span>
            </>
          )}
        </>
      )}

      {/* Show neural file for file context */}
      {neuralFile && !isQuickNotesContext && (
        <button 
          className={`breadcrumb-link ${dragOverItem === `file-${neuralFileId}` ? 'drag-over' : ''}`}
          onClick={() => navigate(`/file/${neuralFileId}`)}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, 'file', neuralFileId)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'file', null, neuralFile.name)}
        >
          {neuralFile.name}
        </button>
      )}
      
      {/* Show note path */}
      {notePath.map((note, index) => (
        <React.Fragment key={note.id}>
          <span className="breadcrumb-separator">></span>
          <button
            className={`breadcrumb-link ${index === notePath.length - 1 ? 'note-link' : ''} ${dragOverItem === `note-${note.id}` ? 'drag-over' : ''}`}
            onClick={() => {
              // Navigate based on context
              if (isQuickNotesContext) {
                navigate(`/note/${note.id}`);
              } else {
                navigate(`/file/${neuralFileId}/note/${note.id}`);
              }
            }}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, 'note', note.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'note', note.id, note.title)}
          >
            {note.title}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
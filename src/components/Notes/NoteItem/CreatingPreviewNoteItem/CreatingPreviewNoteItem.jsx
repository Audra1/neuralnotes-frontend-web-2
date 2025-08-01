import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import defaultNoteStar from '../../../../assets/defaultnotestar.png';
import '../NoteItem.css';

export default function EditNoteItem({ 
  onSave, 
  onCancel, 
  parentId = null, 
  neuralFileId = null,
  showPriorityLine = false,
  priorityNumber = null,
  isFirstPriorityItem = false,
  isLastPriorityItem = false
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const titleRef = useRef(null);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  const handleSave = async () => {
    if (!title.trim()) return;
  
    try {
      const noteData = {
        title: title.trim(),
        description: description.trim(),
        note_type: 'text',
        parent_id: parentId ? parseInt(parentId) : null,
        file_id: neuralFileId ? parseInt(neuralFileId) : null
      };
  
      // Only add deadline if it's a top-level note (no parent)
      if (!parentId) {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        noteData.deadline = `23:59 ${day}/${month}/${year}`;
      }
  
      const response = await axios.post('http://localhost:8001/api/notes', noteData);
      onSave(response.data);
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className={`note-item-container ${showPriorityLine ? 'with-priority' : ''}`}>
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
      
      <div className="note-item editing-note-item">
        <div className="note-icon">
          <img src={defaultNoteStar} alt="*" className="note-icon-star" />
        </div>
        
        <div className="note-content">
          <input
            ref={titleRef}
            className="note-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Note title..."
          />
          
          <input
            className="note-description-input"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Description (optional)..."
          />
        </div>
        
        <div className="edit-actions">
          <button 
            className="save-button"
            onClick={handleSave}
            disabled={!title.trim()}
          >
            ✓
          </button>
          <button 
            className="cancel-button"
            onClick={onCancel}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NoteItem from '../../Notes/NoteItem/NoteItem';
import EditNoteItem from '../../Notes/NoteItem/CreatingPreviewNoteItem/CreatingPreviewNoteItem';
import Notification from '../../File/FilePage/Notification/Notification';
import { useNavigate } from 'react-router-dom';
import './QuickNotesList.css';

export default function QuickNotesList({ selectedDate = new Date() }) {
  const [quickNotes, setQuickNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [notification, setNotification] = useState({
    isVisible: false,
    message: '',
    deletedNote: null,
    type: 'delete',
    undoData: null
  });
  
  const navigate = useNavigate();

  // Format date for API call (YYYY-MM-DD)
  const formatDateForAPI = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Check if selected date is today (same timezone)
  const isToday = () => {
    const today = new Date();
    const selected = new Date(selectedDate);
    
    // Compare dates in local timezone
    return today.getFullYear() === selected.getFullYear() &&
           today.getMonth() === selected.getMonth() &&
           today.getDate() === selected.getDate();
  };

  // Load quick notes for the selected date
  const loadQuickNotes = async () => {
    try {
      setLoading(true);
      const dateStr = formatDateForAPI(selectedDate);
      
      // Use the correct quick-notes endpoint
      const response = await axios.get('http://localhost:8001/api/quick-notes');
      
      // Filter notes by date and ensure they're actually quick notes
      const allNotes = response.data;
      const todayNotes = allNotes.filter(note => {
        // Ensure it's a quick note (no parent_id, no file_id, correct type)
        if (note.parent_id !== null || note.file_id !== null) return false;
        if (note.note_type !== 'quick_note') return false;
        
        // Filter by date - fix timezone issues
        if (!note.created_at) return false;
        const noteDate = new Date(note.created_at * 1000);
        const noteDateStr = noteDate.toISOString().split('T')[0];
        return noteDateStr === dateStr;
      });
      
      setQuickNotes(todayNotes);
    } catch (error) {
      console.error('Error loading quick notes:', error);
      setQuickNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuickNotes();
  }, [selectedDate]);

  const handleCreateNote = () => {
    setIsCreatingNote(true);
  };

  const handleSaveNewNote = async (newNote) => {
    try {
      // Create the note using the quick-notes endpoint with clean data
      const response = await axios.post('http://localhost:8001/api/quick-notes', {
        title: newNote.title || 'Untitled',
        content: newNote.content || newNote.description || ''
      });
      
      setIsCreatingNote(false);
      // Refresh the list to get the clean note from backend
      loadQuickNotes();
      
    } catch (error) {
      console.error('Error creating quick note:', error);
      alert('Failed to create note. Please try again.');
      setIsCreatingNote(false);
    }
  };

  const handleCancelNewNote = () => {
    setIsCreatingNote(false);
  };

  const handleTitleClick = (noteId) => {
    navigate(`/note/${noteId}`);
  };

  const deleteNote = async (noteId) => {
    try {
      const noteToDelete = quickNotes.find(note => note.id === noteId);
      // Use the correct quick-notes endpoint for deletion
      await axios.delete(`http://localhost:8001/api/quick-notes/${noteId}`);
      
      setQuickNotes(quickNotes.filter(note => note.id !== noteId));
      
      setNotification({
        isVisible: true,
        message: `"${noteToDelete.title}" deleted`,
        deletedNote: noteToDelete,
        type: 'delete',
        undoData: null
      });
      
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const handleUndo = async () => {
    try {
      if (notification.type === 'delete' && notification.deletedNote) {
        // Recreate using quick-notes endpoint with clean data
        const noteData = {
          title: notification.deletedNote.title,
          content: notification.deletedNote.content || ''
        };
        await axios.post('http://localhost:8001/api/quick-notes', noteData);
        loadQuickNotes();
      }
      handleCloseNotification();
    } catch (error) {
      console.error('Error undoing action:', error);
      alert('Failed to undo action. Please try again.');
    }
  };

  const handleCloseNotification = () => {
    setNotification({
      isVisible: false,
      message: '',
      deletedNote: null,
      type: 'delete',
      undoData: null
    });
  };

  // Add keyboard event listener for Enter key - ONLY for today
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only trigger if it's today AND not currently creating a note
      if (e.key === 'Enter' && !isCreatingNote && isToday()) {
        // Don't trigger if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          return;
        }
        
        handleCreateNote();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreatingNote]);

  if (loading) {
    return <div className="loading">Loading quick notes...</div>;
  }

  return (
    <>
      <Notification
        isVisible={notification.isVisible}
        message={notification.message}
        onUndo={handleUndo}
        onClose={handleCloseNotification}
      />

      <div className="quick-notes-list">
        {quickNotes.length === 0 && !isCreatingNote ? (
          <div className="empty-state">
            <p>No quick notes for this day</p>
            {/* Only show create button and shortcut hint for today */}
            {isToday() && (
              <>
                <button 
                  className="create-first-note-btn"
                  onClick={handleCreateNote}
                >
                  Create your first quick note
                </button>
                <p className="shortcut-hint">Or press <kbd>Enter</kbd> to create a note</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Only allow creating notes on today - PREVIEW AT TOP */}
            {isCreatingNote && isToday() && (
              <EditNoteItem
                onSave={handleSaveNewNote}
                onCancel={handleCancelNewNote}
                parentId={null}
                neuralFileId={null}
              />
            )}
            {quickNotes.map((note, index) => (
              <NoteItem
                key={note.id}
                note={note}
                onDeleteNote={deleteNote}
                onTitleClick={handleTitleClick}
                onRefresh={loadQuickNotes}
                isFirstNote={index === 0}
                isInNeuralFileContext={false}
                isQuickNotesContext={true}
              />
            ))}
          </>
        )}
      </div>
    </>
  );
}
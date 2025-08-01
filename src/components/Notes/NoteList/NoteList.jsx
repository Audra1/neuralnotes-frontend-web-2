/**
 * This file defines the NoteList component, which is responsible for displaying, sorting, and managing a list of notes.
 * It handles loading notes from the backend, displaying them in a sortable list, and managing interactions such as creating, deleting, pinning, and reordering notes.
 */

/**
 * @typedef {object} NoteListProps
 * @property {boolean} refreshTrigger - A boolean that triggers a refresh of the note list when changed.
 * @property {boolean} [hideCompleted=false] - If true, hides completed notes.
 * @property {boolean} [showPriorityLine=false] - If true, displays a priority line next to each note.
 * @property {string|null} [parentId=null] - The ID of the parent note, if this list displays child notes.
 * @property {string|null} [neuralFileId=null] - The ID of the neural file associated with these notes.
 * @property {boolean} [isInNeuralFileContext=false] - If true, indicates that the notes are being displayed within a neural file context.
 * @property {boolean} [isCreatingNote=false] - If true, a new note is being created.
 * @property {Function} [onCreateNote=null] - Callback function to handle the creation of a new note.
 * @property {Function} [onSaveNewNote=null] - Callback function to handle saving a new note.
 * @property {Function} [onCancelNewNote=null] - Callback function to handle canceling the creation of a new note.
 * @property {string} [noteOrder='latest-last'] - The order in which notes should be displayed ('latest-first' or 'latest-last').
 * @property {Array<string>} [customOrder=[]] - An array defining the custom order of notes.
 * @property {Function} [onCustomOrderChange=null] - Callback function to handle changes in the custom order of notes.
 */

/**
 * NoteList component to display and manage a list of notes.
 *
 * @param {NoteListProps} props - The props for the NoteList component.
 * @returns {JSX.Element} - A JSX element representing the NoteList component.
 */
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import NoteItem from '../NoteItem/NoteItem'
import CreateNoteButton from './CreateNoteButton/CreateNoteButton'
import EditNoteItem from '../NoteItem/CreatingPreviewNoteItem/CreatingPreviewNoteItem'
import Notification from '../../File/FilePage/Notification/Notification'
import MultipleDeleteModal from '../NoteItem/ContextMenu/MultipleDeleteModal/MultipleDeleteModal'
import { useNavigate } from 'react-router-dom'
import './NoteList.css'

export default function NoteList({ 
  refreshTrigger, 
  hideCompleted = false, 
  showPriorityLine = false,
  parentId = null,
  neuralFileId = null,
  isInNeuralFileContext = false,
  // New props from PageNote
  isCreatingNote = false,
  onCreateNote = null,
  onSaveNewNote = null,
  onCancelNewNote = null,
  noteOrder = 'latest-last',
  customOrder = [],
  onCustomOrderChange = null,
  isTableOfContentsMode = false
}) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [internalIsCreatingNote, setInternalIsCreatingNote] = useState(false)
  const [notification, setNotification] = useState({
    isVisible: false,
    message: '',
    deletedNote: null,
    type: 'delete',
    undoData: null
  })
  
  // Multiple delete state
  const [isMultipleDeleteMode, setIsMultipleDeleteMode] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState([])

  // Pin state management
  const [pinnedPositions, setPinnedPositions] = useState({})
  const [dragOverStates, setDragOverStates] = useState({})
  const [isDragMode, setIsDragMode] = useState(false)

  // Use external state if provided, otherwise use internal state
  const creatingNote = isCreatingNote !== undefined ? isCreatingNote : internalIsCreatingNote
  const setCreatingNote = onCreateNote ? () => onCreateNote() : setInternalIsCreatingNote

  // Load order preference on component mount
  useEffect(() => {
    const loadOrderPreference = async () => {
      if (!neuralFileId && !parentId) return; // Skip for Today view
      
      try {
        const params = new URLSearchParams();
        if (neuralFileId) params.append('file_id', neuralFileId);
        if (parentId) params.append('parent_id', parentId);
        
        const response = await axios.get(`http://localhost:8001/api/preferences/note-order?${params}`);
        // Note: This will be handled by parent component FilePage
        console.log('Loaded order preference:', response.data);
      } catch (error) {
        console.error('Error loading order preference:', error);
      }
    };

    loadOrderPreference();
  }, [neuralFileId, parentId]);

  // Sort notes based on current order 
  const sortNotes = (notesToSort) => {
    let sortedNotes = [...notesToSort];
    
    // Handle null noteOrder (during initial load)
    if (!noteOrder) {
      console.log('noteOrder is null, skipping sort');
      return sortedNotes;
    }
    
    console.log('Sorting notes with order:', noteOrder);
    console.log('Notes before sorting:', sortedNotes.map(n => ({ id: n.id, title: n.title, created_at: n.created_at })));
    
    switch (noteOrder) {
      case 'latest-first':
        // Most recent notes first (descending order by created_at)
        sortedNotes.sort((a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return dateB.getTime() - dateA.getTime();
        });
        break;
      case 'latest-last':
      default:
        // Oldest notes first (ascending order by created_at)
        sortedNotes.sort((a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return dateA.getTime() - dateB.getTime();
        });
        break;
    }
    
    console.log('Notes after sorting:', sortedNotes.map(n => ({ id: n.id, title: n.title, created_at: n.created_at })));
    return sortedNotes;
  };

  // Load notes based on context
  const loadNotes = () => {
    let endpoint = ''
    
    if (parentId) {
      endpoint = `http://localhost:8001/api/notes/children/${parentId}`
    } else if (neuralFileId) {
      endpoint = `http://localhost:8001/api/notes/file/${neuralFileId}`
    } else {
      endpoint = 'http://localhost:8001/api/notes/recent'
    }

    axios
      .get(endpoint)
      .then((res) => {
        console.log('Notes loaded:', res.data);
        let loadedNotes = res.data;
        
        if (hideCompleted) {
          loadedNotes = loadedNotes.filter(note => !note.completed);
        }
        
        setNotes(loadedNotes);
      })
      .catch(error => {
        console.error("Error loading notes:", error);
        setNotes([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadNotes()
  }, [refreshTrigger, parentId, neuralFileId, hideCompleted])

  // Add this effect to listen for external refresh triggers (like from App.jsx)
  useEffect(() => {
    // Small delay to ensure backend update is complete
    const timeoutId = setTimeout(() => {
      loadNotes();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [refreshTrigger]);

  // Update sorting when noteOrder or customOrder changes
  useEffect(() => {
    if (notes.length > 0 && noteOrder) { // Only sort when noteOrder is not null
      const sortedNotes = sortNotes(notes);
      setNotes(sortedNotes);
    }
  }, [noteOrder, customOrder]);

  // Enhanced drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    setIsDragMode(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
  };

  const handleDragOver = (e, index, zone) => {
    e.preventDefault();
    
    if (draggedIndex !== null) {
      setDragOverStates(prev => ({
        ...prev,
        [notes[index].id]: zone
      }));
    }
  };

  const handleDragLeave = (e, index) => {
    if (draggedIndex !== null && !e.currentTarget.contains(e.relatedTarget)) {
      setDragOverStates(prev => {
        const newState = { ...prev };
        delete newState[notes[index].id];
        return newState;
      });
    }
  };

  const handleDrop = (e, dropIndex, zone) => {
    e.preventDefault();
    
    setDragOverStates({});
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    const draggedNote = notes[draggedIndex];
    const targetNote = notes[dropIndex];
    
    switch (zone) {
      case 'pin-above':
        handlePinNote(draggedNote, dropIndex);
        break;
      case 'pin-below':
        handlePinNote(draggedNote, dropIndex + 1);
        break;
      case 'parent':
        makeNoteChild(draggedNote, targetNote);
        break;
      default:
        makeNoteChild(draggedNote, targetNote);
        break;
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverStates({});
    setIsDragMode(false);
  };

  // Add new handlers for drop zones
  const handleDropZoneDragOver = (e, index, position) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex !== null) {
      const key = `${position}-${index}`;
      setDragOverStates(prev => ({
        ...prev,
        [key]: true
      }));
    }
  };

  const handleDropZoneDragLeave = (e, index, position) => {
    e.stopPropagation();
    
    if (draggedIndex !== null && !e.currentTarget.contains(e.relatedTarget)) {
      const key = `${position}-${index}`;
      setDragOverStates(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    }
  };

  const handleDropZoneDrop = (e, index, position) => {
    e.preventDefault();
    
    setDragOverStates({});
    
    if (draggedIndex === null) return;

    const draggedNote = notes[draggedIndex];
    const pinPosition = position === 'above' ? index : index + 1;
    
    handlePinNote(draggedNote, pinPosition);
  };

  const handlePinNote = async (note, position) => {
    try {
      // Determine pin context based on current view
      const pinContext = parentId ? 'parent' : 'file';
      
      // Call backend pin endpoint
      await axios.post(`http://localhost:8001/api/notes/${note.id}/pin`, {
        position: position,
        context: pinContext
      });
      
      // Reload notes to get updated backend ordering
      loadNotes();
      
      // Show notification
      setNotification({
        isVisible: true,
        message: `"${note.title}" pinned at position ${position + 1}`,
        type: 'pin',
        undoData: {
          noteId: note.id,
          action: 'pin'
        }
      });
      
    } catch (error) {
      console.error("Error pinning note:", error);
      alert("Failed to pin note. Please try again.");
    }
  };

  const handleUnpinNote = async (noteId) => {
    try {
      // Call backend unpin endpoint
      await axios.post(`http://localhost:8001/api/notes/${noteId}/unpin`);
      
      // Reload notes to get updated backend ordering
      loadNotes();
      
      // Show notification
      setNotification({
        isVisible: true,
        message: "Note unpinned successfully",
        type: 'pin',
        undoData: {
          noteId: noteId,
          action: 'unpin'
        }
      });
      
    } catch (error) {
      console.error("Error unpinning note:", error);
      alert("Failed to unpin note. Please try again.");
    }
  };

  const makeNoteChild = async (childNote, parentNote) => {
    try {
      const previousParentId = childNote.parent_id;
      
      // Update the note to have new parent
      await axios.put(`http://localhost:8001/api/notes/${childNote.id}`, {
        parent_id: parentNote.id
      });
      
      // Remove the note from current list since it's now a child
      setNotes(prev => prev.filter(note => note.id !== childNote.id));
      
      // Show notification with undo option
      setNotification({
        isVisible: true,
        message: `"${childNote.title}" moved under "${parentNote.title}"`,
        type: 'parent-change',
        undoData: {
          childNote: childNote,
          newParentId: parentNote.id,
          previousParentId: previousParentId
        }
      });
      
    } catch (error) {
      console.error("Error making note child:", error);
      alert("Failed to move note. Please try again.");
    }
  };

  const deleteNote = async (noteId) => {
    try {
      const noteToDelete = notes.find(note => note.id === noteId);
      await axios.delete(`http://localhost:8001/api/notes/${noteId}`);
      
      setNotes(notes.filter(note => note.id !== noteId));
      
      setNotification({
        isVisible: true,
        message: `"${noteToDelete.title}" deleted`,
        deletedNote: noteToDelete,
        type: 'delete',
        undoData: null
      });
      
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Failed to delete note. Please try again.");
    }
  };

  const handleUndo = async () => {
    try {
      if (notification.type === 'delete' && notification.deletedNote) {
        // Existing delete undo logic
        const noteData = {
          title: notification.deletedNote.title,
          description: notification.deletedNote.description || '',
          content: notification.deletedNote.content || '',
          file_id: notification.deletedNote.file_id,
          parent_id: notification.deletedNote.parent_id,
          priority: notification.deletedNote.priority,
          display_order: notification.deletedNote.display_order,
          deadline: notification.deletedNote.deadline,
          tags: notification.deletedNote.tags || []
        };
        await axios.post('http://localhost:8001/api/notes', noteData);
        loadNotes();
      } else if (notification.type === 'parent-change' && notification.undoData) {
        // Undo parent-child relationship
        const { childNote, previousParentId } = notification.undoData;
        await axios.put(`http://localhost:8001/api/notes/${childNote.id}`, {
          parent_id: previousParentId
        });
        loadNotes();
      } else if (notification.type === 'pin' && notification.undoData) {
        // Undo pin/unpin action
        const { noteId, action } = notification.undoData;
        if (action === 'pin') {
          // Undo pin by unpinning
          await handleUnpinNote(noteId);
        } else if (action === 'unpin') {
          // Cannot easily undo unpin without knowing previous position
          // For now, just reload notes
          loadNotes();
        }
      } 
      handleCloseNotification();
      
    } catch (error) {
      console.error("Error undoing action:", error);
      alert("Failed to undo action. Please try again.");
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
  }

  // Multiple delete handlers
  const handleStartMultipleDelete = (noteId) => {
    setIsMultipleDeleteMode(true);
    setSelectedNotes([noteId]);
  };
  
  const handleToggleSelection = (noteId) => {
    setSelectedNotes(prev => {
      if (prev.includes(noteId)) {
        return prev.filter(id => id !== noteId);
      } else {
        return [...prev, noteId];
      }
    });
  };
  
  const handleCancelMultipleDelete = () => {
    setIsMultipleDeleteMode(false);
    setSelectedNotes([]);
  };
  
  const handleMultipleDelete = async (noteIds) => {
    try {
      // Call backend endpoint for multiple delete
      await axios.delete('http://localhost:8001/api/notes/multiple', {
        data: { note_ids: noteIds }
      });
      // Remove notes from local state
      setNotes(prev => prev.filter(note => !noteIds.includes(note.id)));
      setIsMultipleDeleteMode(false);
      setSelectedNotes([]);
      // Show notification
      setNotification({
        isVisible: true,
        message: `${noteIds.length} note${noteIds.length > 1 ? 's' : ''} deleted`,
        deletedNote: null,
        type: 'delete',
        undoData: null
      });
    } catch (error) {
      console.error("Error deleting multiple notes:", error);
      alert("Failed to delete notes. Please try again.");
    }
  };

  // Inline editing handlers
  const handleCreateNote = () => {
    if (onCreateNote) {
      onCreateNote();
    } else {
      setInternalIsCreatingNote(true);
    }
  };
  
  const handleSaveNewNote = (newNote) => {
    if (onSaveNewNote) {
      onSaveNewNote(newNote);
    } else {
      setInternalIsCreatingNote(false);
    }
    
    // Immediately add the note to the correct position based on noteOrder
    setNotes(prev => {
      const updatedNotes = [...prev];
      
      if (noteOrder === 'latest-first') {
        // Add to the beginning for latest-first
        updatedNotes.unshift(newNote);
      } else {
        // Add to the end for latest-last
        updatedNotes.push(newNote);
      }
      
      return updatedNotes;
    });
    
    // Refresh from backend to ensure consistency
    setTimeout(() => {
      loadNotes();
    }, 100);
  };
  
  const handleCancelNewNote = () => {
    if (onCancelNewNote) {
      onCancelNewNote();
    } else {
      setInternalIsCreatingNote(false);
    }
  };
  
  const navigate = useNavigate()

  const handleTitleClick = (noteId) => {
    console.log('Note clicked:', noteId, 'neuralFileId:', neuralFileId, 'isInNeuralFileContext:', isInNeuralFileContext);
    
    if (isInNeuralFileContext && neuralFileId) {
      navigate(`/file/${neuralFileId}/note/${noteId}`);
    } else {
      navigate(`/note/${noteId}`);
    }
  };

  if (loading) {
    return <div className="loading">Loading notes...</div>;
  }

  const getEmptyStateMessage = () => {
    if (parentId) {
      return "No sub-notes yet";
    } else if (neuralFileId || isInNeuralFileContext) {
      return "No notes in this file yet";
    } else {
      return "No notes for today";
    }
  };

  // Helper function to determine where to place the creating note
  const getCreatingNotePosition = () => {
    if (noteOrder === 'latest-first') {
      // For latest-first, new notes go at the beginning
      return 0;
    }
    
    // For latest-last (or null), new notes go at the end
    return notes.length;
  };

  return (
    <>
      <Notification
        isVisible={notification.isVisible}
        message={notification.message}
        onUndo={handleUndo}
        onClose={handleCloseNotification}
      />

      <MultipleDeleteModal
        isOpen={isMultipleDeleteMode}
        onClose={handleCancelMultipleDelete}
        onDelete={handleMultipleDelete}
        selectedNotes={selectedNotes}
      />

      <div className={`notes-list ${isDragMode ? 'dragging' : ''}`}>
        {notes.length === 0 && !creatingNote ? (
          <div className="empty-state">
            {getEmptyStateMessage()}
          </div>
        ) : (
          <>
            {notes.map((note, index) => {
              const creatingNotePosition = getCreatingNotePosition();
              const shouldShowCreatingNoteHere = creatingNote && index === creatingNotePosition;
              
              return (
                <React.Fragment key={note.id}>
                  {index === 0 && (
                    <div 
                      className={`drop-zone ${isDragMode ? 'drag-mode' : ''} ${dragOverStates[`above-${index}`] ? 'active' : ''}`}
                      onDragOver={(e) => handleDropZoneDragOver(e, index, 'above')}
                      onDragLeave={(e) => handleDropZoneDragLeave(e, index, 'above')}
                      onDrop={(e) => handleDropZoneDrop(e, index, 'above')}
                    />
                  )}

                  {/* Show creating note before this position if needed */}
                  {shouldShowCreatingNoteHere && (
                    <EditNoteItem
                      onSave={handleSaveNewNote}
                      onCancel={handleCancelNewNote}
                      parentId={parentId}
                      neuralFileId={neuralFileId}
                      showPriorityLine={showPriorityLine}
                      priorityNumber={showPriorityLine ? (index + 1) : null}
                      isFirstPriorityItem={showPriorityLine && index === 0}
                      isLastPriorityItem={false}
                      noteOrder={noteOrder}
                    />
                  )}

                  <NoteItem
                    note={note}
                    onDeleteNote={deleteNote}
                    onTitleClick={handleTitleClick}
                    onRefresh={loadNotes}
                    isFirstNote={index === 0 && !parentId}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e, zone) => handleDragOver(e, index, zone)}
                    onDragLeave={(e) => handleDragLeave(e, index)}
                    onDrop={(e, zone) => handleDrop(e, index, zone)}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedIndex === index}
                    dragIndex={draggedIndex}
                    itemIndex={index}
                    priorityNumber={showPriorityLine ? (index + 1) : null}
                    showPriorityLine={showPriorityLine}
                    isFirstPriorityItem={showPriorityLine && index === 0}
                    isLastPriorityItem={showPriorityLine && index === notes.length - 1 && !creatingNote}
                    isInNeuralFileContext={isInNeuralFileContext}
                    isMultipleDeleteMode={isMultipleDeleteMode}
                    isSelected={selectedNotes.includes(note.id)}
                    onToggleSelection={handleToggleSelection}
                    onStartMultipleDelete={handleStartMultipleDelete}
                    isPinned={note.is_pinned || false}
                    dragOverZone={dragOverStates[note.id]}
                    isTableOfContentsMode={isTableOfContentsMode}
                  />
                  
                  <div 
                    className={`drop-zone ${isDragMode ? 'drag-mode' : ''} ${dragOverStates[`below-${index}`] ? 'active' : ''}`}
                    onDragOver={(e) => handleDropZoneDragOver(e, index, 'below')}
                    onDragLeave={(e) => handleDropZoneDragLeave(e, index, 'below')}
                    onDrop={(e) => handleDropZoneDrop(e, index, 'below')}
                  />
                </React.Fragment>
              );
            })}
            
            {/* Show creating note at the end if that's where it should be */}
            {creatingNote && getCreatingNotePosition() >= notes.length && (
              <EditNoteItem
                onSave={handleSaveNewNote}
                onCancel={handleCancelNewNote}
                parentId={parentId}
                neuralFileId={neuralFileId}
                showPriorityLine={showPriorityLine}
                priorityNumber={showPriorityLine ? (notes.length + 1) : null}
                isFirstPriorityItem={showPriorityLine && notes.length === 0}
                isLastPriorityItem={showPriorityLine}
                noteOrder={noteOrder}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
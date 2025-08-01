import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from './Breadcrumb/Breadcrumb';
import NavBarThreeDots from './NavBarThreeDots/NavBarThreeDots';
import './NavBar.css';

export default function NavBar({ neuralFile, onFileDeleted, onNoteDrop }) {
  const { neuralFileId, noteId, date } = useParams();
  const location = useLocation();
  const [notePath, setNotePath] = useState([]);
  const [isQuickNotesContext, setIsQuickNotesContext] = useState(false);

  // Check if we're in quick notes context
  useEffect(() => {
    const isQuickNotes = location.pathname.startsWith('/quick-notes') || 
                        (noteId && !neuralFileId); // Note without file context
    setIsQuickNotesContext(isQuickNotes);
  }, [location.pathname, noteId, neuralFileId]);

  // Function to build note path from root to current note
  const buildNotePath = async (noteId) => {
    const path = [];
    let currentNoteId = noteId;
    
    while (currentNoteId) {
      try {
        const response = await axios.get(`http://localhost:8001/api/notes/${currentNoteId}`);
        const note = response.data;
        path.unshift(note); // Add to beginning of array
        currentNoteId = note.parent_id;
      } catch (error) {
        console.error('Error building note path:', error);
        break;
      }
    }
    
    return path;
  };

  // Build note path when noteId changes
  useEffect(() => {
    const loadNotePath = async () => {
      if (noteId) {
        const path = await buildNotePath(parseInt(noteId));
        setNotePath(path);
      } else {
        setNotePath([]);
      }
    };

    loadNotePath();
  }, [noteId]);

  // Get selected date for quick notes context
  const getSelectedDate = () => {
    if (isQuickNotesContext && date && date !== 'today') {
      const parsedDate = new Date(date + 'T00:00:00');
      return isNaN(parsedDate.getTime()) ? null : parsedDate;
    }
    return null;
  };

  const selectedDate = getSelectedDate();

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Breadcrumb 
          neuralFile={neuralFile} 
          notePath={notePath}
          isQuickNotesContext={isQuickNotesContext}
          selectedDate={selectedDate}
          onNoteDrop={onNoteDrop}
        />
        
        {neuralFile && (
          <NavBarThreeDots 
            fileId={neuralFileId} 
            fileName={neuralFile.name}
            onFileDeleted={onFileDeleted}
          />
        )}
      </div>
    </nav>
  );
}
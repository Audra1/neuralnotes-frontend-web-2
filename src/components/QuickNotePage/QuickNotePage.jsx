import React, { useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import QuickNotesList from './QuickNotesList/QuickNotesList';
import CalendarView from './Calendar/Calendar';
import './QuickNotePage.css';

export default function QuickNotePage() {
  const { date } = useParams();
  const navigate = useNavigate();
  const { setBreadcrumbData } = useOutletContext();
  
  // Parse date from URL parameter or use today
  const getSelectedDate = () => {
    if (date && date !== 'today') {
      // Parse YYYY-MM-DD format
      const parsedDate = new Date(date + 'T00:00:00');
      return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    }
    return new Date();
  };
  

  const selectedDate = getSelectedDate();
  const isToday = date === 'today' || !date;

  // Set breadcrumb data for quick notes context
  useEffect(() => {
    setBreadcrumbData({
      neuralFile: null, // No neural file in quick notes context
      note: null,
      isQuickNotesContext: true // Add this flag
    });
  }, [setBreadcrumbData]);

  // Format date for display (e.g., "Wed Jul 30")
  const formatDisplayDate = (dateObj) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(dateObj);
  };

  return (
    <div className="quick-note-page">
      <div className="quick-note-header">
        {!isToday && (
          <button 
            className="back-to-today-btn"
            onClick={() => navigate('/quick-notes/today')}
          >
            ← Back to Today
          </button>
        )}
        
        <h1 className="date-title">
          {formatDisplayDate(selectedDate)}
        </h1>
      </div>
      
      <QuickNotesList selectedDate={selectedDate} />
      
      {/* Only show calendar on today's page */}
      {isToday && (
        <>
          <CalendarView />
        </>
      )}
    </div>
  );
}
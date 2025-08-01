// Calendar code referencing to a calendar from another reference app, to adapt code.
// depending on each day goes to one inbox quicknote of that day.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import axios from 'axios';
import 'react-calendar/dist/Calendar.css';
import './Calendar.css';

export default function CalendarView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [noteCounts, setNoteCounts] = useState({});
  const [activeStartDate, setActiveStartDate] = useState(new Date());
  const navigate = useNavigate();

  const handleDateClick = (date) => {
    setSelectedDate(date);
    // Format date as YYYY-MM-DD for the URL and navigate to quick notes
    const formattedDate = date.toISOString().split('T')[0];
    navigate(`/quick-notes/${formattedDate}`);
  };

  const formatMonthYear = (locale, date) => {
    return new Intl.DateTimeFormat(locale, { 
      month: 'long', 
      year: 'numeric' 
    }).format(date);
  };

  // Navigation handlers
  const handlePrevMonth = () => {
    const prevMonth = new Date(activeStartDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setActiveStartDate(prevMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(activeStartDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setActiveStartDate(nextMonth);
  };

  // Get visible dates for the current calendar view
  const getVisibleDates = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get start of calendar view (might include previous month days)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Get end of calendar view (might include next month days)
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const dates = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  // Format date consistently for comparison (local timezone)
  const formatDateForComparison = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch quick notes counts for visible dates
  const fetchNoteCounts = async () => {
    try {
      const visibleDates = getVisibleDates(selectedDate);
      const counts = {};
      
      try {
        // Get all quick notes
        const response = await axios.get('http://localhost:8001/api/quick-notes');
        const allNotes = response.data;
        
        // Count notes for each visible date
        visibleDates.forEach(date => {
          const dateKey = date.toDateString();
          const dateStr = formatDateForComparison(date);
          
          const notesForDate = allNotes.filter(note => {
            if (!note.created_at) return false;
            
            // Convert Unix timestamp to Date and format for comparison
            const noteDate = new Date(note.created_at * 1000);
            const noteDateStr = formatDateForComparison(noteDate);
            
            return noteDateStr === dateStr;
          });
          
          counts[dateKey] = notesForDate.length;
        });
        
        setNoteCounts(counts);
      } catch (error) {
        console.error('Error fetching quick notes counts:', error);
        // If endpoint doesn't exist or returns error, all counts are 0
        visibleDates.forEach(date => {
          counts[date.toDateString()] = 0;
        });
        setNoteCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching note counts:', error);
    }
  };

  // Fetch note counts when the month changes
  useEffect(() => {
    fetchNoteCounts();
  }, [selectedDate, activeStartDate]);

  // Helper function to check if two dates are the same day (local timezone)
  const isSameDay = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // Custom tile content to show note counter
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateKey = date.toDateString();
      const noteCount = noteCounts[dateKey];
      
      if (noteCount && noteCount > 0) {
        return (
          <div className="event-counter has-events">
            {noteCount}
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-header-top">
          <h2 className="calendar-month-title">
            {formatMonthYear('en-US', activeStartDate)}
          </h2>
        </div>
        
        <div className="calendar-divider"></div>
        
        <div className="header-options">
          <div className="header-left-buttons">
            <button className="header-button active">Calendar</button>
            <button className="header-button">Feed</button>
          </div>
          
          <div className="header-right-controls">
            <button className="nav-button" onClick={handlePrevMonth}>
              ‹
            </button>
            <div className="view-selector">
              <button className="selector-button">Month</button>
            </div>
            <button className="nav-button" onClick={handleNextMonth}>
              ›
            </button>
          </div>
        </div>
      </div>
      
      <Calendar
        onChange={setSelectedDate}
        value={selectedDate}
        onClickDay={handleDateClick}
        activeStartDate={activeStartDate}
        onActiveStartDateChange={({ activeStartDate }) => {
          setActiveStartDate(activeStartDate);
        }}
        showNeighboringMonth={true}
        showNavigation={false}
        formatShortWeekday={(locale, date) => 
          new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(date)
        }
        tileClassName={({ date, view }) => {
          if (view === 'month') {
            const today = new Date();
            if (isSameDay(date, today)) {
              return 'today-tile';
            }
          }
          return null;
        }}
        tileContent={tileContent}
      />
    </div>
  );
}
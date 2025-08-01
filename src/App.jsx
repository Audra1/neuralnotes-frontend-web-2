import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import axios from 'axios'
import SideBar from './components/SideBar/SideBar'
import NavBar from './components/NavBar/NavBar'
import Notification from './components/File/FilePage/Notification/Notification'
import './App.css'

function App() {
  const [neuralFiles, setNeuralFiles] = useState([])
  const [breadcrumbData, setBreadcrumbData] = useState({ neuralFile: null, note: null })
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0)
  const [notification, setNotification] = useState({
    isVisible: false,
    message: '',
    type: 'parent-change',
    undoData: null
  })
  const location = useLocation()
  const sidebarRef = useRef(null)

  console.log('App rendering with location:', location.pathname);

  // Function to trigger sidebar refresh
  const triggerSidebarRefresh = () => {
    setSidebarRefreshTrigger(prev => prev + 1)
  }

  // Load neural files
  const loadNeuralFiles = async () => {
    try {
      const response = await axios.get('http://localhost:8001/api/neuralfiles');
      setNeuralFiles(response.data);
    } catch (error) {
      console.error('Error loading neural files:', error);
    }
  };

  useEffect(() => {
    loadNeuralFiles();
  }, []);

  const handleFileDeleted = () => {
    triggerSidebarRefresh();
    loadNeuralFiles();
  };

  const handleNoteDrop = async (noteData, dropType, newParentId, dropName) => {
    try {
      console.log('App handleNoteDrop:', { noteData, dropType, newParentId, dropName });
      
      const previousParentId = noteData.parent_id;
      
      // Update the note's parent in the backend
      const response = await axios.put(`http://localhost:8001/api/notes/${noteData.id}`, {
        parent_id: newParentId
      });
      
      console.log('Backend update response:', response.data);
      
      // Show notification
      const actionMessage = dropType === 'file' 
        ? `"${noteData.title}" moved to file "${dropName}"`
        : `"${noteData.title}" moved under "${dropName}"`;
        
      setNotification({
        isVisible: true,
        message: actionMessage,
        type: 'parent-change',
        undoData: {
          noteId: noteData.id,
          previousParentId: previousParentId,
          newParentId: newParentId,
          noteTitle: noteData.title
        }
      });
      
      // Trigger refresh to update any open note lists
      triggerSidebarRefresh();
      
      // Dispatch a custom event to trigger refresh in FilePage components
      window.dispatchEvent(new CustomEvent('noteParentChanged', { 
        detail: { noteId: noteData.id, newParentId, previousParentId }
      }));
      
    } catch (error) {
      console.error('Error updating note parent:', error);
      alert('Failed to move note. Please try again.');
    }
  };

  const handleUndoNotification = async () => {
    try {
      if (notification.undoData) {
        const { noteId, previousParentId } = notification.undoData;
        
        await axios.put(`http://localhost:8001/api/notes/${noteId}`, {
          parent_id: previousParentId
        });
        
        // Trigger refresh to update any open note lists
        triggerSidebarRefresh();
        handleCloseNotification();
      }
    } catch (error) {
      console.error('Error undoing parent change:', error);
      alert('Failed to undo action. Please try again.');
    }
  };

  const handleCloseNotification = () => {
    setNotification({
      isVisible: false,
      message: '',
      type: 'parent-change',
      undoData: null
    });
  };

  return (
    <div className="app-container">
      {/* Fixed notification component */}
      {notification.isVisible && (
        <div className="app-notification">
          <Notification
            isVisible={notification.isVisible}
            message={notification.message}
            onUndo={handleUndoNotification}
            onClose={handleCloseNotification}
          />
        </div>
      )}
      
      <SideBar 
        ref={sidebarRef} 
        refreshTrigger={sidebarRefreshTrigger} 
        breadcrumbData={breadcrumbData}
      />
      <div className="main-section">
        <NavBar 
          neuralFile={breadcrumbData.neuralFile} 
          note={breadcrumbData.note}
          onFileDeleted={handleFileDeleted}
          onNoteDrop={handleNoteDrop}
        />
        <div className="main-content">
          <Outlet context={{ 
            setBreadcrumbData, 
            triggerSidebarRefresh 
          }} />
        </div>
      </div>
    </div>
  )
}

export default App
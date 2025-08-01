import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AddFileButton from './AddFileButton/AddFileButton.jsx';
import FileFinder from './FileFinder/FileFinder.jsx';
import './SideBar.css';
import quicknoteicon from '../../assets/quicknoteicon.png';
import QuickNoteButton from './QuickNoteButton/QuickNoteButton.jsx';

const SideBar = forwardRef(({ refreshTrigger: externalRefreshTrigger, breadcrumbData }, ref) => {
  const [neuralFiles, setNeuralFiles] = useState([]);
  const [internalRefreshTrigger, setInternalRefreshTrigger] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const triggerRefresh = () => {
    setInternalRefreshTrigger(prev => prev + 1);
  };

  // Expose refresh function to parent
  useImperativeHandle(ref, () => ({
    refresh: triggerRefresh
  }));

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  // Load neural files
  const loadNeuralFiles = () => {
    axios
      .get("http://localhost:8001/api/neuralfiles")
      .then((res) => {
        console.log("Neural files loaded:", res.data);
        setNeuralFiles(res.data);
      })
      .catch(error => {
        console.error("Error loading neural files:", error);
        setNeuralFiles([]);
      });
  };

  // Refresh when internal trigger or external trigger changes
  useEffect(() => {
    loadNeuralFiles();
  }, [internalRefreshTrigger, externalRefreshTrigger]);

  const handleNeuralFileClick = (neuralFile) => {
    console.log("Navigating to neural file:", neuralFile);
    // Use the new /file/ route pattern
    navigate(`/file/${neuralFile.id}`);
  };

  const handleQuickNotesClick = () => {
    navigate('/quick-notes/today');
  };

  // Get neural file initial for collapsed view
  const getNeuralFileInitial = (fileName) => {
    return fileName.charAt(0).toUpperCase();
  };

  // Determine if Quick Notes section should be active
  const isQuickNotesActive = () => {
    // Check if we're in quick notes context based on breadcrumb or route
    return location.pathname.startsWith('/quick-notes') || 
           (location.pathname.startsWith('/note/') && !breadcrumbData?.neuralFile) ||
           (breadcrumbData && breadcrumbData.isQuickNotesContext); // Add this check
  };

  return (
    <div className={`Sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      
      {/* Quick Note Button with active feedback */}
      <QuickNoteButton isActive={isQuickNotesActive()} />

      {/* File Finder Component */}
      <FileFinder 
        refreshTrigger={triggerRefresh} 
        isCollapsed={isCollapsed}
      />

      {/* Neural Files section */}
      <div className="neuralfiles-section">
        <div className='neuralfiles-header'>
          {!isCollapsed && (
            <>
              <h3 className="neuralfiles-header">My Files</h3>
              <AddFileButton refreshTrigger={triggerRefresh} />
            </>
          )}
        </div>
        
        <div className="neuralfiles-list">
          {neuralFiles.length === 0 ? (
            !isCollapsed && <p className="no-neuralfiles">No neural files yet</p>
          ) : (
            neuralFiles.map((neuralFile) => {
              // Use breadcrumb data to determine selection instead of pathname
              const isSelected = breadcrumbData?.neuralFile?.id === neuralFile.id;
              return (
                <button
                  key={neuralFile.id}
                  className={`neuralfile-button${isSelected ? ' selected' : ''}`}
                  onClick={() => handleNeuralFileClick(neuralFile)}
                  title={neuralFile.name}
                >
                  {isCollapsed ? (
                    <span className="neuralfile-initial">
                      {getNeuralFileInitial(neuralFile.name)}
                    </span>
                  ) : (
                    <>
                      <span className="neuralfile-name">{neuralFile.name}</span>
                    </>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
});

SideBar.displayName = 'SideBar';

export default SideBar;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import NoteList from '../../Notes/NoteList/NoteList';
import OrderSelector from '../../Notes/NoteList/OrderSelector/OrderSelector';
import Notification from './Notification/Notification';
import PillarsButton from './PillarsButton/PillarsButton';
import TableOfContents from './TableOfContents/TableOfContents';
import Description from './Description/Description';
import './FilePage.css';

export default function FilePage() {
  const { neuralFileId, noteId } = useParams();
  const navigate = useNavigate();
  const { setBreadcrumbData, triggerSidebarRefresh } = useOutletContext();
  const [neuralFile, setNeuralFile] = useState(null);
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isTemporaryFile, setIsTemporaryFile] = useState(false);
  const [noteOrder, setNoteOrder] = useState(null); // Start with null, will be set from stored preference
  const [customOrder, setCustomOrder] = useState([]);
  const [isShowingPillars, setIsShowingPillars] = useState(false);
  const [isTableOfContentsMode, setIsTableOfContentsMode] = useState(false);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Listen for external refresh triggers (like from breadcrumb drops)
  useEffect(() => {
    const handleNoteParentChanged = (event) => {
      console.log('FilePage received noteParentChanged event:', event.detail);
      triggerRefresh();
    };
    
    // Listen for custom refresh events
    window.addEventListener('noteParentChanged', handleNoteParentChanged);
    
    return () => {
      window.removeEventListener('noteParentChanged', handleNoteParentChanged);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        let loadedNeuralFile = null;
        let loadedNote = null;
        
        console.log('🔄 Loading data for neuralFileId:', neuralFileId, 'noteId:', noteId);
        
        // Check if this is a temporary file
        if (neuralFileId && neuralFileId.startsWith('temp_')) {
          setIsTemporaryFile(true);
          setTitle('');
          setDescription('');
          setIsEditingTitle(true);
          setNoteOrder('latest-last'); // Set default for temp files
          setIsTableOfContentsMode(false); // Default off for temp files
          
          setBreadcrumbData({
            neuralFile: { id: neuralFileId, name: '', description: '' },
            note: null
          });
        } else if (neuralFileId) {
          try {
            console.log('📁 Fetching neural file data...');
            const fileResponse = await axios.get(`http://localhost:8001/api/neuralfiles/${neuralFileId}`);
            loadedNeuralFile = fileResponse.data;
            console.log('📁 Neural file loaded:', loadedNeuralFile);
            setNeuralFile(loadedNeuralFile);
            
            // Read the stored note_order preference from the file's JSON
            const storedOrder = loadedNeuralFile.note_order;
            console.log('🔍 Raw note_order from database:', storedOrder);
            console.log('🔍 Type of note_order:', typeof storedOrder);
            console.log('🔍 Truthy check:', !!storedOrder);
            
            if (storedOrder) {
              // File has a saved preference, use it
              console.log('✅ Found stored note order preference:', storedOrder);
              setNoteOrder(storedOrder);
            } else {
              // Old file without preference, default to latest-last
              console.log('❌ No stored preference found, defaulting to latest-last for old file');
              setNoteOrder('latest-last');
            }
            
            // Load table of contents mode preference
            const storedTableMode = loadedNeuralFile.table_of_contents_mode;
            console.log('🔍 Stored table of contents mode:', storedTableMode);
            setIsTableOfContentsMode(storedTableMode || false);
            
            setCustomOrder(loadedNeuralFile.custom_order || []);
            
            if (!noteId) {
              setTitle(loadedNeuralFile.name);
              setDescription(loadedNeuralFile.description || '');
              
              if (loadedNeuralFile.name === 'Untitled') {
                setIsEditingTitle(true);
              }
            }
          } catch (error) {
            console.error('❌ Error loading neural file:', error);
            setNoteOrder('latest-last'); // Set default on error
            setIsTableOfContentsMode(false); // Set default on error
          }
        } else {
          // No neural file ID, set default
          console.log('❌ No neural file ID, setting default');
          setNoteOrder('latest-last');
          setIsTableOfContentsMode(false);
        }
        
        if (noteId) {
          // Load specific note data
          try {
            const noteResponse = await axios.get(`http://localhost:8001/api/notes/${noteId}`);
            loadedNote = noteResponse.data;
            setNote(loadedNote);
            setTitle(loadedNote.title);
            setDescription(loadedNote.description || ''); // Changed from content to description
            
            setBreadcrumbData({
              neuralFile: loadedNeuralFile,
              note: loadedNote
            });
          } catch (error) {
            console.error('Error loading note:', error);
          }
        } else {
          setBreadcrumbData({
            neuralFile: loadedNeuralFile,
            note: null
          });
        }
      } catch (err) {
        console.error('❌ Error in loadData:', err);
        setError(err.message);
        setNoteOrder('latest-last'); // Set default on error
        setIsTableOfContentsMode(false); // Set default on error
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [neuralFileId, noteId, setBreadcrumbData]);

  // ADD: Debug effect to track noteOrder changes
  useEffect(() => {
    console.log('noteOrder state changed to:', noteOrder);
  }, [noteOrder]);

  // Add keyboard event listener for Enter key
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only trigger if not currently editing title and not already creating a note
      if (e.key === 'Enter' && !isEditingTitle && !isCreatingNote) {
        // Don't trigger if user is typing in an input field or contenteditable
        if (e.target.tagName === 'INPUT' || 
            e.target.tagName === 'TEXTAREA' || 
            e.target.contentEditable === 'true') {
          return;
        }
        
        handleCreateNote();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditingTitle, isCreatingNote]);

  // Live update breadcrumb and sidebar as user types
  useEffect(() => {
    if (isTemporaryFile) {
      setBreadcrumbData({
        neuralFile: { 
          id: neuralFileId, 
          name: title || 'New File', 
          description: description 
        },
        note: null
      });
    }
  }, [title, description, isTemporaryFile, neuralFileId, setBreadcrumbData]);

  const handleTitleSave = async () => {
    try {
      if (isTemporaryFile) {
        // Create the actual file in the database
        if (title.trim()) {
          const fileData = {
            name: title.trim(),
            description: description || ''
          };

          const response = await axios.post('http://localhost:8001/api/neuralfiles', fileData);
          const newFile = response.data;
          
          // Update state to reflect the real file
          setNeuralFile(newFile);
          setIsTemporaryFile(false);
          
          // Navigate to the real file URL
          navigate(`/file/${newFile.id}`, { replace: true });
          
          // Update breadcrumb data
          setBreadcrumbData({
            neuralFile: newFile,
            note: null
          });

          // Trigger sidebar refresh to show the new file
          if (triggerSidebarRefresh) {
            triggerSidebarRefresh();
          }
        } else {
          // If title is empty, don't save and go back to home
          navigate('/', { replace: true });
        }
      } else if (noteId) {
        await axios.put(`http://localhost:8001/api/notes/${noteId}/update-title`, {
          title: title
        });
        setNote(prev => ({ ...prev, title }));
        
        setBreadcrumbData({
          neuralFile: neuralFile,
          note: { ...note, title }
        });
      } else if (neuralFileId) {
        await axios.put(`http://localhost:8001/api/neuralfiles/${neuralFileId}`, {
          name: title
        });
        const updatedFile = { ...neuralFile, name: title };
        setNeuralFile(updatedFile);
        
        setBreadcrumbData({
          neuralFile: updatedFile,
          note: null
        });

        // Trigger sidebar refresh for existing file updates
        if (triggerSidebarRefresh) {
          triggerSidebarRefresh();
        }
      }
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Error saving title:', error);
    }
  };

  const handleDescriptionSave = async (newDescriptionBlocks) => {
    try {
      if (isTemporaryFile) {
        // Update local state for temporary file
        setDescription(newDescriptionBlocks);
        return;
      }
      
      if (noteId) {
        // For notes, save as blocks array
        await axios.put(`http://localhost:8001/api/notes/${noteId}/update-content`, {
          description: newDescriptionBlocks
        });
        setNote(prev => ({ ...prev, description: newDescriptionBlocks }));
      } else if (neuralFileId) {
        // For files, save as blocks array
        await axios.put(`http://localhost:8001/api/neuralfiles/${neuralFileId}`, {
          description: newDescriptionBlocks
        });
        setNeuralFile(prev => ({ ...prev, description: newDescriptionBlocks }));
      }
      setDescription(newDescriptionBlocks);
    } catch (error) {
      console.error('Error updating description:', error);
    }
  };

  const handleCreateNote = () => {
    // Don't allow note creation for temporary files
    if (isTemporaryFile) {
      return;
    }
    setIsCreatingNote(true);
  };

  const handleSaveNewNote = (newNote) => {
    setIsCreatingNote(false);
    triggerRefresh();
  };

  const handleCancelNewNote = () => {
    setIsCreatingNote(false);
  };

  const handleOrderChange = async (newOrder) => {
    console.log('🔄 Changing order to:', newOrder);
    console.log('🔄 neuralFileId:', neuralFileId);
    console.log('🔄 isTemporaryFile:', isTemporaryFile);
    
    setNoteOrder(newOrder);
    
    // Update neural file object in memory
    setNeuralFile(prev => ({
      ...prev,
      note_order: newOrder
    }));
    
    // Save preference to backend by updating the file's JSON
    if (!isTemporaryFile && neuralFileId) {
      try {
        console.log('📤 Sending PUT request to update note_order...');
        console.log('📤 PUT URL:', `http://localhost:8001/api/neuralfiles/${neuralFileId}`);
        console.log('📤 PUT data:', { note_order: newOrder });
        
        const response = await axios.put(`http://localhost:8001/api/neuralfiles/${neuralFileId}`, {
          note_order: newOrder
        });
        
        console.log('📥 PUT response status:', response.status);
        console.log('📥 PUT response:', response.data);
        console.log('✅ Note order preference saved to file JSON:', newOrder);
        
        // Immediately verify by fetching the file again
        console.log('🔍 Verifying save by fetching file...');
        const verifyResponse = await axios.get(`http://localhost:8001/api/neuralfiles/${neuralFileId}`);
        console.log('🔍 Verification - file after save:', verifyResponse.data);
        console.log('🔍 Verification - note_order field:', verifyResponse.data.note_order);
        
      } catch (error) {
        console.error('❌ Error saving order preference:', error);
        console.error('❌ Error details:', error.response?.data);
        console.error('❌ Error status:', error.response?.status);
      }
    } else {
      console.log('⏭️ Skipping PUT request - isTemporaryFile:', isTemporaryFile, 'neuralFileId:', neuralFileId);
    }
  };

  const handleCustomOrderChange = async (newCustomOrder) => {
    setCustomOrder(newCustomOrder);
    
    // Update neural file object in memory
    setNeuralFile(prev => ({
      ...prev,
      custom_order: newCustomOrder
    }));
    
    // CLEANED UP: Remove custom mode logic since we removed custom order
  };

  const handleNavigateToTest = () => {
    if (isTemporaryFile) {
      // Save file first if it's temporary
      handleTitleSave().then(() => {
        navigate(`/test/${neuralFileId || neuralFile?.id}`);
      });
    } else {
      navigate(`/test/${neuralFileId}`);
    }
  };

  const handleTogglePillars = () => {
    setIsShowingPillars(prev => !prev);
  };

  const handleToggleTableOfContents = async () => {
    const newMode = !isTableOfContentsMode;
    setIsTableOfContentsMode(newMode);
    
    setNeuralFile(prev => ({
      ...prev,
      table_of_contents_mode: newMode
    }));
    
    if (!isTemporaryFile && neuralFileId) {
      try {
        console.log('📤 Saving table of contents mode to file JSON:', newMode);
        
        await axios.put(`http://localhost:8001/api/neuralfiles/${neuralFileId}`, {
          table_of_contents_mode: newMode
        });
        
        console.log('✅ Table of contents mode preference saved to file JSON:', newMode);
        
      } catch (error) {
        console.error('❌ Error saving table of contents mode preference:', error);
        // Revert on error
        setIsTableOfContentsMode(!newMode);
        setNeuralFile(prev => ({
          ...prev,
          table_of_contents_mode: !newMode
        }));
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="PageNoteDiv">
      
      {/* Title section */}
      <div className="header-container">
        {isEditingTitle ? (
          <input
            className="title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleTitleSave();
              }
            }}
            placeholder="Enter file name..."
            autoFocus
          />
        ) : (
          <h1 
            className="Title clickable-title"
            onClick={() => setIsEditingTitle(true)}
          >
            {title || 'Untitled'}
          </h1>
        )}
        
        {/* Q&A Button */}
        {!isTemporaryFile && !isEditingTitle && (
          <button 
            className="qa-button"
            onClick={handleNavigateToTest}
            title="Test your knowledge with AI-generated questions"
          >
            Q&A
          </button>
        )}
      </div>

      {/* Description section - Simplified props */}
      <div className="description-section">
        <Description
          description={description}
          onSave={handleDescriptionSave}
          placeholder="Add context..."
        />
      </div>
      
      <div className='divider'></div>

      {/* Controls Section */}
      <div className='UnderDivContext'>
        <TableOfContents
          isTableOfContentsMode={isTableOfContentsMode}
          onToggleTableOfContents={handleToggleTableOfContents}
          isTemporaryFile={isTemporaryFile}
        />
        {/* Conditional rendering: Order Selector + Notes List OR Pillars content */}
        {!isTemporaryFile && !isShowingPillars && (
          <>
            <OrderSelector 
              currentOrder={noteOrder}
              onOrderChange={handleOrderChange}
            />
          </>
        )}
        {!isTemporaryFile && (
          <PillarsButton
            neuralFile={neuralFile}
            note={note}
            neuralFileId={neuralFileId}
            isTemporaryFile={isTemporaryFile}
            isShowingPillars={isShowingPillars}
            onTogglePillars={handleTogglePillars}
          />
        )}
      </div>

      {/* Notes List */}
      <>
        {!isTemporaryFile && !isShowingPillars && (
          <NoteList
            refreshTrigger={refreshTrigger}
            hideCompleted={false}
            showPriorityLine={false}
            parentId={noteId}
            neuralFileId={neuralFileId}
            isInNeuralFileContext={!!neuralFileId}
            isCreatingNote={isCreatingNote}
            onCreateNote={handleCreateNote}
            onSaveNewNote={handleSaveNewNote}
            onCancelNewNote={handleCancelNewNote}
            noteOrder={noteOrder}
            customOrder={customOrder}
            onCustomOrderChange={handleCustomOrderChange}
            isTableOfContentsMode={isTableOfContentsMode}
          />
        )}
      </>
    </div>
  );
}
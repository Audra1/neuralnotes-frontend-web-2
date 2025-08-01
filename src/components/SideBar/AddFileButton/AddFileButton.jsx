import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AddFileButton.css';

export default function AddFileButton({ refreshTrigger }) {
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const createTemporaryFile = () => {
    if (isCreating) return; // Prevent double clicks
    
    setIsCreating(true);
    
    try {
      // Generate a temporary ID for the new file
      const tempId = `temp_${Date.now()}`;
      
      // Navigate to the new file page with temporary ID
      navigate(`/file/${tempId}`);
      
    } catch (error) {
      console.error('Error creating temporary file:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <button 
      onClick={createTemporaryFile}
      className='new-file-button'
      disabled={isCreating}
      title="Create New Neural File"
    >
      New File +
    </button>
  );
}
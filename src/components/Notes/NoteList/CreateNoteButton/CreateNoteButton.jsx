import React from 'react';
import './CreateNoteButton.css';

export default function CreateNoteButton({ 
  onCreateClick,
  parentId = null,
  isNeuralFileSidebar = false
}) {
  const getButtonText = () => {
    if (parentId) return 'Add Sub-Note';
    if (isNeuralFileSidebar) return 'Add Note';
    return 'Create Note';
  };

  return (
    <button 
      onClick={onCreateClick}
      className='CreateNoteButton'
    >
      {getButtonText()}
    </button>
  );
}
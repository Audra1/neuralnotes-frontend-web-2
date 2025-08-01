import React from 'react';
import './TableOfContents.css';

export default function TableOfContents({ 
  isTableOfContentsMode = false,
  onToggleTableOfContents,
  isTemporaryFile = false
}) {
  
  const handleToggle = () => {
    if (isTemporaryFile) {
      return;
    }
    onToggleTableOfContents();
  };

  return (
    <button 
      className={`table-of-contents-button ${isTableOfContentsMode ? 'active' : ''}`}
      onClick={handleToggle}
      disabled={isTemporaryFile}
      title={isTemporaryFile ? "Save file first to use table of contents" : "Toggle table of contents view"}
    >
      Table Of Contents
    </button>
  );
}

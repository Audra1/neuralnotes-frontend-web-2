import React, { useState } from 'react';
import './MultipleDeleteModal.css';

export default function MultipleDeleteModal({ 
  isOpen, 
  onClose, 
  onDelete, 
  selectedNotes 
}) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!isOpen) return null;

  const handleDeleteClick = () => {
    if (selectedNotes.length > 0) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmDelete = () => {
    onDelete(selectedNotes);
    setShowConfirmation(false);
    onClose();
  };

  const handleCancelDelete = () => {
    setShowConfirmation(false);
  };

  return (
    <>
      <div className="multiple-delete-modal">
        <div className="modal-content">
          <div className="modal-header">
            <span className="modal-title">
              Select multiple to delete ({selectedNotes.length} selected)
            </span>
            <button 
              className="close-button"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
          <div className="modal-actions">
            <button 
              className="delete-selected-button"
              onClick={handleDeleteClick}
              disabled={selectedNotes.length === 0}
            >
              🗑️ Delete Selected ({selectedNotes.length})
            </button>
          </div>
        </div>
      </div>

      {showConfirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-modal">
            <h3>Delete Notes</h3>
            <p>Are you sure you want to delete {selectedNotes.length} note{selectedNotes.length > 1 ? 's' : ''}?</p>
            <p className="warning-text">This action cannot be undone.</p>
            
            <div className="confirmation-buttons">
              <button 
                className="cancel-button"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-button"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './NavBarThreeDots.css';

const NavBarThreeDots = ({ fileId, fileName, onFileDeleted }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const handleDeleteClick = () => {
    setShowDropdown(false);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`http://localhost:8001/api/neuralfiles/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        setShowDeleteModal(false);
        if (onFileDeleted) {
          onFileDeleted();
        }
        // Navigate to home or files list
        navigate('/');
      } else {
        console.error('Failed to delete file');
        // You might want to show an error message to the user
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      // You might want to show an error message to the user
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  return (
    <div className="navbar-three-dots">
      <button 
        className="three-dots-button"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <span>⋯</span>
      </button>

      {showDropdown && (
        <div className="dropdown-menu">
          <button 
            className="dropdown-item delete-item"
            onClick={handleDeleteClick}
          >
            Delete File
          </button>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Delete File</h3>
            <p>Are you sure you want to delete "{fileName}"?</p>
            <p className="warning-text">This action cannot be undone.</p>
            
            <div className="modal-buttons">
              <button 
                className="cancel-button"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="delete-button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavBarThreeDots;
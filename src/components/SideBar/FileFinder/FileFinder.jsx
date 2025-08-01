import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './FileFinder.css';
import findnotesicon from '../../../assets/findnotesicon.png'; 

export default function FileFinder({ refreshTrigger, isCollapsed }) {
  const [isJoining, setIsJoining] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const joinNeuralFile = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!inviteCode.trim()) {
      setError('Invite code is required');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await axios.post(
        `http://localhost:8001/api/file-invites/join/${inviteCode.trim().toUpperCase()}`
      );
      
      // Success
      setInviteCode('');
      setIsJoining(false);
      refreshTrigger(); // Refresh the neural files list
      
      console.log('Successfully joined neural file:', response.data.neuralfile.name);
      
    } catch (error) {
      console.error('Error joining neural file:', error);
      if (error.response?.status === 404) {
        setError('Invalid invite code');
      } else if (error.response?.status === 400) {
        setError(error.response.data.error || 'Invalid invite code');
      } else if (error.response?.status === 409) {
        setError('You are already a member of this neural file');
      } else {
        setError('Failed to join neural file');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle clicks outside the form
  useEffect(() => {
    function handleClickOutside(event) {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setIsJoining(false);
        setError('');
        setInviteCode('');
      }
    }

    if (isJoining) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isJoining]);

  return (
    <div className="file-finder">
      {isJoining ? (
        <form ref={inputRef} className="join-file-form" onSubmit={joinNeuralFile}>
          <input
            className="invite-code-input"
            type="text"
            placeholder="Enter invite code..."
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            maxLength={8}
            autoFocus
          />
          {error && <div className="error-message">{error}</div>}
          <button 
            className="join-button" 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Neural File'}
          </button>
        </form>
      ) : (
        <button 
          onClick={() => setIsJoining(true)} 
          className="find-file-button"
          title={isCollapsed ? "Search" : undefined}
        >
          <img src={findnotesicon} alt="Find" className="find-file-icon" />
          {isCollapsed ? (
            <span className="plus-icon">+</span>
          ) : (
            "Search"
          )}
        </button>
      )}
    </div>
  );
}
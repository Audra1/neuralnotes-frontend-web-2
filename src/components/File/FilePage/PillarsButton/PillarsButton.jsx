import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PillarsButton.css';

export default function PillarsButton({ 
  neuralFile, 
  note, 
  neuralFileId, 
  isTemporaryFile,
  isShowingPillars,
  onTogglePillars 
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pillars, setPillars] = useState([]);

  // Load cached pillars when component mounts or file changes
  useEffect(() => {
    if (neuralFile && neuralFile.pillars) {
      console.log('🗂️ Loading cached pillars from file:', neuralFile.pillars);
      setPillars(neuralFile.pillars);
    } else {
      setPillars([]); // Clear pillars when switching files
    }
  }, [neuralFileId, neuralFile]);

  const handleTogglePillars = async () => {
    if (isTemporaryFile) {
      return;
    }

    if (!isShowingPillars) {
      // Check if we have cached pillars first
      if (neuralFile?.pillars && neuralFile.pillars.length > 0) {
        console.log('📋 Using cached pillars');
        setPillars(neuralFile.pillars);
      } else {
        // Generate new pillars
        await fetchPillars();
      }
    }
    
    onTogglePillars();
  };

  const fetchPillars = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare context data
      const contextData = {
        page_title: neuralFile?.name || '',
        description_context: neuralFile?.description || '',
        file_id: neuralFileId
      };

      // If we're in a specific note context, include that too
      if (note) {
        contextData.page_title = note.title;
        contextData.description_context = note.description || '';
      }

      console.log('🧠 Generating new pillars for:', contextData.page_title);

      // Use the working AI endpoint directly with better error handling
      const response = await axios.post('http://localhost:8001/api/chat-algorithm/generate-subdomains', contextData, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🎯 Received pillars response:', response.data);

      // Extract pillar names from the response (handle different formats)
      let pillarNames = [];
      if (response.data.subdomains) {
        pillarNames = response.data.subdomains.map(subdomain => 
          typeof subdomain === 'string' ? subdomain : subdomain.name
        );
      } else if (response.data.pillars) {
        pillarNames = response.data.pillars;
      } else {
        // Check if AI failed
        const processingDetails = response.data.processing_details || {};
        if (processingDetails.error && processingDetails.error.includes('AI')) {
          throw new Error('AI service temporarily unavailable. Please check your API configuration.');
        }
        
        // Fallback - create some default pillars based on content
        pillarNames = ['Core Concepts', 'Key Principles', 'Applications'];
      }

      // Filter out error messages and provide user-friendly alternatives
      const cleanPillars = pillarNames
        .filter(pillar => pillar && typeof pillar === 'string')
        .filter(pillar => 
          !pillar.includes('AI Unavailable') && 
          !pillar.includes('System Error') &&
          !pillar.includes('Generic Analysis')
        )
        .map(pillar => pillar.trim())
        .filter(Boolean);

      // If we got AI error pillars or no valid pillars, provide better fallbacks
      if (cleanPillars.length === 0 || pillarNames.some(p => p.includes('AI Unavailable'))) {
        const topicName = contextData.page_title || 'this topic';
        
        // Generate topic-specific fallbacks
        let fallbackPillars = [];
        const topicLower = topicName.toLowerCase();
        
        if (topicLower.includes('fisica') || topicLower.includes('physics')) {
          fallbackPillars = ['Conceptos Fundamentales', 'Leyes Físicas', 'Aplicaciones Prácticas'];
        } else if (topicLower.includes('math')) {
          fallbackPillars = ['Mathematical Foundations', 'Problem Solving', 'Applications'];
        } else {
          fallbackPillars = [`${topicName} Basics`, 'Key Concepts', 'Practical Applications'];
        }
        
        setPillars(fallbackPillars);
        setError('AI analysis unavailable. Using topic-based breakdown. Please check your API configuration.');
      } else {
        setPillars(cleanPillars);
        setError(null); // Clear any previous errors
      }

      // Cache pillars in the file if we have valid ones
      if (neuralFileId && cleanPillars.length > 0 && !cleanPillars.some(p => p.includes('Fundamentals'))) {
        try {
          await axios.put(`http://localhost:8001/api/neuralfiles/${neuralFileId}`, {
            pillars: cleanPillars
          });
          console.log('💾 Pillars cached in file successfully');
        } catch (cacheError) {
          console.warn('Failed to cache pillars:', cacheError);
        }
      }

      console.log('📋 Final pillars:', cleanPillars.length > 0 ? cleanPillars : pillarNames);

    } catch (error) {
      console.error('❌ Error fetching pillars:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to generate pillars. ';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage += 'Request timed out. Please try again.';
      } else if (error.message.includes('AI service')) {
        errorMessage = error.message;
      } else if (error.response?.status === 500) {
        errorMessage += 'Server error. Please try again in a moment.';
      } else if (!navigator.onLine) {
        errorMessage += 'Please check your internet connection.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
      
      // Set meaningful fallback pillars based on available content
      const fallbackPillars = [];
      const topicName = neuralFile?.name || note?.title;
      
      if (topicName) {
        fallbackPillars.push(`${topicName} Overview`);
        fallbackPillars.push('Key Concepts');
        fallbackPillars.push('Applications');
      } else {
        fallbackPillars.push('Core Concepts');
        fallbackPillars.push('Key Principles');
        fallbackPillars.push('Applications');
      }
      
      setPillars(fallbackPillars);
    } finally {
      setLoading(false);
    }
  };

  const renderPillarsList = () => {
    if (loading) {
      return (
        <div className="pillars-loading">
          <h3>Analyzing content and generating conceptual pillars...</h3>
          <p>This may take a moment.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="pillars-error">
          <h3>❌ Error</h3>
          <p>{error}</p>
          <button onClick={fetchPillars} className="retry-button">
            Try Again
          </button>
        </div>
      );
    }

    if (pillars.length === 0) {
      return (
        <div className="pillars-empty">
          <h3> No Pillars Found</h3>
          <p>Add more content to your file to generate conceptual pillars.</p>
        </div>
      );
    }

    return (
      <div className="pillars-list">
        <h3>🎯 Recommended Conceptual Pillars</h3>
        <p className="pillars-description">
          These are the key concepts and topics identified from your content:
        </p>
        <ul className="pillars-items">
          {pillars.map((pillar, index) => (
            <li key={index} className="pillar-item">
              <span className="pillar-icon">📌</span>
              <span className="pillar-name">{pillar}</span>
            </li>
          ))}
        </ul>
        <div className="pillars-footer">
          <p className="pillars-hint">
            💡 These pillars can help you organize your study sessions and identify key learning areas.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="pillars-button-container">
      <button 
        className={`pillars-toggle-button ${isShowingPillars ? 'active' : ''}`}
        onClick={handleTogglePillars}
        disabled={isTemporaryFile}
        title={isTemporaryFile ? "Save file first to generate pillars" : "Toggle conceptual pillars view"}
      >
        {isShowingPillars ? 'Show Notes' : ' Show Pillars'}
      </button>

      {isShowingPillars && (
        <div className="pillars-content">
          {renderPillarsList()}
        </div>
      )}
    </div>
  );
}

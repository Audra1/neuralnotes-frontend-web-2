import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ContextAlgo() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  
  const [fileData, setFileData] = useState(null);
  const [contextData, setContextData] = useState(null);
  const [processedContext, setProcessedContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFileAndProcessContext();
  }, [fileId]);

  const loadFileAndProcessContext = async () => {
    try {
      setLoading(true);
      
      // Load file data
      const fileResponse = await axios.get(`http://localhost:8001/api/neuralfiles/${fileId}`);
      const file = fileResponse.data;
      setFileData(file);
      
      // Load subnotes
      const notesResponse = await axios.get(`http://localhost:8001/api/notes/file/${fileId}`);
      const notes = notesResponse.data;
      
      // Prepare context data
      const contextPayload = {
        page_title: file.name,
        description_context: file.description || '',
      };
      
      // Add subnotes to context
      notes.forEach((note, index) => {
        contextPayload[`subnote_${index + 1}`] = note.title;
      });
      
      setContextData(contextPayload);
      
      // Send to backend for processing
      const processResponse = await axios.post('http://localhost:8001/api/context/process', contextPayload);
      setProcessedContext(processResponse.data);
      
    } catch (error) {
      console.error('❌ Error loading context data:', error);
      setError('Failed to load context. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshContext = () => {
    loadFileAndProcessContext();
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading Context...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate(`/file/${fileId}`)}>
          Back to File
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Context Algorithm Test</h1>
        <button onClick={() => navigate(`/file/${fileId}`)}>
          Back to File
        </button>
      </div>
      
      <button onClick={handleRefreshContext} style={{ marginBottom: '20px' }}>
        Refresh Context
      </button>

      <div style={{ display: 'grid', gap: '20px' }}>
        {/* Original Context Data */}
        <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ color: '#4a9eff', marginBottom: '15px' }}>Original Context Data</h3>
          <pre style={{ 
            backgroundColor: '#1a1a1a', 
            padding: '15px', 
            borderRadius: '4px', 
            overflow: 'auto',
            color: '#fff'
          }}>
            {JSON.stringify(contextData, null, 2)}
          </pre>
        </div>

        {/* Processed Context */}
        {processedContext && (
          <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ color: '#4ade80', marginBottom: '15px' }}>Processed Context Result</h3>
            <pre style={{ 
              backgroundColor: '#1a1a1a', 
              padding: '15px', 
              borderRadius: '4px', 
              overflow: 'auto',
              color: '#fff'
            }}>
              {JSON.stringify(processedContext, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './TestPage.css';

export default function TestPage() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  
  const [fileData, setFileData] = useState(null);
  const [subdomains, setSubdomains] = useState([]);
  const [activeTopics, setActiveTopics] = useState({}); // Each topic has its own chat
  const [currentTopic, setCurrentTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionCounter, setQuestionCounter] = useState(0);
  const messagesEndRef = useRef(null);

  // Load file data and initialize topics
  useEffect(() => {
    loadFileAndInitializeTopics();
  }, [fileId]);

  const loadFileAndInitializeTopics = async () => {
    try {
      setLoading(true);
      
      // Load file data
      const fileResponse = await axios.get(`http://localhost:8001/api/neuralfiles/${fileId}`);
      const file = fileResponse.data;
      setFileData(file);
      
      // Generate subdomains using chat algorithm with proper field names
      const subdomainsResponse = await axios.post('http://localhost:8001/api/chat-algorithm/generate-subdomains', {
        page_title: file.name,  // Map to page_title
        description_context: file.description || '',  // Map to description_context
        file_id: fileId  // Pass file ID to get actual notes as subnote_N
      });
      
      const subdomainData = subdomainsResponse.data;
      const topicList = subdomainData.subdomains?.map(s => s.name) || [];
      setSubdomains(topicList);
      
      // Initialize first topic
      if (topicList.length > 0) {
        const firstTopic = topicList[0];
        setCurrentTopic(firstTopic);
        await initializeTopicChat(firstTopic, file);
      }
      
    } catch (error) {
      console.error('❌ Error loading test data:', error);
      setError('Failed to load test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const initializeTopicChat = async (topic, file) => {
    try {
      // Generate first question for this topic using chat algorithm
      const questionResponse = await axios.post('http://localhost:8001/api/chat-algorithm/generate-single-question', {
        topic: topic,
        context: { 
          file_title: file.name,  // Keep as file_title for context
          description: file.description 
        },
        difficulty: "conceptual",
        is_first_question: true
      });
      
      const questionData = questionResponse.data;
      
      setActiveTopics(prev => ({
        ...prev,
        [topic]: {
          conversationHistory: [{
            type: 'question',
            content: questionData.question,
            timestamp: new Date()
          }],
          currentQuestion: questionData.question,
          questionCount: 1,
          totalScore: 0
        }
      }));
      
    } catch (error) {
      console.error('Error initializing topic chat:', error);
    }
  };

  const handleTopicSwitch = async (newTopic) => {
    setCurrentTopic(newTopic);
    
    // Initialize topic if not already active
    if (!activeTopics[newTopic]) {
      await initializeTopicChat(newTopic, fileData);
    }
  };

  const getCurrentActiveSubdomains = () => {
    if (!currentTopic || !activeTopics[currentTopic]) return [];
    return [currentTopic]; // Current topic is the active subdomain
  };

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeTopics[currentTopic]?.conversationHistory]);

  const handleAnswerSubmit = async () => {
    if (!currentAnswer.trim()) {
      alert('Please provide an answer before proceeding.');
      return;
    }

    setIsSubmitting(true);
    const topicData = activeTopics[currentTopic];
    const currentQuestion = topicData.currentQuestion;

    try {
      // Add user answer to conversation immediately for better UX
      const userMessage = {
        type: 'user_answer',
        content: currentAnswer,
        timestamp: new Date()
      };

      // Update UI immediately with user message
      setActiveTopics(prev => ({
        ...prev,
        [currentTopic]: {
          ...prev[currentTopic],
          conversationHistory: [...prev[currentTopic].conversationHistory, userMessage]
        }
      }));

      // Clear input immediately
      setCurrentAnswer('');

      // Process the answer using chat algorithm
      const reviewResponse = await axios.post('http://localhost:8001/api/chat-algorithm/review-answer', {
        question: currentQuestion,
        user_answer: currentAnswer,
        context: { file_title: fileData.name }
      });

      const review = reviewResponse.data;
      
      // Add feedback message
      const feedbackMessage = {
        type: 'ai_feedback',
        content: {
          feedback: review.feedback,
          score: review.score,
          is_correct: review.is_correct
        },
        timestamp: new Date()
      };

      // Add follow-up question if provided
      let followUpMessage = null;
      if (review.follow_up_question) {
        followUpMessage = {
          type: 'question',
          content: review.follow_up_question,
          timestamp: new Date()
        };
      }

      // Update topic conversation with feedback and follow-up
      setActiveTopics(prev => {
        const currentHistory = prev[currentTopic].conversationHistory;
        const newHistory = [
          ...currentHistory,
          feedbackMessage
        ];
        
        if (followUpMessage) {
          newHistory.push(followUpMessage);
        }

        return {
          ...prev,
          [currentTopic]: {
            ...prev[currentTopic],
            conversationHistory: newHistory,
            currentQuestion: review.follow_up_question || currentQuestion,
            questionCount: prev[currentTopic].questionCount + 1,
            totalScore: prev[currentTopic].totalScore + (review.score || 0)
          }
        };
      });

      setQuestionCounter(prev => prev + 1);
      
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateScore = () => {
    const totalScore = Object.values(activeTopics).reduce((sum, topic) => sum + topic.totalScore, 0);
    const totalQuestions = Object.values(activeTopics).reduce((sum, topic) => sum + topic.questionCount, 0);
    return totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
  };

  const renderSubdomainBar = () => {
    const activeSubdomains = getCurrentActiveSubdomains();
    
    return (
      <div className="subdomain-bar">
        <div className="subdomain-tags">
          {subdomains.map((subdomain, index) => (
            <span 
              key={index}
              className={`subdomain-tag ${activeSubdomains.includes(subdomain) ? 'active' : 'inactive'}`}
            >
              {subdomain}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderConversationMessage = (message, index) => {
    switch (message.type) {
      case 'question':
        return (
          <div key={index} className="message question-message">
            <div className="message-header">
              <span className="difficulty-badge">{message.content.difficulty || 'conceptual'}</span>
              <span className="subdomain-badge">{message.content.primary_subdomain || currentTopic}</span>
            </div>
            <div className="message-content">
              <h3>{message.content.question}</h3>
            </div>
          </div>
        );

      case 'user_answer':
        return (
          <div key={index} className="message user-message">
            <div className="message-content">
              <p>{message.content}</p>
            </div>
          </div>
        );

      case 'ai_feedback':
        const feedback = message.content;
        return (
          <div key={index} className="message feedback-message">
            <div className="message-content">
              <div className={`score-indicator ${feedback.is_correct ? 'correct' : 'learning'}`}>
                {feedback.is_correct ? '✓ Good work!' : '→ Let\'s learn together'} 
                <span className="score">Score: {feedback.score || 0}/5</span>
              </div>
              <div className="feedback-text">
                <p>{feedback.feedback}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="test-page">
        <div className="loading-container">
          <h2>Loading Test...</h2>
          {subdomains.length > 0 && renderSubdomainBar()}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="test-page">
        <div className="error-container">
          <h2>Cannot Generate Test</h2>
          <p>{error}</p>
          <button onClick={() => navigate(`/file/${fileId}`)}>
            Back to File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Topic Tabs */}
      <div className="topic-tabs">
        {subdomains.map(topic => (
          <button
            key={topic}
            className={`topic-tab ${currentTopic === topic ? 'active' : ''}`}
            onClick={() => handleTopicSwitch(topic)}
          >
            {topic}
            {activeTopics[topic] && (
              <span className="question-count">({activeTopics[topic].questionCount})</span>
            )}
          </button>
        ))}
      </div>

      {/* Chat Header */}
      <div className="chat-header">
        <h1>{fileData?.name} - {currentTopic}</h1>
        <div className="header-right">
          <div className="question-counter">
            Questions Answered: {questionCounter}
          </div>
          <button 
            className="exit-button"
            onClick={() => navigate(`/file/${fileId}`)}
          >
            Exit Test
          </button>
        </div>
      </div>

      {/* Chat Messages - This div handles its own scrolling */}
      <div className="chat-messages">
        {activeTopics[currentTopic]?.conversationHistory.map((message, index) => 
          renderConversationMessage(message, index)
        )}
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input - Positioned absolutely within this container */}
      {!loading && currentTopic && (
        <div className="chat-input-container">
          <div className="text-input-bubble">
            <textarea
              className="chat-textarea"
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows="1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (currentAnswer.trim() && !isSubmitting) {
                    handleAnswerSubmit();
                  }
                }
              }}
            />
            <button 
              className="send-button"
              onClick={handleAnswerSubmit}
              disabled={!currentAnswer.trim() || isSubmitting}
            >
              {isSubmitting ? '⏳' : '→'}
            </button>
          </div>
        </div>
      )}

      {/* Subdomain Bar */}
      <div className="subdomain-bar">
        <div className="subdomain-tags">
          {subdomains.map((subdomain, index) => (
            <span 
              key={index}
              className={`subdomain-tag ${getCurrentActiveSubdomains().includes(subdomain) ? 'active' : 'inactive'}`}
            >
              {subdomain}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
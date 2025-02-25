import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import ReadingPane from './ReadingPane';
import './pdfjs-worker';

const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://reading-expert-backend.vercel.app/api/qa'
  : 'http://localhost:3001/api/qa';

function App() {
  console.log('App component rendering');
  
  const [context, setContext] = useState("");
  const [currentPageText, setCurrentPageText] = useState("");
  const [inputQuestion, setInputQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatWindowRef = useRef(null);

  const getConversationHistory = () => {
    // Only include messages up to a reasonable limit
    const recentMessages = chatMessages.slice(-10); // Keep last 10 messages
    return recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  };

  const handleContextUpdate = useCallback((newContext, pageText) => {
    console.log('Context update:', { newContext, pageText });
    setContext(newContext);
    setCurrentPageText(pageText);
    
    // Optional: Add feedback when context is cleared
    if (!newContext && !pageText) {
      console.log('Context cleared');
    }
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuestion.trim()) return;
    
    // Add user message to chat immediately
    const userMessage = { role: 'user', content: inputQuestion };
    setChatMessages(prev => [...prev, userMessage]);
    
    const questionToSend = inputQuestion;
    setInputQuestion("");
    setLoading(true);

    try {
      const contextToUse = context || currentPageText;
      
      if (!contextToUse) {
        throw new Error('No context available');
      }

      console.log('Sending request with:', {
        context: contextToUse.slice(0, 100) + '...', // Log preview of context
        question: questionToSend,
        historyLength: getConversationHistory().length
      });
      
      const response = await axios.post(API_URL, {
        context: contextToUse,
        question: questionToSend,
        conversationHistory: getConversationHistory()
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Response history length:', response.data.conversationHistory.length);
      
      // Verify the response format before updating
      if (Array.isArray(response.data.conversationHistory)) {
        setChatMessages(response.data.conversationHistory);
      } else {
        // If response format is unexpected, just append the answer
        const assistantMessage = {
          role: 'assistant',
          content: response.data.answer || response.data.content
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error("Error fetching answer:", err);
      const errorMsg = { 
        role: 'assistant', 
        content: err.message === 'No context available' 
          ? "Please upload a PDF or select some text as context before asking questions."
          : "Sorry, there was an error fetching the answer. Please try again."
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up any resources if needed
      setChatMessages([]);
    };
  }, []);

  return (
    <div style={{
      height: '100vh',
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden'
    }}>
      <header style={{
        background: 'white',
        color: '#1a202c',
        padding: '15px',
        textAlign: 'center',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        position: 'relative',
        zIndex: 10
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '22px',
          fontWeight: '600'
        }}>Reading with an Expert</h1>
      </header>
      <div style={{
        display: 'flex',
        gap: '24px',
        padding: '24px',
        flex: 1,
        maxWidth: '1600px',
        margin: '0 auto',
        width: '100%',
        height: 'calc(100vh - 70px)',
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          minWidth: 0,
          maxWidth: '50%',
          height: '100%',
          overflow: 'hidden'
        }}>
          <ReadingPane updateContext={handleContextUpdate} />
        </div>
        <div style={{
          flex: 1,
          minWidth: 0,
          maxWidth: '50%',
          height: '100%',
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <h2 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px', 
            color: '#1a202c',
            fontWeight: '600',
            flexShrink: 0
          }}>Chat Panel</h2>
          <div 
            ref={chatWindowRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '8px',
              marginBottom: '20px'
            }}
          >
            {chatMessages.map((msg, index) => (
              <div 
                key={index} 
                style={{
                  padding: '12px 16px',
                  marginBottom: '12px',
                  borderRadius: '12px',
                  background: msg.role === 'user' ? '#3b82f6' : 'white',
                  color: msg.role === 'user' ? 'white' : '#1a202c',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none'
                }}
              >
                {msg.role === 'assistant' ? (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                ) : (
                  <p style={{margin: 0, fontSize: '15px'}}>{msg.content}</p>
                )}
              </div>
            ))}
            {loading && (
              <div style={{
                textAlign: 'center',
                color: '#64748b',
                padding: '12px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                Thinking...
              </div>
            )}
          </div>
          <form 
            onSubmit={handleSendMessage} 
            style={{
              display: 'flex', 
              gap: '12px',
              flexShrink: 0,
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}
          >
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Enter your question..."
              style={{
                flex: 1,
                padding: '10px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '15px',
                background: 'white',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                ':focus': {
                  borderColor: '#3b82f6'
                }
              }}
            />
            <button 
              type="submit"
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                transition: 'background-color 0.2s ease',
                ':hover': {
                  background: '#2563eb'
                }
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;

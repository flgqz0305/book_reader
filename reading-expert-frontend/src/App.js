import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReadingPane from './ReadingPane';
import './App.css';

const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://reading-expert-backend.vercel.app/api/qa'
  : 'http://localhost:3001/api/qa';

function App() {
  const defaultText = "Enter your reading text here. You can edit this text and highlight any section to set it as the context for your questions.";
  const [readingText, setReadingText] = useState(defaultText);
  const [context, setContext] = useState(defaultText);
  const [inputQuestion, setInputQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatWindowRef = useRef(null);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuestion.trim()) return;

    const userMessage = { role: 'user', content: inputQuestion };
    setChatMessages(prev => [...prev, userMessage]);
    const questionToSend = inputQuestion;
    setInputQuestion("");
    setLoading(true);

    try {
      const response = await axios.post(API_URL, {
        context,
        question: questionToSend,
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const answer = response.data.answer;
      const assistantMessage = { role: 'assistant', content: answer };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Error fetching answer:", err);
      console.log("Error details:", err.response?.data);
      const errorMsg = { role: 'assistant', content: "Sorry, there was an error fetching the answer." };
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

  return (
    <div className="App">
      <header>
        <h1>Reading with an Expert</h1>
      </header>
      <div className="container">
        <ReadingPane 
          readingText={readingText} 
          updateReadingText={setReadingText} 
          updateContext={setContext} 
        />
        <div className="chat-panel">
          <h2>Chat Panel</h2>
          <div className="chat-window" ref={chatWindowRef}>
            {chatMessages.map((msg, index) => (
              <div key={index} className={`chat-bubble ${msg.role}`}>
                <p>{msg.content}</p>
              </div>
            ))}
            {loading && <p className="loading">Loading...</p>}
          </div>
          <div className="chat-input-container">
            <form onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Enter your question"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
              />
              <button type="submit">Send</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

import React, { useState, useRef } from 'react';
import './ReadingPane.css';

const ReadingPane = ({ readingText, updateReadingText, updateContext }) => {
  const [selectedText, setSelectedText] = useState("");
  const textRef = useRef(null);

  const handleMouseUp = () => {
    const selection = window.getSelection().toString().trim();
    if (selection) {
      setSelectedText(selection);
    }
  };

  const handleSetContext = () => {
    updateContext(selectedText);
    // Don't clear the selected text
    // setSelectedText("");
  };

  const handleInput = (e) => {
    updateReadingText(e.target.innerText);
  };

  return (
    <div className="reading-pane">
      <h2>Reading Panel</h2>
      <div
        className="document-text"
        contentEditable
        onInput={handleInput}
        onMouseUp={handleMouseUp}
        ref={textRef}
        suppressContentEditableWarning={true}
      >
        {readingText}
      </div>
      <div className="selection-bar">
        <span className="selected-preview">
          {selectedText 
            ? `Selected: "${selectedText}"`
            : "Select text to set as context..."}
        </span>
        <button 
          onClick={handleSetContext}
          disabled={!selectedText}
          className={!selectedText ? 'disabled' : ''}
        >
          Set as Context
        </button>
      </div>
    </div>
  );
};

export default ReadingPane;

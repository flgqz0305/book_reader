import React, { useState, useRef, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import './ReadingPane.css';

// Set worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const options = {
  cMapUrl: 'cmaps/',
  standardFontDataUrl: 'standard_fonts/',
};

const ReadingPane = ({ updateContext }) => {
  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedText, setSelectedText] = useState("");
  const [currentPageText, setCurrentPageText] = useState("");
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(URL.createObjectURL(file));
      setPageNumber(1);
      setSelectedText("");
      setCurrentPageText("");
    } else {
      alert("Please upload a valid PDF file");
    }
  };

  const onPageLoadSuccess = useCallback(async (page) => {
    try {
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join(' ');
      setCurrentPageText(text);
      
      // If no specific selection, automatically use page text as context
      if (!selectedText) {
        console.log('Setting current page as context:', text);
        updateContext(text, text);
      }
    } catch (error) {
      console.error('Error extracting page text:', error);
    }
  }, [selectedText, updateContext]);

  const handleMouseUp = useCallback((e) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text) {
        console.log('Selected text:', text);
        setSelectedText(text);
      }
    } catch (error) {
      console.error('Error in text selection:', error);
    }
  }, []);

  const handleSetContext = useCallback(() => {
    try {
      const textToUse = selectedText || currentPageText;
      
      if (!textToUse) {
        console.warn('No text available for context');
        return;
      }

      console.log('Setting context:', textToUse);
      
      // Ensure the text is properly encoded
      const sanitizedText = textToUse
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .trim();

      // Pass both selected text and current page text
      updateContext(sanitizedText, currentPageText);
      
      // Visual feedback
      const button = document.querySelector('.context-button');
      if (button) {
        const originalText = button.textContent;
        const originalBackground = button.style.background;
        
        button.textContent = selectedText ? "Selection Set!" : "Page Set!";
        button.style.background = '#2ecc71';
        
        setTimeout(() => {
          button.textContent = "Set as Context";
          button.style.background = originalBackground;
        }, 1000);
      }
    } catch (error) {
      console.error('Error setting context:', error);
      alert('Failed to set context. Please try again.');
    }
  }, [selectedText, currentPageText, updateContext]);

  // Update page number handler to clear selection
  const handlePageChange = useCallback((newPage) => {
    setPageNumber(newPage);
    setSelectedText(""); // Clear selection when changing pages
  }, []);

  return (
    <div className="reading-pane" style={{
      height: '100%',
      background: 'white',
      padding: '20px 20px 15px 20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        flexShrink: 0 // Prevent header from shrinking
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#2c3e50' }}>Reading Panel</h2>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current.click()}
          style={{
            padding: '8px 16px',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Upload PDF
        </button>
      </div>

      <div
        ref={containerRef}
        className="pdf-container"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '15px',
          border: '1px solid #e1e1e1',
          borderRadius: '4px',
          marginBottom: '15px',
          background: '#f8f9fa'
        }}
      >
        {pdfFile ? (
          <>
            <Document
              file={pdfFile}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              options={options}
              loading={<div>Loading PDF...</div>}
              error={<div>Error loading PDF!</div>}
            >
              <div onMouseUp={handleMouseUp}>
                <Page 
                  pageNumber={pageNumber} 
                  width={Math.min(800, window.innerWidth - 100)}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading={<div>Loading page...</div>}
                  className="pdf-page"
                  onLoadSuccess={onPageLoadSuccess}
                />
              </div>
            </Document>
            <div style={{
              position: 'sticky',
              bottom: '20px',
              background: 'white',
              padding: '10px',
              borderRadius: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              zIndex: 1 // Ensure it's above the PDF
            }}>
              <button
                onClick={() => handlePageChange(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1}
                style={{
                  padding: '5px 10px',
                  background: pageNumber <= 1 ? '#ccc' : '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              <span>
                Page {pageNumber} of {numPages}
              </span>
              <button
                onClick={() => handlePageChange(Math.min(numPages, pageNumber + 1))}
                disabled={pageNumber >= numPages}
                style={{
                  padding: '5px 10px',
                  background: pageNumber >= numPages ? '#ccc' : '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: pageNumber >= numPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#666'
          }}>
            <p>No PDF uploaded yet</p>
            <p>Click "Upload PDF" to get started</p>
          </div>
        )}
      </div>

      <div className="selection-bar" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px',
        background: '#f8f9fa',
        borderRadius: '4px',
        fontSize: '14px',
        color: '#666',
        flexShrink: 0,
        marginTop: 0
      }}>
        <span className="selected-preview" style={{
          flex: 1,
          marginRight: '10px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {selectedText 
            ? `Selected: "${selectedText.slice(0, 50)}${selectedText.length > 50 ? '...' : ''}"`
            : currentPageText
              ? "Click 'Set as Context' to use current page"
              : "Select text or use current page as context..."}
        </span>
        <div style={{ 
          display: 'flex', 
          gap: '8px' 
        }}>
          <button 
            className="context-button"
            onClick={handleSetContext}
            disabled={!currentPageText && !selectedText}
            style={{
              padding: '8px 16px',
              background: (currentPageText || selectedText) ? '#3b82f6' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: (currentPageText || selectedText) ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s ease'
            }}
          >
            Set as Context
          </button>
          <button 
            onClick={() => {
              setSelectedText("");
              setCurrentPageText("");
              updateContext("", "");
            }}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s ease'
            }}
          >
            Clear Context
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadingPane;

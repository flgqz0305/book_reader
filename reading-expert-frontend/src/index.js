import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

window.onload = () => {
  console.log('Window loaded');
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
    console.log('App rendered');
  } else {
    console.error('Root element not found');
  }
};

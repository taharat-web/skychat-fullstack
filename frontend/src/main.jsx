import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#202C33',
            color: '#E9EDEF',
            border: '1px solid #2A3942',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#06CF9C', secondary: '#0B141A' } },
          error: { iconTheme: { primary: '#F15C6D', secondary: '#0B141A' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);

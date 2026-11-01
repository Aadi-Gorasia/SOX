// client/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/themes.css'; 
import App from './App';
import './responsive.css';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
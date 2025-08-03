// client/src/layouts/MainAppLayout.js
import React from 'react';
import Sidebar from '../components/Sidebar';
import './MainAppLayout.css';

const MainAppLayout = ({ children }) => {
  return (
    <div className="main-app-layout">
      <main className="main-content-area">
        {children}
      </main>
    </div>
  );
};

export default MainAppLayout;
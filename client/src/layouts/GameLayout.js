// client/src/layouts/GameLayout.js
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const GameLayout = () => {
  return (
    // This uses your .app-layout class from App.css
    <div className="app-layout">
      <Sidebar />
      <Outlet />
    </div>
  );
};

export default GameLayout;
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './GameLayout.css'; // We will create/use this small file

const GameLayout = () => {
  return (
    <div className="game-layout-wrapper">
      <Sidebar />
      <main className="game-layout-main">
        <Outlet />
      </main>
    </div>
  );
};

export default GameLayout;
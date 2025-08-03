// client/src/layouts/DashboardLayout.js
import React from 'react';
import Sidebar from '../components/Sidebar';
import DashboardPage from '../pages/DashboardPage';
import '../App.css';

const DashboardLayout = () => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <DashboardPage />
    </div>
  );
};
export default DashboardLayout;
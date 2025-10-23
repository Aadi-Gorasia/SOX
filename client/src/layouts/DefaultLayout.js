// client/src/layouts/DefaultLayout.js

import React from 'react';
import { Outlet } from 'react-router-dom'; // <--- 1. IMPORT IT
import Navbar from '../components/Navbar'; // Assuming you have a Navbar

const DefaultLayout = () => {
  return (
    <>
      <Navbar />
      <main className="page-container">
        {/* 2. USE IT HERE */}
        {/* This is where pages like Dashboard, Profile, etc. will be rendered */}
        <Outlet />
      </main>
    </>
  );
};

export default DefaultLayout;
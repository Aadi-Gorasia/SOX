import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Load from local storage or default to 'arcade'
  const [theme, setTheme] = useState(localStorage.getItem('site-theme') || 'arcade');

  useEffect(() => {
    // 1. Save to local storage
    localStorage.setItem('site-theme', theme);
    
    // 2. Apply to the actual HTML document so it affects ALL pages
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
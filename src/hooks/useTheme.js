import { useState, useEffect } from 'react';

const THEMES = ['dark', 'light', 'amoled'];

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('pinboard_theme') || 'dark'
  );

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes
    root.classList.remove('dark', 'light', 'amoled');
    // Add current theme
    root.classList.add(theme);
    
    // Set meta theme-color for PWA status bar
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) {
      meta.content = theme === 'light' ? '#ffffff'
        : theme === 'amoled' ? '#000000' : '#0a0f1a';
    }
    
    localStorage.setItem('pinboard_theme', theme);
  }, [theme]);

  return { theme, setTheme, THEMES };
}

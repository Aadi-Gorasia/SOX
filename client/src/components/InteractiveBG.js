import React, { useContext, useEffect, useRef } from 'react';
import { ThemeContext } from '../context/ThemeContext';

const InteractiveBG = () => {
  const canvasRef = useRef(null);
  const { preferences } = useContext(ThemeContext);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preferences.backgroundAnimations || preferences.reducedMotion) return undefined;
    const ctx = canvas.getContext('2d');
    let mouse = { x: -1000, y: -1000 };
    let frameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    const trackMouse = event => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', trackMouse);

    resize();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const spacing = 24; // Distance between bulbs
      const radius = 1.5; // Size of bulb
      
      for (let x = spacing / 2; x < canvas.width; x += spacing) {
        for (let y = spacing / 2; y < canvas.height; y += spacing) {
          const dx = mouse.x - x;
          const dy = mouse.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 120; // Radius of light
          
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);

          if (dist < maxDist) {
            // Bright White (Titanium) when close
            const proximity = 1 - dist / maxDist;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + proximity * 0.9})`;
            ctx.shadowBlur = proximity * 12;
            ctx.shadowColor = "white";
          } else {
            // Muted Steel by default
            ctx.fillStyle = "#282828";
            ctx.shadowBlur = 0;
          }
          
          ctx.fill();
        }
      }
      frameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', trackMouse);
      cancelAnimationFrame(frameId);
    };
  }, [preferences.backgroundAnimations, preferences.reducedMotion]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        zIndex: 0, 
        background: 'transparent',
        display: preferences.backgroundAnimations && !preferences.reducedMotion ? 'block' : 'none'
      }} 
    />
  );
};

export default InteractiveBG;
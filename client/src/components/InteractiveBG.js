import React, { useContext, useEffect, useRef } from 'react';
import { ThemeContext } from '../context/ThemeContext';

const InteractiveBG = () => {
  const canvasRef = useRef(null);
  const { preferences, theme } = useContext(ThemeContext);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preferences.backgroundAnimations || preferences.reducedMotion) return undefined;
    const ctx = canvas.getContext('2d');
    const styles = window.getComputedStyle(document.documentElement);
    const dotColor = styles.getPropertyValue('--color-border').trim();
    const accentColor = styles.getPropertyValue('--color-primary').trim();
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

      const spacing = 28;
      const radius = 1.2;

      for (let x = spacing / 2; x < canvas.width; x += spacing) {
        for (let y = spacing / 2; y < canvas.height; y += spacing) {
          const dx = mouse.x - x;
          const dy = mouse.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 120;

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);

          if (dist < maxDist) {
            const proximity = 1 - dist / maxDist;
            ctx.globalAlpha = 0.08 + proximity * 0.45;
            ctx.fillStyle = accentColor;
            ctx.shadowBlur = proximity * 8;
            ctx.shadowColor = accentColor;
          } else {
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = dotColor;
            ctx.shadowBlur = 0;
          }

          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      frameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', trackMouse);
      cancelAnimationFrame(frameId);
    };
  }, [preferences.backgroundAnimations, preferences.reducedMotion, theme]);

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
import React, { useEffect, useRef } from 'react';

const InteractiveBG = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

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
      requestAnimationFrame(draw);
    };

    draw();
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        zIndex: 0, 
        background: '#080808' 
      }} 
    />
  );
};

export default InteractiveBG;
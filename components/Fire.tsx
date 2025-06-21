import React, { useState, useEffect, useRef } from 'react';

// Define the particle type
interface Particle {
  id: number;
  delay: number;
  duration: number;
  x: number;
  size: number;
}

const FireEmoji = () => {
  const fireElementRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  
  useEffect(() => {
    // Generate random particles
    const newParticles = [];
    for (let i = 0; i < 6; i++) {
      newParticles.push({
        id: i,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
        x: Math.random() * 40 - 20,
        size: 0.3 + Math.random() * 0.4
      });
    }
    setParticles(newParticles);
  }, []);

  return (
    <div className="fire-container">
      {/* Main fire emoji */}
      <div 
        className={`fire-emoji ${isHovered ? 'intense' : ''}`}
        ref={fireElementRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="img" 
        aria-label="animated fire"
      >
        🔥
      </div>
      
      {/* Floating spark particles */}
      {particles.map((particle) => (
        <div 
          key={particle.id}
          className="particle"
          style={{
            '--delay': `${particle.delay}s`,
            '--duration': `${particle.duration}s`,
            '--x-offset': `${particle.x}px`,
            '--scale': particle.size,
          }}
        >
          ✨
        </div>
      ))}
      
      {/* Heat wave effect */}
      <div className="heatwave"></div>
      
      <style jsx>{`
        .fire-container {
          position: relative;
          display: inline-block;
          margin: 50px;
          filter: drop-shadow(0 0 20px rgba(255, 100, 0, 0.6));
        }
        
        .fire-emoji {
          font-size: 4rem;
          display: inline-block;
          cursor: pointer;
          transform-origin: bottom center;
          position: relative;
          z-index: 2;
          
          animation: 
            flicker 0.5s ease-in-out infinite alternate,
            dance 3s ease-in-out infinite,
            glow 2s ease-in-out infinite alternate;
        }
        
        .fire-emoji.intense {
          animation: 
            intense-flicker 0.2s ease-in-out infinite alternate,
            intense-dance 1s ease-in-out infinite,
            intense-glow 1s ease-in-out infinite alternate;
        }
        
        .particle {
          position: absolute;
          font-size: 0.8rem;
          pointer-events: none;
          left: 50%;
          bottom: 20%;
          transform: translate(-50%, 0) scale(var(--scale));
          opacity: 0;
          z-index: 1;
          
          animation: float var(--duration) ease-out infinite var(--delay);
        }
        
        .heatwave {
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 30px;
          background: linear-gradient(
            45deg,
            rgba(255, 100, 0, 0.3),
            rgba(255, 200, 0, 0.2),
            rgba(255, 100, 0, 0.3)
          );
          border-radius: 50%;
          filter: blur(8px);
          
          animation: heatwave 1.5s ease-in-out infinite alternate;
        }
        
        /* Fire flicker animation */
        @keyframes flicker {
          0% { 
            transform: scale(1) rotate(-1deg);
            filter: brightness(1) hue-rotate(0deg);
          }
          100% { 
            transform: scale(1.05) rotate(1deg);
            filter: brightness(1.2) hue-rotate(10deg);
          }
        }
        
        @keyframes intense-flicker {
          0% { 
            transform: scale(0.95) rotate(-2deg);
            filter: brightness(0.9) hue-rotate(-5deg);
          }
          100% { 
            transform: scale(1.15) rotate(2deg);
            filter: brightness(1.4) hue-rotate(15deg);
          }
        }
        
        /* Dancing motion */
        @keyframes dance {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          25% { transform: translateY(-3px) rotate(0deg); }
          50% { transform: translateY(-2px) rotate(1deg); }
          75% { transform: translateY(-4px) rotate(0deg); }
        }
        
        @keyframes intense-dance {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          25% { transform: translateY(-8px) rotate(1deg); }
          50% { transform: translateY(-5px) rotate(2deg); }
          75% { transform: translateY(-10px) rotate(-1deg); }
        }
        
        /* Glowing effect */
        @keyframes glow {
          0% { 
            text-shadow: 
              0 0 5px rgba(255, 100, 0, 0.8),
              0 0 10px rgba(255, 100, 0, 0.6),
              0 0 15px rgba(255, 100, 0, 0.4);
          }
          100% { 
            text-shadow: 
              0 0 10px rgba(255, 150, 0, 1),
              0 0 20px rgba(255, 100, 0, 0.8),
              0 0 30px rgba(255, 100, 0, 0.6);
          }
        }
        
        @keyframes intense-glow {
          0% { 
            text-shadow: 
              0 0 10px rgba(255, 100, 0, 1),
              0 0 20px rgba(255, 100, 0, 0.8),
              0 0 30px rgba(255, 50, 0, 0.6);
          }
          100% { 
            text-shadow: 
              0 0 20px rgba(255, 200, 0, 1),
              0 0 40px rgba(255, 100, 0, 1),
              0 0 60px rgba(255, 0, 0, 0.8);
          }
        }
        
        /* Floating particles */
        @keyframes float {
          0% {
            opacity: 0;
            transform: translate(calc(-50% + var(--x-offset)), 0) scale(var(--scale)) rotate(0deg);
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--x-offset)), -80px) scale(calc(var(--scale) * 0.5)) rotate(180deg);
          }
        }
        
        /* Heat wave effect */
        @keyframes heatwave {
          0% {
            transform: translateX(-50%) scaleX(1) scaleY(1);
            opacity: 0.3;
          }
          100% {
            transform: translateX(-50%) scaleX(1.2) scaleY(0.8);
            opacity: 0.6;
          }
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
          .fire-emoji {
            font-size: 3rem;
          }
          
          .particle {
            font-size: 0.6rem;
          }
        }
      `}</style>
    </div>
  );
};

export default FireEmoji;
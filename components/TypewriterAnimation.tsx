import React from 'react';

const TypewriterAnimation = () => {
  return (
    <div className="flex justify-center py-8 bg-gray-50">
      <div className="text-center">
        {/* Typewriter Container */}
        <div className="relative group cursor-pointer transition-transform duration-300 typewriter-container">
          
          {/* Main typewriter - scaled down */}
          <div className="relative mx-auto" style={{ width: '240px', height: '180px' }}>
            
            {/* Typewriter body */}
            <div 
              className="absolute bottom-0 left-1.5 rounded-t-2xl rounded-b-lg border-2 border-black shadow-2xl"
              style={{
                width: '228px',
                height: '120px',
                background: 'linear-gradient(145deg, #4a4a4a, #2a2a2a)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.5)'
              }}
            />
            
            {/* Base */}
            <div 
              className="absolute bottom-0 left-0 w-full rounded-lg shadow-lg"
              style={{
                height: '12px',
                background: 'linear-gradient(145deg, #333, #111)',
                bottom: '-6px'
              }}
            />
            
            {/* Feet */}
            <div className="absolute bg-black rounded w-3 h-2 bottom-0 left-8" style={{ bottom: '-9px' }} />
            <div className="absolute bg-black rounded w-3 h-2 bottom-0 right-8" style={{ bottom: '-9px' }} />
            
            {/* Paper and carriage area */}
            <div className="absolute w-full carriage" style={{ top: '21px' }}>
              
              {/* Paper guide */}
              <div 
                className="relative left-1/2 transform -translate-x-1/2 rounded shadow-inner"
                style={{
                  width: '168px',
                  height: '9px',
                  background: 'linear-gradient(145deg, #333, #111)'
                }}
              />
              
              {/* Paper */}
              <div 
                className="absolute left-1/2 transform -translate-x-1/2 bg-white rounded-t border border-gray-300 shadow-lg paper"
                style={{
                  width: '150px',
                  height: '108px',
                  top: '-9px'
                }}
              >
                {/* Paper lines */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 11px)'
                  }}
                />
                
                {/* Blinking cursor */}
                <div 
                  className="absolute bg-black cursor"
                  style={{
                    top: '12px',
                    left: '12px',
                    width: '1px',
                    height: '8px'
                  }}
                />
              </div>
            </div>
            
            {/* Keyboard area */}
            <div 
              className="absolute left-1/2 transform -translate-x-1/2 rounded-lg border-2 border-black"
              style={{
                width: '192px',
                height: '72px',
                bottom: '18px',
                background: 'linear-gradient(145deg, #555, #333)'
              }}
            >
              
              {/* Top row of keys */}
              <div className="flex justify-center mt-1.5 gap-0.5">
                {[...Array(10)].map((_, i) => (
                  <div 
                    key={`top-${i}`}
                    className="w-3 h-3 rounded-full border border-black keys bg-gray-200 shadow-sm"
                    style={{
                      animationDelay: `${i * 50}ms`,
                      background: 'linear-gradient(145deg, #e0e0e0, #b0b0b0)'
                    }}
                  />
                ))}
              </div>
              
              {/* Middle row of keys */}
              <div className="flex justify-center mt-1.5 gap-0.5">
                {[...Array(9)].map((_, i) => (
                  <div 
                    key={`mid-${i}`}
                    className="w-3 h-3 rounded-full border border-black keys bg-gray-200 shadow-sm"
                    style={{
                      animationDelay: `${(i + 10) * 50}ms`,
                      background: 'linear-gradient(145deg, #e0e0e0, #b0b0b0)'
                    }}
                  />
                ))}
              </div>
              
              {/* Bottom row with spacebar */}
              <div className="flex justify-center mt-1.5 gap-0.5 items-center">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={`bot-${i}`}
                    className="w-3 h-3 rounded-full border border-black keys bg-gray-200 shadow-sm"
                    style={{
                      animationDelay: `${(i + 19) * 50}ms`,
                      background: 'linear-gradient(145deg, #e0e0e0, #b0b0b0)'
                    }}
                  />
                ))}
                
                {/* Spacebar */}
                <div 
                  className="border border-black keys bg-gray-200 shadow-sm"
                  style={{
                    width: '48px',
                    height: '12px',
                    borderRadius: '6px',
                    background: 'linear-gradient(145deg, #e0e0e0, #b0b0b0)',
                    animationDelay: '1100ms'
                  }}
                />
                
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={`bot2-${i}`}
                    className="w-3 h-3 rounded-full border border-black keys bg-gray-200 shadow-sm"
                    style={{
                      animationDelay: `${(i + 22) * 50}ms`,
                      background: 'linear-gradient(145deg, #e0e0e0, #b0b0b0)'
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Type mechanism */}
            <div 
              className="absolute bg-black mechanism"
              style={{
                bottom: '96px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '2px',
                height: '18px'
              }}
            />
            
            {/* Return lever */}
            <div 
              className="absolute rounded-xl border-2 border-black shadow-md lever"
              style={{
                width: '18px',
                height: '48px',
                right: '12px',
                top: '36px',
                background: 'linear-gradient(145deg, #666, #333)'
              }}
            >
              <div 
                className="absolute left-1/2 transform -translate-x-1/2 rounded-full border border-black"
                style={{
                  top: '3px',
                  width: '12px',
                  height: '12px',
                  background: 'radial-gradient(circle, #888, #444)'
                }}
              />
            </div>
            
            {/* Sound waves effect */}
            <div 
              className="absolute text-gray-500 text-xs opacity-0 sound-wave transition-opacity"
              style={{
                top: '60px',
                right: '-18px'
              }}
            >
              ••
            </div>
            
            {/* Dramatic shake effect on hover */}
            <div className="absolute inset-0 group-hover:animate-pulse" />
          </div>   
        </div>
        
        {/* Custom CSS for dramatic rattle */}
        <style jsx>{`
          .typewriter-container:hover {
            animation: dramaticRattle 0.6s infinite;
          }
          
          @keyframes dramaticRattle {
            0% { transform: translateX(0px) translateY(0px) rotate(0deg); }
            10% { transform: translateX(-8px) translateY(-3px) rotate(-2deg); }
            20% { transform: translateX(10px) translateY(2px) rotate(1.5deg); }
            30% { transform: translateX(-6px) translateY(-4px) rotate(-1deg); }
            40% { transform: translateX(12px) translateY(1px) rotate(2deg); }
            50% { transform: translateX(-9px) translateY(-2px) rotate(-1.5deg); }
            60% { transform: translateX(7px) translateY(3px) rotate(1deg); }
            70% { transform: translateX(-11px) translateY(-1px) rotate(-2deg); }
            80% { transform: translateX(5px) translateY(-3px) rotate(1.5deg); }
            90% { transform: translateX(-7px) translateY(2px) rotate(-1deg); }
            100% { transform: translateX(0px) translateY(0px) rotate(0deg); }
          }
          
          .typewriter-container:hover .paper {
            animation: intensePaperShake 0.08s infinite;
          }
          
          @keyframes intensePaperShake {
            0% { transform: translateX(-50%) translateY(-2px) rotate(-0.8deg); }
            25% { transform: translateX(-48%) translateY(3px) rotate(0.6deg); }
            50% { transform: translateX(-52%) translateY(-1px) rotate(-0.4deg); }
            75% { transform: translateX(-49%) translateY(2px) rotate(0.7deg); }
            100% { transform: translateX(-51%) translateY(-2px) rotate(-0.5deg); }
          }
          
          .typewriter-container:hover .carriage {
            animation: wildCarriageMove 2.5s infinite ease-in-out;
          }
          
          @keyframes wildCarriageMove {
            0% { transform: translateX(0px); }
            25% { transform: translateX(-27px); }
            30% { transform: translateX(-27px); }
            35% { transform: translateX(18px); }
            65% { transform: translateX(-12px); }
            70% { transform: translateX(-12px); }
            75% { transform: translateX(15px); }
            100% { transform: translateX(0px); }
          }
          
          .typewriter-container:hover .keys {
            animation: aggressiveKeyPress 0.25s infinite;
          }
          
          @keyframes aggressiveKeyPress {
            0%, 70%, 100% { 
              transform: translateY(0px); 
            }
            15%, 30% { 
              transform: translateY(3px); 
            }
          }
          
          .typewriter-container:hover .cursor {
            animation: rapidBlink 0.15s infinite;
          }
          
          @keyframes rapidBlink {
            0%, 30% { opacity: 1; }
            40%, 100% { opacity: 0; }
          }
          
          .typewriter-container:hover .mechanism {
            animation: wildStrike 0.12s infinite;
          }
          
          @keyframes wildStrike {
            0% { transform: translateX(-50%) rotate(0deg) scale(1); }
            20% { transform: translateX(-46%) rotate(-15deg) scale(1.2); }
            40% { transform: translateX(-54%) rotate(8deg) scale(0.8); }
            60% { transform: translateX(-48%) rotate(-10deg) scale(1.1); }
            80% { transform: translateX(-52%) rotate(6deg) scale(0.9); }
            100% { transform: translateX(-50%) rotate(0deg) scale(1); }
          }
          
          .typewriter-container:hover .lever {
            animation: wildLeverAction 0.7s infinite;
          }
          
          @keyframes wildLeverAction {
            0% { transform: rotate(0deg); }
            15% { transform: rotate(-20deg); }
            30% { transform: rotate(8deg); }
            45% { transform: rotate(-25deg); }
            60% { transform: rotate(12deg); }
            75% { transform: rotate(-15deg); }
            90% { transform: rotate(5deg); }
            100% { transform: rotate(0deg); }
          }
          
          .typewriter-container:hover .sound-wave {
            opacity: 0.8;
            animation: intenseSoundPulse 0.4s infinite;
          }
          
          @keyframes intenseSoundPulse {
            0% { opacity: 0; transform: scale(0.6); }
            50% { opacity: 0.8; transform: scale(1.4); }
            100% { opacity: 0; transform: scale(1.8); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default TypewriterAnimation;
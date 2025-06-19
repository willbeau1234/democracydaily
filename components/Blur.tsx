import React from 'react';

interface BlurProps {
  onSignIn: () => void;
  onLogIn: () => void;
  onGuest: () => void;
}

const Blur: React.FC<BlurProps> = ({ onSignIn, onLogIn, onGuest }) => {
    const calculateLineCount = (containerHeightPercent: number, density: number = 0.15) => {
        return Math.floor(containerHeightPercent * density);
    };
    
  
  const styles: { [key: string]: React.CSSProperties } = {
    body: {
      margin: 0,
      padding: 0,
      backgroundColor: '#f8f8f8',
      fontFamily: 'Times New Roman, serif',
      color: '#333'
    },
    newspaperContainer: {
      maxWidth: '100%',
      margin: '0 auto',
      backgroundColor: 'white',
      boxShadow: '0 0 20px rgba(0,0,0,0.1)',
      minHeight: '100vh',
      position: 'relative'
    },
    header: {
      textAlign: 'center',
      padding: '30px 20px 20px',
      borderBottom: '3px solid #000',
      backgroundColor: 'white'
    },
    mainTitle: {
      fontSize: '3.5rem',
      fontWeight: 'bold',
      letterSpacing: '3px',
      margin: 0,
      textTransform: 'uppercase'
    },
    headerInfo: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '15px',
      fontSize: '0.9rem',
      color: '#666'
    },
    date: {
      fontStyle: 'italic'
    },
    contentArea: {
      filter: 'blur(3px)',
      opacity: 0.7,
      padding: '30px',
      position: 'relative',
      minHeight: 'calc(100vh - 200px)' // Adjust based on header height
    },
    wavyLine: {
      height: '2px',
      margin: '4px 0',
      background: `repeating-linear-gradient(
        90deg,
        transparent 0px,
        transparent 2px,
        #333 2px,
        #333 4px
      )`,
      borderRadius: '1px',
      position: 'relative'
    },
    wavyLong: {
      width: '100%'
    },
    wavyMedium: {
      width: '85%'
    },
    wavyShort: {
      width: '65%'
    },
    wavyVeryShort: {
      width: '45%'
    },
    grayBox: {
      position: 'absolute',
      top: '20%',
      left: '2%',
      width: '50%',
      height: '60%',   
      backgroundColor: '#888',
      borderRadius: '15px',
      zIndex: 10
    },
    grayBox2: {
      position: 'absolute',
      top: '94%',
      left: '55%',
      width: '40%',
      height: '40%',
      backgroundColor: '#888',
      borderRadius: '15px',
      zIndex: 10
    },
    linesContainer: {
      position: 'absolute',
      top: '20%',
      left: '55%',
      width: '40%',
      height: '90%',
      zIndex: 10
    },
    linesContainer2: {
      position: 'absolute',
      top: '85%',
      left: '2%',
      width: '50%',
      height: '20%',
      zIndex: 10
    },
    linesContainer3: {
        position: 'absolute',
        top: '137%',
        left: '2%',
        width: '90%',
        height: '500%',
        zIndex: 10
      },
    centerButtons: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      zIndex: 20,
      filter: 'none'
    },
    bottombar:{
      position: 'absolute',
      bottom: '0',
      left: '0',
      width: '100%',
      height: '100px',
      backgroundColor: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 20,
      filter: 'none'
    },
    authButton: {
      padding: '12px 30px',
      fontSize: '1.1rem',
      fontFamily: 'Times New Roman, serif',
      border: '2px solid #333',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      minWidth: '200px',
      fontWeight: 'bold'
    },
    primaryButton: {
      backgroundColor: '#333',
      color: 'white'
    },
    secondaryButton: {
      backgroundColor: 'white',
      color: '#333'
    }
  };

  return (
    <div style={styles.newspaperContainer}>
        <div style={styles.centerButtons}>
          <button 
            style={{...styles.authButton, ...styles.primaryButton}}
            onClick={onSignIn} 
            onMouseOver={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = '#555';
              target.style.transform = 'translateY(-2px)';
              target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            }}
            onMouseOut={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = '#333';
              target.style.transform = 'translateY(0)';
              target.style.boxShadow = 'none';
            }}
          >
            Sign Up
          </button>
          <button 
            style={{...styles.authButton, ...styles.primaryButton}} 
            onClick={onLogIn}
            onMouseOver={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = '#555';
              target.style.transform = 'translateY(-2px)';
              target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            }}
            onMouseOut={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = '#333';
              target.style.transform = 'translateY(0)';
              target.style.boxShadow = 'none';
            }}
          >
            Log In
          </button>
          <button 
            style={{...styles.authButton, ...styles.secondaryButton}} 
            onClick={onGuest}
            onMouseOver={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = '#f5f5f5';
              target.style.transform = 'translateY(-2px)';
              target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            }}
            onMouseOut={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = 'white';
              target.style.transform = 'translateY(0)';
              target.style.boxShadow = 'none';
            }}
          >
            Continue as Guest
          </button>
        </div>
      {/* Blurred Content Area */}
      <div style={styles.contentArea}>
        <div style={styles.grayBox}></div>
        <div style={styles.grayBox2}></div>
        
        <div style={styles.linesContainer}>
          {[...Array(calculateLineCount(300))].map((_, i) => {
            const lineTypes = ['wavyLong', 'wavyMedium', 'wavyShort', 'wavyVeryShort'];
            const randomType = lineTypes[i % 4];
            return (
              <div 
                key={i}
                style={{...styles.wavyLine, ...styles[randomType]}}
              ></div>
            );
          })}
        </div>

        <div style={styles.linesContainer2}>
          {[...Array(calculateLineCount(215))].map((_, i) => {
            const lineTypes = ['wavyLong', 'wavyMedium', 'wavyShort', 'wavyVeryShort'];
            const randomType = lineTypes[i % 4];
            return (
              <div 
                key={i}
                style={{...styles.wavyLine, ...styles[randomType]}}
              ></div>
            );
          })}
        </div>
        <div style={styles.linesContainer3}>
          {[...Array(calculateLineCount(45))].map((_, i) => {
            const lineTypes = ['wavyLong', 'wavyMedium', 'wavyShort', 'wavyVeryShort'];
            const randomType = lineTypes[i % 4];
            return (
              <div 
                key={i}
                style={{...styles.wavyLine, ...styles[randomType]}}
              ></div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Blur;
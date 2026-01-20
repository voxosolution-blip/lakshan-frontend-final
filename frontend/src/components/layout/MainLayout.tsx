// Main Layout Component with Sidebar - Mobile Responsive
import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { SeasonalEffects } from '../common/SeasonalEffects';
import { LottieAnimation } from '../common/LottieAnimation';
import logoImage from '../../assets/Logo.png';

export const MainLayout = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-300 ${
        isMobile ? 'ml-0' : 'ml-64'
      }`}>
        {/* Seasonal Effects (Snow, etc.) */}
        <SeasonalEffects />
        
        {/* Lottie Animation - Bottom Left Corner */}
        <LottieAnimation />
        
        {/* Background Logo Overlay - 10% opacity, centered in main content area */}
        <div 
          className="absolute z-0 pointer-events-none hidden md:block"
          style={{
            top: '150px',
            bottom: '60px',
            left: '0',
            right: '0',
            backgroundImage: `url(${logoImage})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.1,
          }}
        />
        {/* Header - Fixed at top, always visible */}
        <div className="fixed top-0 left-0 right-0 z-30" style={{ 
          marginLeft: isMobile ? '0' : '256px' 
        }}>
          <Header />
        </div>
        {/* Main Content - Scrollable, with padding to avoid header/footer */}
        <main 
          className="flex-1 overflow-y-auto overflow-x-hidden relative z-10"
          style={{
            paddingTop: '70px', // Header height
            paddingBottom: '60px', // Footer height
            paddingLeft: '12px',
            paddingRight: '12px',
          }}
        >
          <div className="w-full max-w-7xl mx-auto py-3 sm:py-4 md:py-6">
            <Outlet />
          </div>
        </main>
        {/* Footer - Fixed at bottom, always visible */}
        <div className="fixed bottom-0 left-0 right-0 z-30" style={{ 
          marginLeft: isMobile ? '0' : '256px' 
        }}>
          <Footer />
        </div>
      </div>
    </div>
  );
};


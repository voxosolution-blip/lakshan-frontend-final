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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-300 ${
        isMobile ? 'ml-0' : 'ml-64'
      }`}>
        {/* Seasonal Effects (Snow, etc.) */}
        <SeasonalEffects />
        
        {/* Lottie Animation - Bottom Left Corner */}
        <LottieAnimation />
        
        {/* Background Logo Overlay - 50% opacity, centered in main content area */}
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
            opacity: 0.5,
          }}
        />
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};


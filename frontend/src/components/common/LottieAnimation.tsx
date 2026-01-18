import { useEffect, useState } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export const LottieAnimation = () => {
  const [isSeasonal, setIsSeasonal] = useState(false);

  // Check current season based on date (same as snow: November 28 - January 28)
  useEffect(() => {
    const checkSeason = () => {
      const today = new Date();
      const month = today.getMonth() + 1; // 1-12
      const day = today.getDate();

      // Show animation during Christmas/winter season: November 28 - January 28
      if (
        (month === 11 && day >= 28) ||
        (month === 12) ||
        (month === 1 && day <= 28)
      ) {
        setIsSeasonal(true);
      } else {
        setIsSeasonal(false);
      }
    };

    checkSeason();
    // Check hourly to update season
    const interval = setInterval(checkSeason, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, []);

  if (!isSeasonal) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 pointer-events-none">
      <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40">
        <DotLottieReact
          src="https://lottie.host/214ed9cb-2964-491d-bb79-233b56aa544e/XDmTo893WG.lottie"
          loop
          autoplay
        />
      </div>
    </div>
  );
};

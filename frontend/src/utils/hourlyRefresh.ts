// Utility function to set up hourly refresh at the top of each hour
// Refreshes at 12:00, 1:00 PM, 2:00 PM, etc.

export const setupHourlyRefresh = (callback: () => void): (() => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  
  const scheduleNextRefresh = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0); // Next hour at 00:00:00
    
    const msUntilNextHour = nextHour.getTime() - now.getTime();
    
    // Schedule refresh at the top of the next hour
    timeoutId = setTimeout(() => {
      callback();
      // After first refresh, set up interval for every hour
      intervalId = setInterval(callback, 60 * 60 * 1000); // 1 hour = 3600000 ms
    }, msUntilNextHour);
  };
  
  // Initial setup
  scheduleNextRefresh();
  
  // Return cleanup function
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
};


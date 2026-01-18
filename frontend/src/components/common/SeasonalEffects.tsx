import { useEffect, useRef, useState } from 'react';

type Season = 'snow' | 'none';

interface Snowflake {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  amplitude: number;
  frequency: number;
  angle: number;
  windSpeed: number;
  rotationSpeed: number;
  depth: number; // 0-1 for z-depth simulation
  driftX: number;
  driftY: number;
  vx: number; // velocity x
  vy: number; // velocity y
  swirl: number;
  trail: Array<{ x: number; y: number; opacity: number }>;
}

export const SeasonalEffects = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const snowflakesRef = useRef<Snowflake[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season>('none');
  const windDirectionRef = useRef(0);
  const windStrengthRef = useRef(0);
  const timeRef = useRef(0);
  const mouseXRef = useRef(0);
  const mouseYRef = useRef(0);

  // Calculate snowflake count multiplier based on date
  const getSnowflakeMultiplier = (): number => {
    const today = new Date();
    const month = today.getMonth() + 1; // 1-12
    const day = today.getDate();

    // November 25-28: Increase from 0 to 1.0 (ramp up)
    if (month === 11 && day >= 25 && day <= 28) {
      const progress = (day - 25) / (28 - 25); // 0 to 1
      return progress; // 0.0 to 1.0
    }

    // November 28 - December 23: Static at full intensity (1.0)
    if ((month === 11 && day >= 28) || (month === 12 && day <= 23)) {
      return 1.0;
    }

    // December 23-31: Static at full intensity (1.0)
    if (month === 12 && day >= 23 && day <= 31) {
      return 1.0;
    }

    // January 1-25: Decrease from 1.0 to 0 (ramp down)
    if (month === 1 && day >= 1 && day <= 25) {
      const progress = 1 - (day - 1) / (25 - 1); // 1.0 to 0.0
      return Math.max(0, progress);
    }

    // January 25-28: Continue decreasing to 0
    if (month === 1 && day >= 25 && day <= 28) {
      const progress = 1 - (day - 25) / (28 - 25); // 1.0 to 0.0
      return Math.max(0, progress);
    }

    return 0;
  };

  // Check current season based on date
  useEffect(() => {
    const checkSeason = () => {
      const today = new Date();
      const month = today.getMonth() + 1; // 1-12
      const day = today.getDate();

      // Snow season: November 25 - January 28
      if (
        (month === 11 && day >= 25) ||
        (month === 12) ||
        (month === 1 && day <= 28)
      ) {
        setCurrentSeason('snow');
      } else {
        setCurrentSeason('none');
      }
    };

    checkSeason();
    const interval = setInterval(checkSeason, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, []);

  // Initialize snowflakes
  useEffect(() => {
    if (currentSeason !== 'snow' || !canvasRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      snowflakesRef.current = [];
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Create advanced snowflake with realistic properties
    const createSnowflake = (): Snowflake => {
      const depth = Math.random(); // 0-1 for depth simulation
      const size = (1 - depth * 0.6) * (Math.random() * 5 + 2); // Far flakes are smaller
      const speed = (1 - depth * 0.4) * (Math.random() * 2 + 0.5);
      
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height, // Start above screen
        size: size,
        speed: speed,
        opacity: 0.4 + depth * 0.6, // Far flakes are more transparent
        amplitude: Math.random() * 80 + 40,
        frequency: Math.random() * 0.02 + 0.005,
        angle: Math.random() * Math.PI * 2,
        windSpeed: (Math.random() - 0.5) * 0.4,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        depth: depth,
        driftX: 0,
        driftY: 0,
        vx: (Math.random() - 0.5) * 0.5, // Initial horizontal velocity
        vy: speed,
        swirl: Math.random() * Math.PI * 2,
        trail: [],
      };
    };

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Recalculate snowflake count with multiplier
      const multiplier = getSnowflakeMultiplier();
      const baseCount = Math.floor((canvas.width * canvas.height) / 6000);
      const targetCount = Math.floor(baseCount * multiplier);
      
      // Adjust snowflake array to match target count
      const currentCount = snowflakesRef.current.length;
      if (targetCount > currentCount) {
        // Add more snowflakes
        const toAdd = targetCount - currentCount;
        for (let i = 0; i < toAdd; i++) {
          snowflakesRef.current.push(createSnowflake());
        }
      } else if (targetCount < currentCount) {
        // Remove excess snowflakes (remove from end)
        snowflakesRef.current = snowflakesRef.current.slice(0, targetCount);
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Mouse interaction (subtle wind effect)
    const handleMouseMove = (e: MouseEvent) => {
      mouseXRef.current = e.clientX;
      mouseYRef.current = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Initialize snowflakes with dynamic count
    const multiplier = getSnowflakeMultiplier();
    const baseCount = Math.floor((canvas.width * canvas.height) / 6000);
    const flakeCount = Math.floor(baseCount * multiplier);
    snowflakesRef.current = Array.from({ length: flakeCount }, createSnowflake);

    // Advanced animation loop
    const animate = () => {
      timeRef.current += 0.01;
      
      // Update snowflake count based on date (check every 60 frames ~1 second)
      if (Math.floor(timeRef.current * 100) % 60 === 0) {
        const multiplier = getSnowflakeMultiplier();
        const baseCount = Math.floor((canvas.width * canvas.height) / 6000);
        const targetCount = Math.floor(baseCount * multiplier);
        const currentCount = snowflakesRef.current.length;
        
        if (targetCount > currentCount) {
          // Add more snowflakes gradually
          const toAdd = Math.min(5, targetCount - currentCount); // Add max 5 at a time
          for (let i = 0; i < toAdd; i++) {
            snowflakesRef.current.push(createSnowflake());
          }
        } else if (targetCount < currentCount) {
          // Remove excess snowflakes gradually (remove from end)
          const toRemove = Math.min(5, currentCount - targetCount); // Remove max 5 at a time
          snowflakesRef.current = snowflakesRef.current.slice(0, currentCount - toRemove);
        }
      }
      
      // Dynamic wind simulation (realistic wind patterns)
      windDirectionRef.current = Math.sin(timeRef.current * 0.015) * 0.8 + 
                                  Math.cos(timeRef.current * 0.008) * 0.3;
      windStrengthRef.current = Math.sin(timeRef.current * 0.01) * 0.3 + 0.5;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      snowflakesRef.current.forEach((flake, index) => {
        // Update trail
        flake.trail.push({ x: flake.x, y: flake.y, opacity: 1 });
        if (flake.trail.length > 3) {
          flake.trail.shift();
        }
        
        // Update trail opacity
        flake.trail.forEach((point, i) => {
          point.opacity = i / flake.trail.length * 0.3;
        });

        // Physics-based movement
        const baseSpeed = flake.speed * (1 + Math.sin(timeRef.current * flake.frequency * 100) * 0.2);
        
        // Vertical velocity with acceleration
        flake.vy = baseSpeed + Math.sin(timeRef.current * flake.frequency * 80 + index) * 0.3;
        
        // Horizontal movement with multiple influences
        const horizontalWave = Math.sin(timeRef.current * flake.frequency * 100 + index) * flake.amplitude;
        const windInfluence = windDirectionRef.current * windStrengthRef.current * (1 + flake.depth);
        const swirlEffect = Math.sin(timeRef.current * 0.05 + flake.swirl) * (1 - flake.depth) * 15;
        
        // Mouse interaction (subtle attraction)
        const dx = mouseXRef.current - flake.x;
        const dy = mouseYRef.current - flake.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const mouseInfluence = distance < 200 ? (1 - distance / 200) * 0.3 : 0;
        const mouseAngle = Math.atan2(dy, dx);
        
        flake.vx = (horizontalWave * 0.01) + 
                   (windInfluence * flake.windSpeed) + 
                   (swirlEffect * 0.01) +
                   (Math.cos(mouseAngle) * mouseInfluence * 0.5);
        
        // Apply velocities with depth-based scaling
        flake.x += flake.vx * (1 + flake.depth * 0.3);
        flake.y += flake.vy * (1 + flake.depth * 0.2);
        
        // Update rotation
        flake.angle += flake.rotationSpeed * (1 + flake.depth);
        flake.swirl += 0.01;

        // Reset flake when it goes off screen
        if (flake.y > canvas.height + 20) {
          flake.y = -20;
          flake.x = Math.random() * canvas.width;
          flake.angle = Math.random() * Math.PI * 2;
          flake.swirl = Math.random() * Math.PI * 2;
          flake.trail = [];
          // Vary properties
          const depth = Math.random();
          flake.depth = depth;
          flake.size = (1 - depth * 0.6) * (Math.random() * 5 + 2);
          flake.speed = (1 - depth * 0.4) * (Math.random() * 2 + 0.5);
          flake.opacity = 0.4 + depth * 0.6;
        }

        // Wrap around horizontally
        if (flake.x < -30) {
          flake.x = canvas.width + 30;
        } else if (flake.x > canvas.width + 30) {
          flake.x = -30;
        }

        // Draw trail for larger flakes (depth-based)
        if (flake.depth < 0.3 && flake.trail.length > 1) {
          ctx.save();
          ctx.globalAlpha = 0.15;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = flake.size * 0.3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          flake.trail.forEach((point, i) => {
            if (i === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.stroke();
          ctx.restore();
        }

        // Draw snowflake with advanced rendering
        ctx.save();
        ctx.translate(flake.x, flake.y);
        ctx.rotate(flake.angle);
        ctx.globalAlpha = flake.opacity;
        
        // Multi-layer radial gradient for realistic 3D effect
        const gradient = ctx.createRadialGradient(
          -flake.size * 0.15,
          -flake.size * 0.15,
          0,
          0,
          0,
          flake.size * 1.5
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${1})`);
        gradient.addColorStop(0.3, `rgba(255, 255, 255, ${0.95})`);
        gradient.addColorStop(0.6, `rgba(240, 250, 255, ${0.8})`);
        gradient.addColorStop(0.8, `rgba(230, 240, 250, ${0.4})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        
        // Draw hexagonal snowflake shape for larger flakes
        if (flake.size > 3 && flake.depth < 0.5) {
          ctx.beginPath();
          const sides = 6;
          for (let i = 0; i < sides; i++) {
            const angle = (i * Math.PI * 2) / sides;
            const x = Math.cos(angle) * flake.size;
            const y = Math.sin(angle) * flake.size;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = gradient;
          ctx.fill();
          
          // Add inner details for larger flakes
          ctx.beginPath();
          for (let i = 0; i < sides; i++) {
            const angle = (i * Math.PI * 2) / sides;
            const x = Math.cos(angle) * flake.size * 0.5;
            const y = Math.sin(angle) * flake.size * 0.5;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity * 0.6})`;
          ctx.fill();
        } else {
          // Smaller flakes use circles
          ctx.beginPath();
          ctx.arc(0, 0, flake.size, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
        
        // Advanced glow effect (depth-based)
        const glowSize = flake.size * (1.2 + flake.depth * 0.3);
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        glowGradient.addColorStop(0, `rgba(255, 255, 255, ${flake.opacity * 0.3})`);
        glowGradient.addColorStop(0.5, `rgba(240, 248, 255, ${flake.opacity * 0.15})`);
        glowGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        
        ctx.shadowBlur = glowSize * 0.8;
        ctx.shadowColor = `rgba(255, 255, 255, ${flake.opacity * 0.5})`;
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentSeason]);

  if (currentSeason === 'none') {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-50"
      style={{
        background: 'transparent',
      }}
    />
  );
};

'use client';

import { useEffect, useRef, useState } from 'react';

interface WalletData {
  wallet: string;
  delta: number;
  total: number;
}

interface Ball {
  wallet: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  total: number;
}

function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  const saturation = 70 + (Math.abs(hash) % 30); // 70-100%
  const lightness = 50 + (Math.abs(hash) % 20); // 50-70%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function calculateRadius(total: number): number {
  // Ball area proportional to total/1e9, with min/max constraints
  const area = Math.max(total / 1e9, 0.1);
  const radius = Math.sqrt(area / Math.PI) * 50; // Scale factor for visibility
  return Math.max(Math.min(radius, 100), 10); // Min 10px, max 100px
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [balls, setBalls] = useState<Map<string, Ball>>(new Map());
  const animationRef = useRef<number>();
  
  useEffect(() => {
    const eventSource = new EventSource('/api/events?pair=example');
    
    eventSource.onmessage = (event) => {
      try {
        const walletUpdates: WalletData[] = JSON.parse(event.data);
        
        setBalls(prevBalls => {
          const newBalls = new Map(prevBalls);
          
          walletUpdates.forEach(({ wallet, delta, total }) => {
            const existingBall = newBalls.get(wallet);
            
            if (existingBall) {
              // Update existing ball
              existingBall.total = total;
              existingBall.radius = calculateRadius(total);
              
              // Nudge speed on growth (delta > 0)
              if (delta > 0) {
                const speedBoost = Math.min(delta / 1000, 2); // Cap speed boost
                existingBall.vx += (Math.random() - 0.5) * speedBoost;
                existingBall.vy += (Math.random() - 0.5) * speedBoost;
              }
            } else {
              // Create new ball
              const canvas = canvasRef.current;
              if (canvas) {
                newBalls.set(wallet, {
                  wallet,
                  x: Math.random() * (canvas.width - 40) + 20,
                  y: Math.random() * (canvas.height - 40) + 20,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  radius: calculateRadius(total),
                  color: hashStringToColor(wallet),
                  total
                });
              }
            }
          });
          
          return newBalls;
        });
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };
    
    return () => {
      eventSource.close();
    };
  }, []);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw balls
      balls.forEach(ball => {
        // Update position
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // DVD-style wall bounces
        if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width) {
          ball.vx = -ball.vx;
          ball.x = Math.max(ball.radius, Math.min(canvas.width - ball.radius, ball.x));
        }
        
        if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
          ball.vy = -ball.vy;
          ball.y = Math.max(ball.radius, Math.min(canvas.height - ball.radius, ball.y));
        }
        
        // Apply friction to prevent infinite acceleration
        ball.vx *= 0.999;
        ball.vy *= 0.999;
        
        // Ensure minimum speed for animation
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed < 1) {
          const angle = Math.atan2(ball.vy, ball.vx);
          ball.vx = Math.cos(angle) * 1;
          ball.vy = Math.sin(angle) * 1;
        }
        
        // Draw ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        
        // Draw wallet address (truncated) and total
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        const truncatedWallet = `${ball.wallet.slice(0, 6)}...${ball.wallet.slice(-4)}`;
        ctx.fillText(truncatedWallet, ball.x, ball.y - 5);
        ctx.fillText(`$${ball.total.toFixed(0)}`, ball.x, ball.y + 10);
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [balls]);
  
  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="block"
        style={{ cursor: 'none' }}
      />
      <div className="absolute top-4 left-4 text-white text-sm">
        <div>Pump Bubbles - Live Wallet Activity</div>
        <div>Active wallets: {balls.size}</div>
      </div>
    </div>
  );
}
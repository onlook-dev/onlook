import { useEffect, useRef, useState } from 'react';

interface ParallaxCursorOptions {
  intensity?: number;
  smoothness?: number;
}

export function useParallaxCursor(options?: ParallaxCursorOptions) {
  const { intensity = 0.02, smoothness = 0.1 } = options || {};
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [parallaxPosition, setParallaxPosition] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const { clientX, clientY } = event;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      // Calculate distance from center (magnetic effect)
      const distanceX = (clientX - centerX) / centerX;
      const distanceY = (clientY - centerY) / centerY;
      
      // Apply inverse square law for magnetic attraction
      const magneticX = distanceX * Math.abs(distanceX) * intensity;
      const magneticY = distanceY * Math.abs(distanceY) * intensity;
      
      setMousePosition({ x: magneticX, y: magneticY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [intensity]);

  useEffect(() => {
    const animate = () => {
      setParallaxPosition(prev => ({
        x: prev.x + (mousePosition.x - prev.x) * smoothness,
        y: prev.y + (mousePosition.y - prev.y) * smoothness,
      }));
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mousePosition, smoothness]);

  return parallaxPosition;
} 
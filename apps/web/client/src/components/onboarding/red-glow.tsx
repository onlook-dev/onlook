'use client';

import { cn } from '@onlook/ui/utils';
import { useEffect, useState } from 'react';

interface RedGlowProps {
  children: React.ReactNode;
  isActive?: boolean;
  text?: string;
  className?: string;
  onComplete?: () => void;
}

export const RedGlow = ({ 
  children, 
  isActive = false, 
  text = "Welcome to Onlook! Start by typing your first message here.",
  className,
  onComplete 
}: RedGlowProps) => {
  const [showGlow, setShowGlow] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (isActive) {
      // Delay the glow appearance for a smooth entrance
      const glowTimer = setTimeout(() => setShowGlow(true), 300);
      // Delay the text appearance slightly after the glow
      const textTimer = setTimeout(() => setShowText(true), 800);
      
      return () => {
        clearTimeout(glowTimer);
        clearTimeout(textTimer);
      };
    } else {
      setShowGlow(false);
      setShowText(false);
    }
  }, [isActive]);

  const handleComplete = () => {
    setShowGlow(false);
    setShowText(false);
    onComplete?.();
  };

  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      {/* Large Red Glow Effect - extends far beyond boundaries */}
      <div 
        className={cn(
          "absolute -inset-8 rounded-3xl transition-all duration-1000 ease-out pointer-events-none",
          "bg-gradient-to-br from-fuchsia-500/30 via-pink-400/40 to-rose-600/35",
          "shadow-[0_0_100px_rgba(236,72,153,0.6),0_0_200px_rgba(236,72,153,0.4),0_0_300px_rgba(236,72,153,0.2)]",
          "blur-md",
          showGlow 
            ? "opacity-100 scale-110" 
            : "opacity-0 scale-95"
        )}
      />
      
      {/* Even larger outer glow layer */}
      <div 
        className={cn(
          "absolute -inset-12 rounded-full transition-all duration-1200 ease-out pointer-events-none",
          "bg-gradient-to-t from-fuchsia-600/20 via-transparent to-pink-500/25",
          "shadow-[0_0_150px_rgba(192,38,211,0.4),0_0_300px_rgba(192,38,211,0.2)]",
          "blur-lg",
          showGlow 
            ? "opacity-70 scale-120" 
            : "opacity-0 scale-100"
        )}
      />
      
      {/* Extra large ambient glow */}
      <div 
        className={cn(
          "absolute -inset-16 rounded-full transition-all duration-1400 ease-out pointer-events-none",
          "bg-gradient-radial from-fuchsia-500/10 via-transparent to-transparent",
          "shadow-[0_0_200px_rgba(236,72,153,0.3)]",
          "blur-xl",
          showGlow 
            ? "opacity-60 scale-130" 
            : "opacity-0 scale-100"
        )}
      />
      
      {/* Floating Text */}
      {showText && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 pointer-events-none z-50">
          <div className="relative">
            {/* Text background with subtle glow */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-lg px-4 py-2 blur-[0.5px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-lg" />
            
            {/* Main text */}
            <p className="relative text-white text-sm font-medium px-4 py-2 text-center whitespace-nowrap">
              {text}
            </p>
            
            {/* Subtle animation for the text */}
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-red-500/60 rounded-full animate-pulse" />
          </div>
        </div>
      )}

      {/* Skip button */}
      {showText && (
        <button
          onClick={handleComplete}
          className="absolute -top-12 right-0 text-white/70 hover:text-white text-xs underline transition-colors duration-200 pointer-events-auto z-50"
        >
          Skip
        </button>
      )}

      {/* The actual content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

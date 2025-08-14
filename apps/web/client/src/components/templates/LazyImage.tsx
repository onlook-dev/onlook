"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
  cardStyle?: boolean;
}

export default function LazyImage({
  src,
  alt,
  className = "",
  placeholderClassName = "",
  onLoad,
  onError,
  cardStyle = false
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "50px"
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
    >
      {cardStyle ? (
        <div className="ml-4 mr-4 mt-4 mb-0 h-full">
          <div className="relative h-full rounded-lg overflow-hidden bg-white shadow-lg">
            <div
              className={`absolute inset-0 bg-secondary ${placeholderClassName}`}
            />

            {!isLoaded && !hasError && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/10 to-transparent animate-shimmer" />
            )}

            {isInView && !hasError && (
              <motion.img
                ref={imgRef}
                src={src}
                alt={alt}
                className="absolute inset-0 w-full h-full object-cover"
                onLoad={handleLoad}
                onError={handleError}
                initial={{ opacity: 0 }}
                animate={{ opacity: isLoaded ? 1 : 0 }}
                transition={{
                  duration: 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
              />
            )}

            {hasError && (
              <div className="absolute inset-0 bg-secondary flex items-center justify-center">
                <div className="text-foreground-tertiary text-xs">
                  Failed to load
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div
            className={`absolute inset-0 bg-secondary ${placeholderClassName}`}
          />

          {!isLoaded && !hasError && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/10 to-transparent animate-shimmer" />
          )}

          {isInView && !hasError && (
            <motion.img
              ref={imgRef}
              src={src}
              alt={alt}
              className={`absolute inset-0 w-full h-full object-cover ${className}`}
              onLoad={handleLoad}
              onError={handleError}
              initial={{ opacity: 0 }}
              animate={{ opacity: isLoaded ? 1 : 0 }}
              transition={{
                duration: 0.3,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            />
          )}

          {hasError && (
            <div className="absolute inset-0 bg-secondary flex items-center justify-center">
              <div className="text-foreground-tertiary text-xs">
                Failed to load
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface LazyImageProps {
    src: string | null;
    alt: string;
    className?: string;
    placeholderClassName?: string;
    onLoad?: () => void;
    onError?: () => void;
    cardStyle?: boolean;
}

export function LazyImage({
    src,
    alt,
    className = '',
    placeholderClassName = '',
    onLoad,
    onError,
    cardStyle = false,
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
                rootMargin: '50px',
            },
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

    const renderImageContent = () => (
        <>
            <div className={`bg-secondary absolute inset-0 ${placeholderClassName}`} />

            {!isLoaded && !hasError && (
                <div className="via-foreground/10 animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent to-transparent" />
            )}

            {isInView && !hasError && src && (
                <motion.img
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    className={
                        cardStyle
                            ? 'absolute inset-0 h-full w-full object-cover'
                            : `absolute inset-0 h-full w-full object-cover ${className}`
                    }
                    onLoad={handleLoad}
                    onError={handleError}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isLoaded ? 1 : 0 }}
                    transition={{
                        duration: 0.3,
                        ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                />
            )}

            {(hasError || !src) && (
                <div className="bg-secondary absolute inset-0 flex items-center justify-center">
                    <div className="text-foreground-tertiary text-lg">
                        {hasError ? 'Failed to load' : 'No image available'}
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden ${cardStyle ? '' : className}`}
        >
            {cardStyle ? (
                <div className="mt-4 mr-4 mb-0 ml-4 h-full">
                    <div className="relative h-full overflow-hidden rounded-lg bg-white shadow-lg">
                        {renderImageContent()}
                    </div>
                </div>
            ) : (
                renderImageContent()
            )}
        </div>
    );
}

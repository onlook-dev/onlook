'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

// Define proper types for the library
interface UnicornStudioScene {
    element: HTMLElement;
    destroy: () => void;
    contains?: (element: HTMLElement | null) => boolean;
}

interface UnicornStudioConfig {
    scale: number;
    dpi: number;
}

interface UnicornStudio {
    isInitialized: boolean;
    init: (config?: UnicornStudioConfig) => Promise<UnicornStudioScene[]>;
}

// Custom hook to handle script loading
const useUnicornStudio = () => {
    const [isLoaded, setIsLoaded] = useState(false);
    const scriptRef = useRef<HTMLScriptElement | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const version = '1.4.25';
        const scriptUrl = `https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v${version}/dist/unicornStudio.umd.js`;

        // Check if script already exists
        const existingScript = document.querySelector(
            `script[src="${scriptUrl}"]`
        ) as HTMLScriptElement | null;

        if (existingScript) {
            if ((window as any).UnicornStudio) {
                setIsLoaded(true);
            } else {
                existingScript.addEventListener('load', () => setIsLoaded(true));
            }
            scriptRef.current = existingScript;
            return;
        }

        // Create and load new script
        const script = document.createElement('script');
        script.src = scriptUrl;
        script.async = true;
        script.onload = () => setIsLoaded(true);
        script.onerror = () => console.error('Failed to load UnicornStudio script');
        document.body.appendChild(script);
        scriptRef.current = script;

        return () => {
            if (scriptRef.current && !existingScript) {
                document.body.removeChild(scriptRef.current);
            }
        };
    }, []);

    // Only access window if it's defined
    const unicornStudio = typeof window !== 'undefined'
        ? (window as any).UnicornStudio as UnicornStudio | undefined
        : undefined;

    return { isLoaded, UnicornStudio: unicornStudio };
};

export function UnicornBackground() {
    const [isBackgroundVisible, setIsBackgroundVisible] = useState(false);
    const sceneRef = useRef<UnicornStudioScene | null>(null);
    const { isLoaded, UnicornStudio } = useUnicornStudio();

    useEffect(() => {
        if (!isLoaded) return;

        const initializeScene = async () => {
            const container = document.querySelector('[data-us-project="Gr1LmwbKSeJOXhpYEdit"]');
            if (!container) {
                console.warn('No container found');
                return;
            }

            if (sceneRef.current?.destroy) {
                sceneRef.current.destroy();
            }

            try {
                const scenes = await UnicornStudio?.init({
                    scale: 1,
                    dpi: 1.5,
                });

                if (scenes) {
                    const ourScene = scenes.find(
                        (scene) =>
                            scene.element === container ||
                            scene.element.contains(container)
                    );
                    if (ourScene) {
                        sceneRef.current = ourScene;
                        setTimeout(() => {
                            setIsBackgroundVisible(true);
                        }, 1000);
                    }
                }
            } catch (err) {
                console.error('Failed to initialize UnicornStudio scene:', err);
                setTimeout(() => {
                    setIsBackgroundVisible(true);
                }, 1000);
            }
        };

        void initializeScene();

        return () => {
            if (sceneRef.current?.destroy) {
                sceneRef.current.destroy();
                sceneRef.current = null;
            }
        };
    }, [isLoaded]);

    return (
        <div className="absolute inset-0 w-full h-screen overflow-hidden">
            <motion.div
                data-us-project="Gr1LmwbKSeJOXhpYEdit"
                className="absolute inset-0 w-full h-[calc(100vh+80px)] z-0"
                style={{
                    pointerEvents: 'none',
                    willChange: "opacity",
                    transform: "translateZ(0)"
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: isBackgroundVisible ? 1 : 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            />
        </div>
    );
}
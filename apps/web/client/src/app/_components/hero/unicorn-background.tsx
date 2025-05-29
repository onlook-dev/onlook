import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

// Add TypeScript declarations for background
declare global {
    interface Window {
        UnicornStudio: {
            isInitialized: boolean;
            init: (config?: { scale: number; dpi: number }) => Promise<Array<{
                element: HTMLElement;
                destroy: () => void;
                contains?: (element: HTMLElement | null) => boolean;
            }>>;
        };
    }
}


export function UnicornBackground({ setIsMounted }: { setIsMounted: (isMounted: boolean) => void }) {
    const [isBackgroundVisible, setIsBackgroundVisible] = useState(false);
    const sceneRef = useRef<{ destroy: () => void } | null>(null);

    // Add useEffect for background initialization
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const initializeScript = (callback: () => void) => {
            const version = '1.4.25';

            const existingScript = document.querySelector(
                'script[src^="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js"]'
            );

            if (existingScript) {
                if (window.UnicornStudio) {
                    callback();
                } else {
                    existingScript.addEventListener('load', callback);
                }
                return;
            }

            const script = document.createElement('script');
            script.src = `https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v${version}/dist/unicornStudio.umd.js`;
            script.async = true;

            script.onload = () => {
                callback();
            };

            document.body.appendChild(script);
        };

        const initializeScene = async () => {
            const container = document.querySelector('[data-us-project="Gr1LmwbKSeJOXhpYEdit"]');
            if (!container) return;

            if (sceneRef.current?.destroy) {
                sceneRef.current.destroy();
            }

            try {
                const scenes = await window.UnicornStudio?.init({
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
                        setIsMounted(true);
                        // Delay the background visibility
                        setTimeout(() => {
                            setIsBackgroundVisible(true);
                        }, 1000); // 1 second delay after text animations start
                    }
                }
            } catch (err) {
                console.error('Failed to initialize UnicornStudio scene:', err);
                setIsMounted(true);
                setTimeout(() => {
                    setIsBackgroundVisible(true);
                }, 1000);
            }
        };

        initializeScript(() => {
            void initializeScene();
        });

        return () => {
            if (sceneRef.current?.destroy) {
                sceneRef.current.destroy();
                sceneRef.current = null;
            }
        };
    }, []);

    return (
        <motion.div
            data-us-project="Gr1LmwbKSeJOXhpYEdit"
            className="absolute inset-0 w-full h-full z-0"
            style={{
                pointerEvents: 'none',
                willChange: "opacity",
                transform: "translateZ(0)"
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: isBackgroundVisible ? 1 : 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
        />
    )
}
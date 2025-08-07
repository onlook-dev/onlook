'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@onlook/ui/button';
import { useRouter } from 'next/navigation';

export function FeaturesHero() {
    const router = useRouter();

    const handleStartBuilding = () => {
        const heroSection = document.getElementById('hero');
        if (heroSection) {
            heroSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        } else {
            router.push('/');
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-12 p-8 text-lg text-center relative">
            <div className="flex flex-col gap-6 items-center relative z-20 pt-4 pb-2 max-w-3xl">
                <motion.h3
                    className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    Visual Editor for React &amp; TailwindCSS Apps.
                </motion.h3>
                <motion.h1
                    className="text-6xl font-light leading-tight text-center !leading-[0.9]"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    The React Editor You've Been Waiting For
                </motion.h1>
                <motion.p
                    className="text-lg text-foreground-secondary max-w-2xl text-center"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    Code as you design. Build React applications visually while Onlook writes reliable code you can trust, exactly where it needs to go.
                </motion.p>
                <motion.div
                    className="mt-8"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    <Button 
                        variant="secondary" 
                        size="lg" 
                        className="p-6 cursor-pointer hover:bg-foreground-primary hover:text-background-primary transition-colors"
                        onClick={handleStartBuilding}
                    >
                        START BUILDING
                    </Button>
                </motion.div>
            </div>
        </div>
    );
}

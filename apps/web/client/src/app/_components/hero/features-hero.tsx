'use client';

import { Routes } from '@/utils/constants';
import { Button } from '@onlook/ui/button';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGitHubStats } from '../top-bar/github';
import { UnicornBackground } from './unicorn-background';

export function FeaturesHero() {
    const router = useRouter();
    const { formatted: starCount } = useGitHubStats();

    const handleStartBuilding = () => {
        router.push(Routes.HOME);
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-12 p-8 text-lg text-center relative">
            <UnicornBackground />
            <div className="flex flex-col gap-6 items-center relative z-20 pt-4 pb-2 max-w-3xl">
                <motion.h1
                    className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    Visual Editor for React &amp; TailwindCSS Apps
                </motion.h1>
                <motion.p
                    className="text-4xl md:text-6xl font-light leading-tight text-center !leading-[1] text-balance"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    The React Editor You've Been Waiting For
                </motion.p>
                <motion.h2
                    className="text-lg text-foreground-secondary mx-auto max-w-xl text-center"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    Code as you design. Build React applications visually while Onlook writes reliable code you can trust, exactly where it needs to go.
                </motion.h2>
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
                        className="p-6 cursor-pointer hover:bg-foreground-primary hover:text-background-primary transition-all duration-300"
                        onClick={handleStartBuilding}
                    >
                        START BUILDING
                    </Button>
                </motion.div>
                <motion.div
                    className="mt-8 flex items-center justify-center gap-6 text-sm text-foreground-secondary"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    <div className="flex items-center gap-2">
                        <span>{starCount}+ GitHub stars</span>
                    </div>
                    <div className="w-1 h-1 bg-foreground-secondary rounded-full"></div>
                    <div className="flex items-center gap-2">
                        <span>YC W25</span>
                    </div>
                    <div className="w-1 h-1 bg-foreground-secondary rounded-full"></div>
                    <div className="flex items-center gap-2">
                        <span>Open Source</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

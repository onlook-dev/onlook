'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';

import { Button } from '@onlook/ui/button';

import { Routes } from '@/utils/constants';
import { useGitHubStats } from '../top-bar/github';
import { UnicornBackground } from './unicorn-background';

export function AiFeaturesHero() {
    const router = useRouter();
    const { formatted: starCount } = useGitHubStats();

    const handleStartBuilding = () => {
        router.push(Routes.HOME);
    };

    return (
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-12 p-8 text-center text-lg">
            <UnicornBackground />
            <div className="relative z-20 flex max-w-3xl flex-col items-center gap-6 pt-4 pb-2">
                <motion.h1
                    className="text-foreground-secondary mb-4 text-sm font-medium tracking-wider uppercase"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                >
                    AI Design Tools for React Development
                </motion.h1>
                <motion.p
                    className="text-center text-4xl !leading-[1] leading-tight font-light text-balance md:text-6xl"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                    style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                >
                    Build React Apps with AI That Understands Your Code
                </motion.p>
                <motion.p
                    className="text-foreground-secondary mx-auto max-w-xl text-center text-lg"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
                    style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                >
                    Onlook's AI doesn't just generate code—it understands your React components,
                    Tailwind patterns, and project architecture to create production-ready
                    components that fit seamlessly into your existing codebase.
                </motion.p>
                <motion.div
                    className="mt-8"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
                    style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                >
                    <Button
                        variant="secondary"
                        size="lg"
                        className="hover:bg-foreground-primary hover:text-background-primary cursor-pointer p-6 transition-all duration-300"
                        onClick={handleStartBuilding}
                    >
                        Start Building with AI
                    </Button>
                </motion.div>
                <motion.div
                    className="text-foreground-secondary mt-8 flex items-center justify-center gap-6 text-sm"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
                    style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                >
                    <div className="flex items-center gap-2">
                        <span>{starCount}+ GitHub stars</span>
                    </div>
                    <div className="bg-foreground-secondary h-1 w-1 rounded-full"></div>
                    <div className="flex items-center gap-2">
                        <span>YC W25</span>
                    </div>
                    <div className="bg-foreground-secondary h-1 w-1 rounded-full"></div>
                    <div className="flex items-center gap-2">
                        <span>Open Source</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

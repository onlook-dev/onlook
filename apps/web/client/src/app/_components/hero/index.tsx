'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

import { Icons } from '@onlook/ui/icons';

import { api } from '@/trpc/react';
import { vujahdayScript } from '../../fonts';
import { Create } from './create';
import { CreateError } from './create-error';
import { HighDemand } from './high-demand';
import { Import } from './import';
import { MobileEmailCapture } from './mobile-email-capture';
import { StartBlank } from './start-blank';
import { UnicornBackground } from './unicorn-background';

export function Hero() {
    const [cardKey, setCardKey] = useState(0);
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [isShortScreen, setIsShortScreen] = useState(false);
    const { data: user } = api.user.get.useQuery();

    useEffect(() => {
        const checkScreenHeight = () => {
            setIsShortScreen(window.innerHeight < 700);
        };

        checkScreenHeight();
        window.addEventListener('resize', checkScreenHeight);

        return () => window.removeEventListener('resize', checkScreenHeight);
    }, []);

    return (
        <div className="relative flex h-full w-full flex-col items-center text-center text-lg">
            <UnicornBackground />
            <div className="mb-42 flex h-full w-full flex-col items-center justify-center gap-10 pt-12">
                <div className="relative z-20 flex flex-col items-center gap-3 pt-8 pb-2">
                    {!isShortScreen && (
                        <motion.div
                            className="relative z-20 mb-6 flex flex-col items-center gap-3 pt-4 pb-2"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 1.2, ease: 'easeOut' }}
                        >
                            <a
                                href="https://www.ycombinator.com/companies/onlook/jobs/e4gHv1n-founding-engineer-fullstack"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:bg-foreground-secondary/20 border-foreground-secondary/20 text-foreground-secondary inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs backdrop-blur-sm transition-all duration-200 hover:scale-102"
                            >
                                We're hiring engineers
                                <Icons.ArrowRight className="h-4 w-4" />
                            </a>
                        </motion.div>
                    )}
                    <motion.h1
                        className="text-center text-6xl !leading-[0.9] leading-tight font-light"
                        initial={{ opacity: 0, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                    >
                        Cursor for
                        <br />
                        <span
                            className={`font-normal italic ${vujahdayScript.className} ml-1 text-[4.6rem] leading-[1.0]`}
                        >
                            Designers
                        </span>
                    </motion.h1>
                    <motion.p
                        className="text-foreground-secondary mt-2 max-w-xl text-center text-lg text-balance"
                        initial={{ opacity: 0, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
                        style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                    >
                        Onlook is a next-generation visual code editor
                        <br />
                        that lets designers and product managers craft
                        <br />
                        web experiences with AI
                    </motion.p>
                    <HighDemand />
                    <CreateError />
                </div>
                <div className="relative z-20 hidden flex-col items-center gap-4 sm:flex">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
                        onAnimationComplete={() => {
                            setCardKey((prev) => prev + 1);
                        }}
                    >
                        <Create
                            user={user ?? null}
                            cardKey={cardKey}
                            isCreatingProject={isCreatingProject}
                            setIsCreatingProject={setIsCreatingProject}
                        />
                    </motion.div>
                    <motion.div
                        className="mt-0 flex gap-12"
                        initial={{ opacity: 0, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
                        style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                    >
                        <StartBlank
                            user={user ?? null}
                            isCreatingProject={isCreatingProject}
                            setIsCreatingProject={setIsCreatingProject}
                        />
                        <Import />
                    </motion.div>
                </div>
                <MobileEmailCapture />
            </div>
        </div>
    );
}

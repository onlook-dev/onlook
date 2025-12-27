'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';

import { api } from '@/trpc/react';
import { ExternalRoutes } from '@/utils/constants';
import { CreateError } from './create-error';
import { HighDemand } from './high-demand';
import { MobileEmailCapture } from './mobile-email-capture';
import { UnicornBackground } from './unicorn-background';

export function Hero() {
    const t = useTranslations('landing.hero');
    const router = useRouter();
    const [isShortScreen, setIsShortScreen] = useState(false);
    const [urlInput, setUrlInput] = useState('');

    useEffect(() => {
        const checkScreenHeight = () => {
            setIsShortScreen(window.innerHeight < 700);
        };

        checkScreenHeight();
        window.addEventListener('resize', checkScreenHeight);

        return () => window.removeEventListener('resize', checkScreenHeight);
    }, []);

    const createBuildSession = api.buildSession.create.useMutation({
        onSuccess: (data) => {
            // Navigate to preview page
            router.push(`/preview/${data.previewSlug}`);
        },
        onError: (error) => {
            toast.error('Failed to create build session', {
                description: error.message,
            });
        },
    });

    /**
     * Detect if input is a URL or an idea
     */
    const detectInputType = (input: string): 'url' | 'idea' => {
        try {
            new URL(input);
            return 'url';
        } catch {
            return 'idea';
        }
    };

    const handleGetScore = () => {
        if (!urlInput.trim()) {
            toast.error('Please enter a URL or describe your idea');
            return;
        }

        const inputType = detectInputType(urlInput);
        createBuildSession.mutate({
            inputType,
            inputValue: urlInput,
            language: 'en', // TODO: Get from locale
        });
    };

    return (
        <div className="relative flex h-full w-full flex-col items-center text-center text-lg">
            <UnicornBackground />
            <div className="mb-42 flex h-full w-full flex-col items-center justify-center gap-10 pt-12">
                <div className="relative z-20 flex flex-col items-center gap-6 pt-8 pb-2 max-w-4xl px-4">
                    <motion.h1
                        className="text-center text-6xl sm:text-7xl !leading-[0.9] leading-tight font-bold"
                        initial={{ opacity: 0, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                    >
                        {t('headline')}
                    </motion.h1>
                    <motion.p
                        className="text-foreground-secondary mt-2 max-w-2xl text-center text-lg sm:text-xl text-balance"
                        initial={{ opacity: 0, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
                        style={{ willChange: 'opacity, filter', transform: 'translateZ(0)' }}
                    >
                        {t('subhead')}
                    </motion.p>

                    {/* Build My Site Input */}
                    <motion.div
                        className="w-full max-w-2xl mt-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
                    >
                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <input
                                type="text"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                placeholder={t('inputPlaceholder')}
                                className="flex-1 rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                            <Button
                                onClick={handleGetScore}
                                disabled={createBuildSession.isPending}
                                className="bg-foreground-primary text-background-primary hover:bg-foreground-hover whitespace-nowrap px-6"
                                size="lg"
                            >
                                {createBuildSession.isPending ? (
                                    <>
                                        <Icons.Spinner className="h-4 w-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        {t('primaryCta')}
                                        <Icons.ArrowRight className="h-4 w-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>
                        <motion.p
                            className="text-foreground-secondary/80 mt-3 text-sm text-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                        >
                            {t('trustLine')}
                        </motion.p>
                    </motion.div>

                    {/* Secondary CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
                    >
                        <Button
                            variant="outline"
                            asChild
                            className="border-foreground-secondary/20 hover:bg-foreground-secondary/10"
                        >
                            <a href="#demo">
                                {t('secondaryCta')}
                            </a>
                        </Button>
                    </motion.div>

                    <HighDemand />
                    <CreateError />
                </div>
                <MobileEmailCapture />
            </div>
        </div>
    );
}

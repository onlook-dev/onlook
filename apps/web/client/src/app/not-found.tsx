'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { WebsiteLayout } from './_components/website-layout';
import { Illustrations } from './_components/landing-page/illustrations';

export default function NotFound() {
    return (
        <WebsiteLayout>
            <main className="relative min-h-screen w-full overflow-hidden">
                {/* Giant Onlook Seal - positioned to overflow top */}
                <motion.div
                    className="absolute left-1/2 -translate-x-1/2 -top-[35vh] pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
                >
                    <Illustrations.OnlookLogoSeal className="w-[90vw] h-[90vw] max-w-[1000px] max-h-[1000px] text-foreground-primary/10" />
                </motion.div>

                {/* Content - centered in viewport */}
                <div className="relative z-10 flex flex-col items-center justify-center min-h-screen w-full p-4 text-center pt-24">
                    <div className="max-w-md space-y-6 mt-[15vh]">
                        {/* Title and subtitle */}
                        <motion.div
                            className="space-y-3"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        >
                            <h1 className="text-6xl font-light tracking-tight text-foreground-primary">404</h1>
                            <p className="text-xl text-foreground-tertiary">
                                Seems like you ventured somewhere unknown on your journey. Let us help you find your way.
                            </p>
                        </motion.div>

                        {/* Home button */}
                        <motion.div
                            className="flex justify-center pt-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                        >
                            <Link
                                href="/"
                                className="inline-flex items-center rounded-md border border-foreground-primary/20 px-6 py-3 text-sm font-medium text-foreground-primary hover:bg-foreground-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
                            >
                                Back to home
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </main>
        </WebsiteLayout>
    );
}

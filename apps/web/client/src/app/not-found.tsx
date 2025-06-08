'use client';

import { Icons } from '@onlook/ui/icons/index';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function NotFound() {
    return (
        <main className="flex flex-1 flex-col items-center justify-center h-screen w-screen p-4 text-center bg-background text-foreground-primary">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="max-w-md space-y-8"
            >
                <div className="space-y-4">
                    <motion.div
                        initial={{ rotate: -10 }}
                        animate={{ rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                        className="text-6xl"
                    >
                        🕵️‍♂️
                    </motion.div>

                    <h1 className="text-5xl font-extrabold tracking-tight">
                        404 - Not Found
                    </h1>
                    <p className="text-lg text-foreground-secondary">
                        Oops! We couldn’t find the page you were looking for.<br />
                        It might have been moved or never existed at all.
                    </p>
                </div>

                <div className="flex justify-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        <Icons.ArrowLeft className="h-5 w-5" />
                        Back to Safety
                    </Link>
                </div>
            </motion.div>
        </main>
    );
}

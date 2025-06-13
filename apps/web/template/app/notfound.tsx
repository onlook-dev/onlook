'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function NotFound() {
    return (
        <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-background">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 120, damping: 10 }}
                className="flex flex-col items-center"
            >
                <motion.h1
                    className="text-6xl font-extrabold mb-4 text-primary"
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    404
                </motion.h1>
                <motion.p
                    className="text-xl mb-8 text-muted-foreground text-center max-w-md"
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    Oops! The page you’re looking for doesn’t exist or has been moved.
                </motion.p>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    <Link
                        href="/"
                        className="px-6 py-3 rounded-lg bg-primary text-white font-semibold shadow hover:bg-primary/90 transition"
                    >
                        Back to Safety
                    </Link>
                </motion.div>
            </motion.div>
        </main>
    );
}

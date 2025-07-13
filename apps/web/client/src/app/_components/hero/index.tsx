'use client';

import { motion } from 'framer-motion';
import { Button } from '@onlook/ui/button';
import Link from 'next/link';
import { ArrowRight, Code, Monitor, Brain, Shield, Database, Sparkles } from 'lucide-react';

export function Hero() {
    const features = [
        { icon: Code, text: "Extension Builder" },
        { icon: Monitor, text: "System Monitor" },
        { icon: Brain, text: "AI Studio" },
        { icon: Shield, text: "Security Suite" },
        { icon: Database, text: "Database Manager" },
        { icon: Sparkles, text: "Project Generator" }
    ];

    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-12 p-8 text-lg text-center relative">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-cyan-900/20" />
                <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-2000" />
            </div>

            <div className="flex flex-col gap-6 items-center relative z-20 pt-4 pb-2">
                <motion.h1
                    className="text-7xl font-bold leading-tight text-center !leading-[0.9]"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                        GeauxCode
                    </span>
                    <br />
                    <span className="text-4xl font-normal text-gray-300">Development Platform</span>
                </motion.h1>
                
                <motion.p
                    className="text-xl text-gray-400 max-w-2xl text-center mt-4"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    Your comprehensive toolkit for modern development. Build extensions,<br />
                    monitor systems, manage databases, create AI applications, and deploy<br />
                    with powerful generators and security tools.
                </motion.p>

                {/* Feature highlights */}
                <motion.div
                    className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-8 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                >
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300"
                        >
                            <feature.icon className="w-6 h-6 text-blue-400" />
                            <span className="text-xs text-gray-300 text-center">{feature.text}</span>
                        </div>
                    ))}
                </motion.div>

                {/* CTA Button */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
                >
                    <Link href="/dashboard">
                        <Button 
                            size="lg" 
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                        >
                            Launch Dashboard
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </Link>
                </motion.div>

                <motion.div
                    className="text-center text-sm text-gray-500 mt-4"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
                >
                    Free to use &bull; No credit card required &bull; Open source
                </motion.div>
            </div>
        </div>
    );
}
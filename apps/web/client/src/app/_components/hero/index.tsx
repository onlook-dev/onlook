'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { vujahdayScript } from '../../fonts';
import { Create } from './create';
import { CreateError } from './create-error';
import { UnicornBackground } from './unicorn-background';
import { HighDemand } from './high-demand';
import { Icons } from '@onlook/ui/icons';

export function Hero() {
    const [cardKey, setCardKey] = useState(0);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-12 p-8 text-lg text-center relative">
            <UnicornBackground />
            <div className="flex flex-col gap-3 items-center relative z-20 pt-4 pb-2">
                <motion.div 
                    className="flex flex-col gap-3 items-center relative z-20 pt-4 pb-2 mb-6"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.2, ease: "easeOut" }}
                >
                    <a 
                        href="https://www.ycombinator.com/companies/onlook/jobs/e4gHv1n-founding-engineer-fullstack" target="_blank" 
                        className="inline-flex items-center gap-2 px-3 py-1.5 hover:bg-foreground-secondary/20 backdrop-blur-sm border border-foreground-secondary/20 rounded-full text-xs text-foreground-secondary transition-all duration-200 hover:scale-102"
                    >
                        We're hiring engineers
                        <Icons.ArrowRight className="w-4 h-4" />
                    </a>
                    
                </motion.div>
                <motion.h1
                    className="text-6xl font-light leading-tight text-center !leading-[0.9]"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    Make your<br />
                    <span className="font-light">designs </span>
                    <span className={`italic font-normal ${vujahdayScript.className} text-[4.75rem] ml-1 leading-[1.0]`}>real</span>
                </motion.h1>
                <motion.p
                    className="text-lg text-foreground-secondary max-w-xl text-center mt-2"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    Onlook is a next-generation visual code editor<br />
                    that lets designers and product managers craft<br />
                    web experiences with AI
                </motion.p>
                <HighDemand />
                <CreateError />
            </div>
            <div className="sm:flex hidden flex-col gap-4 items-center relative z-20">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                    onAnimationComplete={() => {
                        setCardKey(prev => prev + 1);
                    }}
                >
                    <Create cardKey={cardKey} />
                </motion.div>
                <motion.div
                    className="text-center text-xs text-foreground-secondary mt-2 opacity-80"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
                    style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
                >
                    No Credit Card Required &bull; Get a Site in Seconds
                </motion.div>
            </div>
            <motion.div className="sm:hidden text-balance flex flex-col gap-4 items-center relative z-20 px-10 text-foreground-secondary bg-foreground-secondary/10 backdrop-blur-lg rounded-lg border-[0.5px] border-foreground-secondary/20 p-4"
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
                style={{ willChange: "opacity, filter", transform: "translateZ(0)" }}
            >
                Onlook isn't ready for Mobile – Please open on a larger screen
            </motion.div>
        </div>
    );
}
"use client";
import { Icons } from '@onlook/ui/icons';
import { WebsiteLayout } from '@/app/_components/website-layout';
import { CTASection } from '../_components/landing-page/cta-section';
import { Illustrations } from '../_components/landing-page/illustrations';
import { vujahdayScript } from '../fonts';
import { ButtonLink } from '../_components/button-link';
import { useGitHubStats } from '../_components/top-bar/github';
import { useParallaxCursor } from '../../hooks/use-parallax-cursor';
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect, useMemo } from 'react';

// Individual element blur animation component - Performance Optimized
function BlurInElement({ children, delay = 0, className = "" }: { 
    children: React.ReactNode; 
    delay?: number; 
    className?: string;
}) {
    const ref = useRef(null);
    const isInView = useInView(ref, { 
        once: true, 
        margin: "-50px 0px -50px 0px",
        amount: 0.3 
    });

    // Browser detection for performance optimization
    const [supportsBlur, setSupportsBlur] = useState(true);
    const [isReducedMotion, setIsReducedMotion] = useState(false);

    useEffect(() => {
        // Check for reduced motion preference
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setIsReducedMotion(mediaQuery.matches);

        // Check browser capabilities for blur filter performance
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let blurSupported = false; // Default to false, only enable if explicitly supported
        
        if (ctx) {
            // Test if blur filter is supported and performant
            try {
                ctx.filter = 'blur(1px)';
                blurSupported = true;
            } catch {
                blurSupported = false;
            }
        }

        // Additional browser-specific optimizations
        const userAgent = navigator.userAgent.toLowerCase();
        const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
        const isFirefox = /firefox/.test(userAgent);
        const isMobile = /mobile|android|iphone|ipad/.test(userAgent);
        const isMobileSafari = isSafari && isMobile;

        // Disable blur on mobile Safari (has animation completion issues), Firefox, and unsupported browsers
        // Mobile Safari blur animations can start but not resolve properly
        // Desktop Safari can handle blur animations with proper configuration
        if (isMobileSafari || isFirefox || !blurSupported) {
            setSupportsBlur(false);
        } else {
            setSupportsBlur(blurSupported);
        }
    }, []);

    // Use transform-based animation for better performance
    const animationProps = useMemo(() => {
        if (isReducedMotion) {
            return {
                initial: { opacity: 0 },
                animate: isInView ? { opacity: 1 } : { opacity: 0 },
                transition: { duration: 0.3, delay }
            };
        }

        if (supportsBlur) {
            return {
                initial: { opacity: 0, filter: "blur(4px)" },
                animate: isInView ? { opacity: 1, filter: "blur(0px)" } : { opacity: 0, filter: "blur(4px)" },
                transition: { 
                    duration: 0.6, 
                    delay, 
                    ease: "easeOut"
                }
            };
        }

        // Fallback: Use transform-based animation (much more performant)
        return {
            initial: { opacity: 0, transform: "translateY(20px) scale(0.95)" },
            animate: isInView ? { opacity: 1, transform: "translateY(0px) scale(1)" } : { opacity: 0, transform: "translateY(20px) scale(0.95)" },
            transition: { 
                duration: 0.5, 
                delay, 
                ease: [0.25, 0.46, 0.45, 0.94] // Custom easing for smooth feel
            }
        };
    }, [isInView, delay, supportsBlur, isReducedMotion]);

    return (
        <motion.div
            ref={ref}
            className={className}
            {...animationProps}
            style={{ 
                willChange: supportsBlur ? "opacity, filter" : "opacity, transform",
                transform: "translate3d(0, 0, 0)", // Force hardware acceleration
                backfaceVisibility: "hidden", // Prevent flickering
                perspective: "1000px" // Optimize 3D transforms
            }}
        >
            {children}
        </motion.div>
    );
}

export default function AboutPage() {
    const { raw: starCount, contributors } = useGitHubStats();
    const parallax = useParallaxCursor({ intensity: 0.15, smoothness: 0.08 });
    return (
        <WebsiteLayout showFooter={true}>
            <main className="bg-background text-foreground-primary">
                {/* Hero Section */}
                <section className="py-64 bg-black text-foreground-primary">
                    <div className="max-w-6xl mx-auto px-8">
                        <BlurInElement>
                            <h1 className="text-6xl font-light leading-tight mb-24 text-left">
                                Design deserves<br />better tools
                            </h1>
                        </BlurInElement>
                        
                        {/* Stats - shown below title on mobile/midsize, hidden on large screens */}
                        <BlurInElement delay={0.1}>
                            <div className="block lg:hidden mb-24">
                                <div className="grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-y-6 gap-x-6 w-full">
                                    {/* Stat 1 */}
                                    <div className="row-start-1 col-start-1 text-left">
                                        <div className="text-3xl font-light mb-1">{starCount !== null ? starCount.toLocaleString() : ''}</div>
                                        <div className="text-regular text-foreground-tertiary/80">Stars on GitHub</div>
                                    </div>
                                    {/* Stat 2 */}
                                    <div className="row-start-1 col-start-2 text-left mr-12 ">
                                        <div className="text-3xl font-light mb-1">{contributors !== null ? contributors.toLocaleString() : ''}</div>
                                        <div className="text-regular text-foreground-tertiary/80">Open-Source<br />Contributors</div>
                                    </div>
                                    {/* Stat 3 */}
                                    <div className="row-start-2 col-start-1 text-left">
                                        <div className="text-3xl font-light mb-1">2</div>
                                        <div className="text-regular text-foreground-tertiary/80">Team members</div>
                                    </div>
                                </div>
                            </div>
                        </BlurInElement>
                        
                        <div className="flex gap-12 flex-col md:flex-row md:items-start md:justify-between">
                            <BlurInElement delay={0.2}>
                                <div className=" max-w-lg text-left">
                                    <p className="text-lg md:text-large max-w-lg md:max-w-none text-foreground-secondary text-left font-light text-balance">
                                        Onlook was founded to obliterate the divide between creativity and implementation.<br /><br />
                                        For too long, the most brilliant creative teams have been severed by the complexity of tools. 
                                        We're building a global movement, led by a passionate and highly technical team based in San Francisco called "The Odyssey" to build a bridge that will end the gap between creativity and implementation.<br /><br />
                                        If you're deeply opinionated about design, developer tools, and how AI can enhance the creative process, or are looking to be a part of an entirely new kind of organization, apply to join The Odyssey below.
                                    </p>
                                </div>
                            </BlurInElement>
                            <BlurInElement delay={0.3}>
                                <div className="flex flex-col mt-12 lg:mt-0 hidden lg:block md:w-[340px] md:ml-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-y-12 gap-x-16 w-full">
                                        {/* Stat 1 */}
                                        <div className="row-start-1 col-start-1 text-left">
                                            <div className="text-4xl font-light mb-2">{starCount !== null ? starCount.toLocaleString() : ''}</div>
                                            <div className="text-regularPlus text-foreground-tertiary/80">Stars on GitHub</div>
                                        </div>
                                        {/* Stat 2 */}
                                        <div className="row-start-1 col-start-2 text-left">
                                            <div className="text-4xl font-light mb-2">{contributors !== null ? contributors.toLocaleString() : ''}</div>
                                            <div className="text-regularPlus text-foreground-tertiary/80">Open-Source<br />Contributors</div>
                                        </div>
                                        {/* Stat 3 */}
                                        <div className="row-start-2 col-start-1 text-left">
                                            <div className="text-4xl font-light mb-2">2</div>
                                            <div className="text-regularPlus text-foreground-tertiary/80">Team members</div>
                                        </div>
                                    </div>
                                </div>
                            </BlurInElement>
                        </div>
                    </div>
                </section>

            
                {/* Meet the Founders Section */}
                <section className="py-48">
                    <div className="max-w-6xl mx-auto px-8">
                        <div className="text-left mb-24">
                            <BlurInElement>
                                <h2 className="text-7xl font-light leading-tight mb-12 text-left">
                                    Meet the <span className={vujahdayScript.className + ' text-8xl ml-1 font-normal'}>founders</span>
                                </h2>
                            </BlurInElement>
                            <BlurInElement delay={0.1}>
                                <p className="text-lg md:text-large font-light text-foreground-secondary max-w-xl mt-8 mb-12 text-balance">
                                    Frustrated with the status quo of creating software, Daniel and Kiet teamed up to give engineers, builders, designers, and product managers a new way to collaborate in code.
                                </p>
                            </BlurInElement>
                            <BlurInElement delay={0.2}>
                                <div className="flex justify-start mt-8">
                                    <ButtonLink href="https://onlook.substack.com" target="_blank" rel="noopener noreferrer" rightIcon={<span className="ml-2">→</span>}>
                                        Read more on Substack
                                    </ButtonLink>
                                </div>
                            </BlurInElement>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                            {/* Founder 1 */}
                            <BlurInElement delay={0.3}>
                                <div className="flex gap-8 items-start rounded-2xl">
                                    <img src="/assets/about-daniel.png" alt="Daniel Farrell" className="w-28 h-28 rounded-2xl object-cover bg-neutral-800 flex-shrink-0" />
                                    <div className="flex flex-col">
                                        <h4 className="text-title3 md:text-largePlus mb-1">Daniel Farrell</h4>
                                        <p className="text-foreground-secondary mb-4 text-large md:text-regular">Design & Growth</p>
                                        <p className="text-foreground-secondary text-lg md:text-sm font-light mb-5 max-w-xs text-balance">Designer for over a decade, First 100 employee at Bird, former Head of Growth.</p>
                                        <div className="flex md:gap-3 gap-6 items-center">
                                            <a href="https://github.com/drfarrell" target="_blank" rel="noopener noreferrer" aria-label="Daniel's GitHub">
                                                <Icons.GitHubLogo className="w-6.5 md:w-4.5 h-6.5 md:h-4.5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                            </a>
                                            <a href="https://www.linkedin.com/in/danielrfarrell/" target="_blank" rel="noopener noreferrer" aria-label="Daniel's LinkedIn">
                                                <Icons.SocialLinkedIn className="w-7 md:w-5 h-7 md:h-5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                            </a>
                                            <a href="https://x.com/D_R_Farrell" target="_blank" rel="noopener noreferrer" aria-label="Daniel's X">
                                                <Icons.SocialX className="w-7 md:w-5 h-7 md:h-5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </BlurInElement>
                            {/* Founder 2 */}
                            <BlurInElement delay={0.4}>
                                <div className="flex gap-8 items-start rounded-2xl">
                                    <img src="/assets/about-kiet.png" alt="Kiet Ho" className="w-28 h-28 rounded-2xl object-cover bg-neutral-800 flex-shrink-0" />
                                    <div className="flex flex-col">
                                        <h4 className="text-title3 md:text-largePlus mb-1">Kiet Ho</h4>
                                        <p className="text-foreground-secondary mb-4 text-large md:text-regular">Engineering</p>
                                        <p className="text-foreground-secondary text-lg md:text-sm font-light mb-5 max-w-xs text-balance">Ex-Amazon, maintained the design system at ServiceNow, jiu-jitsu fighter.</p>
                                        <div className="flex md:gap-3 gap-6 items-center">
                                            <a href="https://github.com/Kitenite" target="_blank" rel="noopener noreferrer" aria-label="Kiet's GitHub">
                                                <Icons.GitHubLogo className="w-6.5 md:w-4.5 h-6.5 md:h-4.5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                            </a>
                                            <a href="https://www.linkedin.com/in/kiet-ho/" target="_blank" rel="noopener noreferrer" aria-label="Kiet's LinkedIn">
                                                <Icons.SocialLinkedIn className="w-7 md:w-5 h-7 md:h-5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                            </a>
                                            <a href="https://x.com/flyakiet" target="_blank" rel="noopener noreferrer" aria-label="Kiet's X">
                                                <Icons.SocialX className="w-7 md:w-5 h-7 md:h-5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </BlurInElement>
                        </div>
                        <div className="text-left mt-24">
                            
                        </div>
                    </div>
                </section>

                {/* Creative Headquarters Section */}
                <section className="relative w-full min-h-[80vh] bg-black flex flex-col items-center justify-center py-20 md:py-80 overflow-x-clip">
                    <div className="w-full mx-auto flex flex-col gap-16 md:gap-36 px-3 md:px-0">
                        {/* Title Section */}
                        <div className="flex max-w-5xl mx-auto flex-col md:flex-row items-center justify-between w-full relative">
                            <BlurInElement>
                                <div className="pl-0 md:pl-12 mb-12 md:mb-0 w-full pl-4">
                                    <h2 className="text-white text-5xl md:text-6xl font-light leading-tight mb-0 ">
                                        Welcome to<br />headquarters
                                    </h2>
                                </div>
                            </BlurInElement>
                            {/* Desktop only image */}
                            <BlurInElement delay={0.1}>
                                <img 
                                    src="/assets/about-office-1.png" 
                                    alt="Office space" 
                                    className="hidden md:block w-[400px] h-[400px] object-cover mb-0 transition-transform duration-300 ease-out pointer-events-none select-none" 
                                    style={{
                                        transform: `translate(${parallax.x * 60}px, ${parallax.y * 45}px)`
                                    }}
                                />
                            </BlurInElement>
                        </div>

                        {/* Mobile Image Gallery - Creative Layout */}
                        <div className="md:hidden w-full">
                            {/* Mobile Grid Layout */}
                            <BlurInElement delay={0.1}>
                                <div className="grid grid-cols-1 gap-4 mb-4">
                                    {/* Top row - 2 images */}
                                    <div className="space-y-4">
                                        <img 
                                            src="/assets/about-office-1.png" 
                                            alt="Office space" 
                                            className="w-full h-100 object-cover transition-transform duration-300 ease-out pointer-events-none select-none" 
                                        />
                                        <img 
                                            src="/assets/about-office-3.png" 
                                            alt="Office space" 
                                            className="w-full h-100 object-cover transition-transform duration-300 ease-out pointer-events-none select-none" 
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <img 
                                            src="/assets/about-office-2.png" 
                                            alt="Office space" 
                                            className="w-full h-100 object-cover transition-transform duration-300 ease-out pointer-events-none select-none" 
                                        />
                                    </div>
                                </div>
                            </BlurInElement>
                            
                            {/* Earn your stake text after third image */}
                            <BlurInElement delay={0.2}>
                                <div className="flex flex-col items-start justify-center text-white text-left px-12 py-48 mb-4">
                                    <span className="mb-8 text-foreground-primary text-3xl font-light">Earn your stake<br />in the future of<br />creative work</span>
                                    <ButtonLink  href="https://www.ycombinator.com/companies/onlook/jobs/e4gHv1n-founding-engineer-fullstack" target="_blank" rel="noopener noreferrer" rightIcon={<span className="ml-2">→</span>}>
                                        Claim your desk
                                    </ButtonLink>
                                </div>
                            </BlurInElement>
                            
                            {/* Bottom centered image */}
                            <BlurInElement delay={0.3}>
                                <div className="flex flex-col justify-center gap-4">
                                    <img 
                                        src="/assets/about-office-5.png" 
                                        alt="Office space" 
                                        className="w-full h-100 object-cover transition-transform duration-300 ease-out pointer-events-none select-none" 
                                    />
                                    <img 
                                            src="/assets/about-office-4.png" 
                                            alt="Office space" 
                                        className="w-full h-100 object-cover transition-transform duration-300 ease-out pointer-events-none select-none" 
                                    />
                                </div>
                            </BlurInElement>
                        </div>

                        {/* Desktop Layout - Hidden on Mobile */}
                        <div className="hidden md:block">
                            {/* Row 2: Three elements, offset right */}
                            <div className="flex flex-row items-center justify-center gap-42 w-full relative max-w-8xl">
                                <BlurInElement delay={0.1}>
                                    <img 
                                        src="/assets/about-office-2.png" 
                                        alt="Office space" 
                                        className="w-[400px] h-[400px] object-cover relative bottom-[60px] ml-12 transition-transform duration-300 ease-out pointer-events-none select-none" 
                                        style={{
                                            transform: `translate(${parallax.x * -50}px, ${parallax.y * 80}px)`
                                        }}
                                    />
                                </BlurInElement>
                                <BlurInElement delay={0.2}>
                                    <div className="flex flex-col items-start justify-center text-white text-regular text-left min-w-[400px] px-8 relative left-24">
                                        <span className="mb-8 text-foreground-primary text-lg md:text-3xl font-light">Earn your stake<br />in the future of<br />creative work</span>
                                        <ButtonLink  href="https://www.ycombinator.com/companies/onlook/jobs/e4gHv1n-founding-engineer-fullstack" target="_blank" rel="noopener noreferrer" rightIcon={<span className="ml-2">→</span>}>
                                            Claim your desk
                                        </ButtonLink>
                                    </div>
                                </BlurInElement>
                                <BlurInElement delay={0.3}>
                                    <img 
                                        src="/assets/about-office-3.png" 
                                        alt="Office space" 
                                        className="w-[400px] h-[400px] object-cover transition-transform duration-300 ease-out pointer-events-none select-none" 
                                        style={{
                                            transform: `translate(${parallax.x * 55}px, ${parallax.y * -40}px)`
                                        }}
                                    />
                                </BlurInElement>
                            </div>
                            {/* Row 3: Two left-offset squares */}
                            <div className="flex flex-row items-center justify-center gap-60 pt-12">
                                <BlurInElement delay={0.4}>
                                    <div className="w-[400px] aspect-square relative -ml-70 top-48 transition-transform duration-300 ease-out" style={{
                                        transform: `translate(${parallax.x * -70}px, ${parallax.y * 60}px)`
                                        }}>
                                        <img
                                            src="/assets/about-office-4.png"
                                            alt="Office space"
                                            className="w-full h-full object-cover pointer-events-none select-none"
                                        />
                                    </div>
                                </BlurInElement>
                                <BlurInElement delay={0.5}>
                                    <img 
                                        src="/assets/about-office-5.png" 
                                        alt="Office space" 
                                        className="w-[400px] h-[400px] object-cover relative left-20 top-24 transition-transform duration-300 ease-out pointer-events-none select-none" 
                                        style={{
                                            transform: `translate(${parallax.x * 65}px, ${parallax.y * -65}px)`                                    }}
                                    />
                                </BlurInElement>
                            </div>
                        </div>


                    </div>
                </section>


                {/* Values Section */}
                <section className="py-60 bg-black text-foreground-primary">
                    <div className="max-w-6xl mx-auto px-8">
                        <BlurInElement>
                            <h2 className="text-7xl font-light leading-tight mb-20 text-left">
                                What we <span className={vujahdayScript.className + ' text-8xl ml-1 font-normal'}>reward</span>
                            </h2>
                        </BlurInElement>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-16 md:gap-x-24 gap-x-12 mb-16">
                            {/* Speed */}
                            <BlurInElement delay={0.1}>
                                <div className="flex flex-col items-start text-left">
                                    <Illustrations.AboutSpeed className="w-26 h-20 mb-6 text-foreground-primary" />
                                    <h3 className="text-xl font-normal mb-2">Speed</h3>
                                    <p className="text-foreground-secondary text-lg md:text-large font-light text-balance">Setting an olympic pace, relentlessness, strategy through execution.</p>
                                </div>
                            </BlurInElement>
                            {/* Resilience */}
                            <BlurInElement delay={0.2}>
                                <div className="flex flex-col items-start text-left">
                                    <Illustrations.AboutResilience className="w-20 h-20 mb-6 text-foreground-primary" />
                                    <h3 className="text-xl font-normal mb-2">Resilience</h3>
                                    <p className="text-foreground-secondary text-lg md:text-large font-light text-balance">Enduring challenges without losing momentum – grit, stamina, and drive.</p>
                                </div>
                            </BlurInElement>
                            {/* Reinvention */}
                            <BlurInElement delay={0.3}>
                                <div className="flex flex-col items-start text-left">
                                    <Illustrations.AboutReinvention className="w-20 h-20 mb-6 text-foreground-primary" />
                                    <h3 className="text-xl font-normal mb-2">Reinvention</h3>
                                    <p className="text-foreground-secondary text-lg md:text-large font-light text-balance">Creativity in approaching problems, pushing us beyond the state-of-the-art.</p>
                                </div>
                            </BlurInElement>
                            {/* Competence */}
                            <BlurInElement delay={0.4}>
                                <div className="flex flex-col items-start text-left">
                                    <Illustrations.AboutCompetence className="w-20 h-20 mb-6 py-4 pr-3 text-foreground-primary" />
                                    <h3 className="text-xl font-normal mb-2">Competence</h3>
                                    <p className="text-foreground-secondary text-lg md:text-large font-light text-balance">Taking pride in one's work, inspiring others with your taste and technique.</p>
                                </div>
                            </BlurInElement>
                        </div>
                        <BlurInElement delay={0.5}>
                            <div className="flex justify-start">
                                <ButtonLink href="https://www.ycombinator.com/companies/onlook/jobs/e4gHv1n-founding-engineer-fullstack" target="_blank" rel="noopener noreferrer" rightIcon={<span className="ml-2">→</span>}>
                                    Browse open roles
                                </ButtonLink>
                            </div>
                        </BlurInElement>
                    </div>
                </section>

                {/* What we look for Section */}
                <section className="py-56 bg-black text-foreground-primary">
                    <div className="max-w-6xl mx-auto px-8">
                        <BlurInElement>
                            <h2 className="text-7xl font-light leading-tight mb-20 text-left">
                                What we <span className={vujahdayScript.className + ' text-8xl ml-1 font-normal'}>look&nbsp;for</span>
                            </h2>
                        </BlurInElement>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-16 gap-x-24">
                            {/* Commitment */}
                            <BlurInElement delay={0.1}>
                                <div className="flex flex-col items-start text-left">
                                    <h3 className="text-title3 font-normal mb-4">Commitment</h3>
                                    <p className="text-foreground-secondary text-regular font-light text-balance">Have you put real time into something you cared about? We're looking for builders who've made long-term bets on themselves.</p>
                                </div>
                            </BlurInElement>
                            {/* Passion */}
                            <BlurInElement delay={0.2}>
                                <div className="flex flex-col items-start text-left">
                                    <h3 className="text-title3 font-normal mb-4">Passion</h3>
                                    <p className="text-foreground-secondary text-regular font-light text-balance">We're allergic to apathy. We want people who give a damn about design, devtools, or AI – and have receipts.</p>
                                </div>
                            </BlurInElement>
                            {/* Excellence */}
                            <BlurInElement delay={0.3}>
                                <div className="flex flex-col items-start text-left">
                                    <h3 className="text-title3 font-normal mb-4">Excellence</h3>
                                    <p className="text-foreground-secondary text-regular font-light text-balance">Bring something rare. We want people who are world-class at something and won't compromise.</p>
                                </div>
                            </BlurInElement>
                        </div>
                    </div>
                </section>


                {/* Our Process Section */}
                <section className="py-56 bg-black text-foreground-primary">
                    <div className="max-w-6xl mx-auto px-8 flex flex-col md:flex-row justify-between gap-32">
                        {/* Left: Title and CTA */}
                        <div className="flex flex-col items-start justify-start mb-16 md:mb-0">
                            <BlurInElement>
                                <h2 className="text-7xl font-light leading-tight mb-12 text-left">Join the Odyssey</h2>
                            </BlurInElement>
                            <BlurInElement delay={0.1}>
                                <ButtonLink href="https://www.ycombinator.com/companies/onlook/jobs/e4gHv1n-founding-engineer-fullstack" target="_blank" rel="noopener noreferrer" rightIcon={<span className="ml-2">→</span>}>
                                    Take a leap of faith in yourself
                                </ButtonLink>
                            </BlurInElement>
                        </div>
                        {/* Right: Timeline */}
                        <div className="relative max-w-[500px]">
                            {/* Timeline vertical line (left-aligned) */}
                            <BlurInElement delay={0.8}>
                                <div className="absolute left-0 top-2 bottom-16 w-px bg-foreground-primary/20 z-0" />
                            </BlurInElement>
                            {/* Vertical shimmer overlay */}
                            <div className="absolute left-0 top-2 bottom-16 w-px bg-gradient-to-b from-transparent via-white/60 to-transparent bg-[length:100%_200%] animate-shimmer-vertical z-10" />
                            <div className="relative z-10 flex flex-col gap-0">
                                {/* Step 1: Apply directly */}
                                <BlurInElement delay={0.2}>
                                    <div className="flex flex-row items-start mb-16 relative">
                                        <div className="w-3 h-3 bg-foreground-tertiary absolute left-0 top-2 transform -translate-x-1/2" />
                                        <div className="ml-12">
                                            <div className="mb-1 text-lg">Apply directly</div>
                                            <div className="text-foreground-secondary text-regular text-balance">Send in your application and a link to a project you've made. For extra clout, tackle an issue on GitHub and add it in your application</div>
                                        </div>
                                    </div>
                                </BlurInElement>
                                {/* Step 2: Screening call */}
                                <BlurInElement delay={0.3}>
                                    <div className="flex flex-row items-start mb-16 relative">
                                        <div className="w-3 h-3 bg-foreground-tertiary absolute left-0 top-2 transform -translate-x-1/2" />
                                        <div className="ml-12">
                                            <div className="mb-1 text-lg">Screening call with each of the Founders</div>
                                            <div className="text-foreground-secondary text-regular text-balance">Walk us through your experience, share your learnings, and help us understand who you are.</div>
                                        </div>
                                    </div>
                                </BlurInElement>
                                {/* Step 3: Technical interview */}
                                <BlurInElement delay={0.4}>
                                    <div className="flex flex-row items-start mb-16 relative">
                                        <div className="w-3 h-3 bg-foreground-tertiary absolute left-0 top-2 transform -translate-x-1/2" />
                                        <div className="ml-12">
                                            <div className="mb-1 text-lg">Technical interview</div>
                                            <div className="text-foreground-secondary text-regular text-balance">We'll ask about the projects you've built and do a deep-dive into the implementation and decisions you've made.</div>
                                        </div>
                                    </div>
                                </BlurInElement>
                                {/* Step 4: Two reference calls */}
                                <BlurInElement delay={0.5}>
                                    <div className="flex flex-row items-start mb-16 relative">
                                        <div className="w-3 h-3 bg-foreground-tertiary absolute left-0 top-2 transform -translate-x-1/2" />
                                        <div className="ml-12">
                                            <div className="mb-1 text-lg">Two reference calls</div>
                                            <div className="text-foreground-secondary text-regular text-balance">Connect us with trusted managers or colleagues who can vouch for your work.</div>
                                        </div>
                                    </div>
                                </BlurInElement>
                                {/* Step 5: Paid work trial */}
                                <BlurInElement delay={0.6}>
                                    <div className="flex flex-row items-start mb-16 relative">
                                        <div className="w-3 h-3 bg-foreground-tertiary absolute left-0 top-2 transform -translate-x-1/2" />
                                        <div className="ml-12">
                                            <div className="mb-1 text-lg">Paid work trial</div>
                                            <div className="text-foreground-secondary text-regular text-balance">Collaborate with us on a problem and get a feel for what it's like to work with the team at Onlook.</div>
                                        </div>
                                    </div>
                                </BlurInElement>
                                {/* Step 6: Offer */}
                                <BlurInElement delay={0.7}>
                                    <div className="flex flex-row items-start relative">
                                        <div className="w-3 h-3 bg-foreground-tertiary absolute left-0 top-2 transform -translate-x-1/2" />
                                        <div className="ml-12">
                                            <div className="mb-1 text-lg">Offer</div>
                                            <div className="text-foreground-secondary text-regular text-balance">You're brought in as an expert and we trust you'll make the right calls.</div>
                                        </div>
                                    </div>
                                </BlurInElement>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <CTASection href="https://www.ycombinator.com/companies/onlook/jobs/e4gHv1n-founding-engineer-fullstack" ctaText="Apply today" buttonText="Browse open roles" showSubtext={false} />
        </WebsiteLayout>
    );
} 

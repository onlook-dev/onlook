'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

import { useReducedMotion } from '@onlook/ui/hooks';
import { Icons } from '@onlook/ui/icons';

import { WebsiteLayout } from '@/app/_components/website-layout';
import { ButtonLink } from '../_components/button-link';
import { CTASection } from '../_components/landing-page/cta-section';
import { Illustrations } from '../_components/landing-page/illustrations';
import { useGitHubStats } from '../_components/top-bar/github';
import { useParallaxCursor } from '../../hooks/use-parallax-cursor';
import { vujahdayScript } from '../fonts';

export default function AboutPage() {
    const { raw: starCount, contributors } = useGitHubStats();
    const parallax = useParallaxCursor({ intensity: 0.15, smoothness: 0.08 });
    const prefersReducedMotion = useReducedMotion();

    // Responsive state for mobile detection
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Timeline line dynamic positioning
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const firstSquareRef = useRef<HTMLDivElement>(null);
    const lastSquareRef = useRef<HTMLDivElement>(null);
    const [lineStyle, setLineStyle] = useState<{ top: number; height: number }>({
        top: 0,
        height: 0,
    });

    useLayoutEffect(() => {
        function updateLine() {
            if (!timelineContainerRef.current || !firstSquareRef.current || !lastSquareRef.current)
                return;
            const containerRect = timelineContainerRef.current.getBoundingClientRect();
            const firstRect = firstSquareRef.current.getBoundingClientRect();
            const lastRect = lastSquareRef.current.getBoundingClientRect();
            const top = firstRect.top + firstRect.height / 2 - containerRect.top;
            const bottom = lastRect.top + lastRect.height / 2 - containerRect.top;
            setLineStyle({ top, height: bottom - top });
        }
        updateLine();
        window.addEventListener('resize', updateLine);
        return () => window.removeEventListener('resize', updateLine);
    }, []);

    // Helper function to conditionally apply blur animations based on reduced motion preference
    const getBlurAnimationProps = (delay = 0, includeStyle = true, customViewport?: any) => {
        const baseProps = {
            initial: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(4px)' },
            whileInView: prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, filter: 'blur(0px)' },
            viewport: customViewport || {
                once: true,
                margin: '-100px 0px -100px 0px',
                amount: 0.3,
            },
            transition: {
                duration: prefersReducedMotion ? 0.3 : 0.6,
                delay,
                ease: [0.25, 0.46, 0.45, 0.94] as const,
            },
        };

        if (includeStyle) {
            return {
                ...baseProps,
                style: {
                    willChange: prefersReducedMotion ? 'opacity' : 'opacity, filter',
                    transform: 'translateZ(0)',
                },
            };
        }

        return baseProps;
    };

    return (
        <WebsiteLayout showFooter={true}>
            <main className="bg-background text-foreground-primary">
                {/* Hero Section */}
                <section className="text-foreground-primary bg-black py-64">
                    <div className="mx-auto max-w-6xl px-8">
                        <motion.h1
                            className="mb-24 text-left text-6xl leading-tight font-light"
                            {...getBlurAnimationProps()}
                        >
                            Design deserves
                            <br />
                            better tools
                        </motion.h1>

                        {/* Stats - shown below title on mobile/midsize, hidden on large screens */}
                        <motion.div
                            className="mb-24 block lg:hidden"
                            {...getBlurAnimationProps(0.1)}
                        >
                            <div className="grid w-full grid-cols-1 grid-rows-2 gap-x-6 gap-y-6 md:grid-cols-2">
                                {/* Stat 1 */}
                                <div className="col-start-1 row-start-1 text-left">
                                    <div className="mb-1 text-3xl font-light">
                                        {starCount !== null ? starCount.toLocaleString() : ''}
                                    </div>
                                    <div className="text-regular text-foreground-tertiary/80">
                                        Stars on GitHub
                                    </div>
                                </div>
                                {/* Stat 2 */}
                                <div className="col-start-2 row-start-1 mr-12 text-left">
                                    <div className="mb-1 text-3xl font-light">
                                        {contributors !== null ? contributors.toLocaleString() : ''}
                                    </div>
                                    <div className="text-regular text-foreground-tertiary/80">
                                        Open-Source
                                        <br />
                                        Contributors
                                    </div>
                                </div>
                                {/* Stat 3 */}
                                <div className="col-start-1 row-start-2 text-left">
                                    <div className="mb-1 text-3xl font-light">2</div>
                                    <div className="text-regular text-foreground-tertiary/80">
                                        Team members
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
                            <motion.div
                                className="max-w-lg text-left"
                                {...getBlurAnimationProps(0.2)}
                            >
                                <p className="md:text-large text-foreground-secondary max-w-lg text-left text-lg font-light text-balance md:max-w-none">
                                    Onlook was founded to obliterate the divide between creativity
                                    and implementation.
                                    <br />
                                    <br />
                                    For too long, the most brilliant creative teams have been
                                    severed by the complexity of tools. We're building a global
                                    movement, led by a passionate and highly technical team based in
                                    San Francisco called "The Odyssey" to build a bridge that will
                                    end the gap between creativity and implementation.
                                    <br />
                                    <br />
                                    If you're deeply opinionated about design, developer tools, and
                                    how AI can enhance the creative process, or are looking to be a
                                    part of an entirely new kind of organization, apply to join The
                                    Odyssey below.
                                </p>
                            </motion.div>
                            <motion.div
                                className="mt-12 flex hidden flex-col md:ml-auto md:w-[340px] lg:mt-0 lg:block"
                                {...getBlurAnimationProps(0.3)}
                            >
                                <div className="grid w-full grid-cols-1 grid-rows-2 gap-x-16 gap-y-12 md:grid-cols-2">
                                    {/* Stat 1 */}
                                    <div className="col-start-1 row-start-1 text-left">
                                        <div className="mb-2 text-4xl font-light">
                                            {starCount !== null ? starCount.toLocaleString() : ''}
                                        </div>
                                        <div className="text-regularPlus text-foreground-tertiary/80">
                                            Stars on GitHub
                                        </div>
                                    </div>
                                    {/* Stat 2 */}
                                    <div className="col-start-2 row-start-1 text-left">
                                        <div className="mb-2 text-4xl font-light">
                                            {contributors !== null
                                                ? contributors.toLocaleString()
                                                : ''}
                                        </div>
                                        <div className="text-regularPlus text-foreground-tertiary/80">
                                            Open-Source
                                            <br />
                                            Contributors
                                        </div>
                                    </div>
                                    {/* Stat 3 */}
                                    <div className="col-start-1 row-start-2 text-left">
                                        <div className="mb-2 text-4xl font-light">2</div>
                                        <div className="text-regularPlus text-foreground-tertiary/80">
                                            Team members
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Meet the Founders Section */}
                <section className="py-48">
                    <div className="mx-auto max-w-6xl px-8">
                        <div className="mb-24 text-left">
                            <motion.h2
                                className="mb-12 text-left text-7xl leading-tight font-light"
                                initial={{ opacity: 0, filter: 'blur(4px)' }}
                                whileInView={{ opacity: 1, filter: 'blur(0px)' }}
                                viewport={{
                                    once: true,
                                    margin: '-100px 0px -100px 0px',
                                    amount: 0.3,
                                }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                style={{
                                    willChange: 'opacity, filter',
                                    transform: 'translateZ(0)',
                                }}
                            >
                                Meet the{' '}
                                <span
                                    className={
                                        vujahdayScript.className + ' ml-1 text-8xl font-normal'
                                    }
                                >
                                    founders
                                </span>
                            </motion.h2>
                            <motion.p
                                className="md:text-large text-foreground-secondary mt-8 mb-12 max-w-xl text-lg font-light text-balance"
                                initial={{ opacity: 0, filter: 'blur(4px)' }}
                                whileInView={{ opacity: 1, filter: 'blur(0px)' }}
                                viewport={{
                                    once: true,
                                    margin: '-100px 0px -100px 0px',
                                    amount: 0.3,
                                }}
                                transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
                                style={{
                                    willChange: 'opacity, filter',
                                    transform: 'translateZ(0)',
                                }}
                            >
                                Frustrated with the status quo of creating software, Daniel and Kiet
                                teamed up to give engineers, builders, designers, and product
                                managers a new way to collaborate in code.
                            </motion.p>
                            <motion.div
                                className="mt-8 flex justify-start"
                                initial={{ opacity: 0, filter: 'blur(4px)' }}
                                whileInView={{ opacity: 1, filter: 'blur(0px)' }}
                                viewport={{
                                    once: true,
                                    margin: '-100px 0px -100px 0px',
                                    amount: 0.3,
                                }}
                                transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
                                style={{
                                    willChange: 'opacity, filter',
                                    transform: 'translateZ(0)',
                                }}
                            >
                                <ButtonLink
                                    href="https://onlook.substack.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    rightIcon={<span className="ml-2">→</span>}
                                >
                                    Read more on Substack
                                </ButtonLink>
                            </motion.div>
                        </div>
                        <div className="grid grid-cols-1 gap-x-16 gap-y-12 md:grid-cols-2">
                            {/* Founder 1 */}
                            <motion.div
                                className="flex items-start gap-8 rounded-2xl"
                                {...getBlurAnimationProps(0.7)}
                            >
                                <img
                                    src="/assets/about-daniel.png"
                                    alt="Daniel Farrell"
                                    className="h-28 w-28 flex-shrink-0 rounded-2xl bg-neutral-800 object-cover"
                                />
                                <div className="flex flex-col">
                                    <h4 className="text-title3 md:text-largePlus mb-1">
                                        Daniel Farrell
                                    </h4>
                                    <p className="text-foreground-secondary text-large md:text-regular mb-4">
                                        Design & Growth
                                    </p>
                                    <p className="text-foreground-secondary mb-5 max-w-xs text-lg font-light text-balance md:text-sm">
                                        Designer for over a decade, First 100 employee at Bird,
                                        former Head of Growth.
                                    </p>
                                    <div className="flex items-center gap-6 md:gap-3">
                                        <a
                                            href="https://github.com/drfarrell"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Daniel's GitHub"
                                        >
                                            <Icons.GitHubLogo className="text-foreground-secondary hover:text-foreground-primary h-6.5 w-6.5 transition-colors md:h-4.5 md:w-4.5" />
                                        </a>
                                        <a
                                            href="https://www.linkedin.com/in/danielrfarrell/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Daniel's LinkedIn"
                                        >
                                            <Icons.SocialLinkedIn className="text-foreground-secondary hover:text-foreground-primary h-7 w-7 transition-colors md:h-5 md:w-5" />
                                        </a>
                                        <a
                                            href="https://x.com/D_R_Farrell"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Daniel's X"
                                        >
                                            <Icons.SocialX className="text-foreground-secondary hover:text-foreground-primary h-7 w-7 transition-colors md:h-5 md:w-5" />
                                        </a>
                                    </div>
                                </div>
                            </motion.div>
                            {/* Founder 2 */}
                            <motion.div
                                className="flex items-start gap-8 rounded-2xl"
                                {...getBlurAnimationProps(0.9)}
                            >
                                <img
                                    src="/assets/about-kiet.png"
                                    alt="Kiet Ho"
                                    className="h-28 w-28 flex-shrink-0 rounded-2xl bg-neutral-800 object-cover"
                                />
                                <div className="flex flex-col">
                                    <h4 className="text-title3 md:text-largePlus mb-1">Kiet Ho</h4>
                                    <p className="text-foreground-secondary text-large md:text-regular mb-4">
                                        Engineering
                                    </p>
                                    <p className="text-foreground-secondary mb-5 max-w-xs text-lg font-light text-balance md:text-sm">
                                        Ex-Amazon, maintained the design system at ServiceNow,
                                        jiu-jitsu fighter.
                                    </p>
                                    <div className="flex items-center gap-6 md:gap-3">
                                        <a
                                            href="https://github.com/Kitenite"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Kiet's GitHub"
                                        >
                                            <Icons.GitHubLogo className="text-foreground-secondary hover:text-foreground-primary h-6.5 w-6.5 transition-colors md:h-4.5 md:w-4.5" />
                                        </a>
                                        <a
                                            href="https://www.linkedin.com/in/kiet-ho/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Kiet's LinkedIn"
                                        >
                                            <Icons.SocialLinkedIn className="text-foreground-secondary hover:text-foreground-primary h-7 w-7 transition-colors md:h-5 md:w-5" />
                                        </a>
                                        <a
                                            href="https://x.com/flyakiet"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Kiet's X"
                                        >
                                            <Icons.SocialX className="text-foreground-secondary hover:text-foreground-primary h-7 w-7 transition-colors md:h-5 md:w-5" />
                                        </a>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Creative Headquarters Section */}
                <section className="relative flex min-h-[80vh] w-full flex-col items-center justify-center overflow-x-clip bg-black py-20 md:py-80">
                    <div className="mx-auto flex w-full flex-col gap-16 px-3 md:gap-36 md:px-0">
                        {/* Title Section */}
                        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-between md:flex-row">
                            <motion.div
                                className="mb-12 w-full pl-0 md:mb-0 md:pl-12"
                                {...getBlurAnimationProps()}
                            >
                                <h2 className="mb-0 text-5xl leading-tight font-light text-white md:text-6xl">
                                    Welcome to
                                    <br />
                                    headquarters
                                </h2>
                            </motion.div>
                            {/* Desktop only image */}
                            <motion.img
                                src="/assets/about-office-1.png"
                                alt="Office space"
                                className="pointer-events-none mb-0 hidden h-[400px] w-[400px] object-cover transition-transform duration-300 ease-out select-none md:block"
                                style={{
                                    transform: `translate(${parallax.x * 60}px, ${parallax.y * 45}px)`,
                                    willChange: prefersReducedMotion
                                        ? 'opacity'
                                        : 'opacity, filter',
                                }}
                                {...getBlurAnimationProps(0.1, false)}
                            />
                        </div>

                        {/* Mobile Image Gallery - Creative Layout */}
                        <div className="w-full md:hidden">
                            {/* Mobile Grid Layout */}
                            <div className="mb-4 grid grid-cols-1 gap-4">
                                {/* Top row - 2 images */}
                                <div className="space-y-4">
                                    <motion.img
                                        src="/assets/about-office-1.png"
                                        alt="Office space"
                                        className="pointer-events-none h-100 w-full object-cover transition-transform duration-300 ease-out select-none"
                                        {...getBlurAnimationProps(0.1, false, {
                                            once: true,
                                            margin: isMobile
                                                ? '-50px 0px -50px 0px'
                                                : '-100px 0px -100px 0px',
                                            amount: isMobile ? 0.1 : 0.3,
                                        })}
                                    />
                                    <motion.img
                                        src="/assets/about-office-3.png"
                                        alt="Office space"
                                        className="pointer-events-none h-100 w-full object-cover transition-transform duration-300 ease-out select-none"
                                        {...getBlurAnimationProps(0.2, false, {
                                            once: true,
                                            margin: isMobile
                                                ? '-50px 0px -50px 0px'
                                                : '-100px 0px -100px 0px',
                                            amount: isMobile ? 0.1 : 0.3,
                                        })}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <motion.img
                                        src="/assets/about-office-2.png"
                                        alt="Office space"
                                        className="pointer-events-none h-100 w-full object-cover transition-transform duration-300 ease-out select-none"
                                        {...getBlurAnimationProps(0.3, false, {
                                            once: true,
                                            margin: isMobile
                                                ? '-50px 0px -50px 0px'
                                                : '-100px 0px -100px 0px',
                                            amount: isMobile ? 0.1 : 0.3,
                                        })}
                                    />
                                </div>
                            </div>

                            {/* Earn your stake text after third image */}
                            <motion.div
                                className="mb-4 flex flex-col items-start justify-center px-12 py-48 text-left text-white"
                                {...getBlurAnimationProps(0.2)}
                            >
                                <span className="text-foreground-primary mb-8 text-3xl font-light">
                                    Earn your stake
                                    <br />
                                    in the future of
                                    <br />
                                    creative work
                                </span>
                                <ButtonLink
                                    href="https://www.ycombinator.com/companies/onlook/jobs/e4gHv1n-founding-engineer-fullstack"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    rightIcon={<span className="ml-2">→</span>}
                                >
                                    Claim your desk
                                </ButtonLink>
                            </motion.div>

                            {/* Bottom centered image */}
                            <div className="flex flex-col justify-center gap-4">
                                <motion.img
                                    src="/assets/about-office-5.png"
                                    alt="Office space"
                                    className="pointer-events-none h-100 w-full object-cover transition-transform duration-300 ease-out select-none"
                                    {...getBlurAnimationProps(0.4, false, {
                                        once: true,
                                        margin: isMobile
                                            ? '-50px 0px -50px 0px'
                                            : '-100px 0px -100px 0px',
                                        amount: isMobile ? 0.1 : 0.3,
                                    })}
                                />
                                <motion.img
                                    src="/assets/about-office-4.png"
                                    alt="Office space"
                                    className="pointer-events-none h-100 w-full object-cover transition-transform duration-300 ease-out select-none"
                                    {...getBlurAnimationProps(0.5, false, {
                                        once: true,
                                        margin: isMobile
                                            ? '-50px 0px -50px 0px'
                                            : '-100px 0px -100px 0px',
                                        amount: isMobile ? 0.1 : 0.3,
                                    })}
                                />
                            </div>
                        </div>

                        {/* Desktop Layout - Hidden on Mobile */}
                        <div className="hidden md:block">
                            {/* Row 2: Three elements, offset right */}
                            <div className="max-w-8xl relative flex w-full flex-row items-center justify-center gap-40">
                                <motion.img
                                    src="/assets/about-office-2.png"
                                    alt="Office space"
                                    className="pointer-events-none relative bottom-[60px] ml-12 h-[400px] w-[400px] object-cover transition-transform duration-300 ease-out select-none"
                                    style={{
                                        transform: `translate(${parallax.x * -50}px, ${parallax.y * 80}px)`,
                                        willChange: prefersReducedMotion
                                            ? 'opacity'
                                            : 'opacity, filter',
                                    }}
                                    {...getBlurAnimationProps(0.1, false)}
                                />
                                <motion.div
                                    className="text-regular relative left-24 flex min-w-[400px] flex-col items-start justify-center px-8 text-left text-white"
                                    {...getBlurAnimationProps(0.2)}
                                >
                                    <span className="text-foreground-primary mb-8 text-lg font-light md:text-3xl">
                                        Earn your stake
                                        <br />
                                        in the future of
                                        <br />
                                        creative work
                                    </span>
                                    <ButtonLink
                                        href="https://www.ycombinator.com/companies/onlook/jobs/e4gHv1n-founding-engineer-fullstack"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        rightIcon={<span className="ml-2">→</span>}
                                    >
                                        Claim your desk
                                    </ButtonLink>
                                </motion.div>
                                <motion.img
                                    src="/assets/about-office-3.png"
                                    alt="Office space"
                                    className="pointer-events-none h-[400px] w-[400px] object-cover transition-transform duration-300 ease-out select-none"
                                    style={{
                                        transform: `translate(${parallax.x * 55}px, ${parallax.y * -40}px)`,
                                        willChange: prefersReducedMotion
                                            ? 'opacity'
                                            : 'opacity, filter',
                                    }}
                                    {...getBlurAnimationProps(0.3, false)}
                                />
                            </div>
                            {/* Row 3: Two left-offset squares */}
                            <div className="flex flex-row items-center justify-center gap-60 pt-12">
                                <motion.div
                                    className="relative top-48 -ml-70 aspect-square w-[400px] transition-transform duration-300 ease-out"
                                    style={{
                                        transform: `translate(${parallax.x * -70}px, ${parallax.y * 60}px)`,
                                        willChange: prefersReducedMotion
                                            ? 'opacity'
                                            : 'opacity, filter',
                                    }}
                                    {...getBlurAnimationProps(0.4, false)}
                                >
                                    <motion.img
                                        src="/assets/about-office-4.png"
                                        alt="Office space"
                                        className="pointer-events-none h-full w-full object-cover select-none"
                                        {...getBlurAnimationProps(0.4, false)}
                                    />
                                </motion.div>
                                <motion.img
                                    src="/assets/about-office-5.png"
                                    alt="Office space"
                                    className="pointer-events-none relative top-24 left-20 h-[400px] w-[400px] object-cover transition-transform duration-300 ease-out select-none"
                                    style={{
                                        transform: `translate(${parallax.x * 65}px, ${parallax.y * -65}px)`,
                                        willChange: prefersReducedMotion
                                            ? 'opacity'
                                            : 'opacity, filter',
                                    }}
                                    {...getBlurAnimationProps(0.5, false)}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Values Section */}
                <section className="text-foreground-primary bg-black py-60">
                    <div className="mx-auto max-w-6xl px-8">
                        <motion.h2
                            className="mb-20 text-left text-7xl leading-tight font-light"
                            {...getBlurAnimationProps()}
                        >
                            What we{' '}
                            <span
                                className={vujahdayScript.className + ' ml-1 text-8xl font-normal'}
                            >
                                reward
                            </span>
                        </motion.h2>
                        <div className="mb-16 grid grid-cols-2 gap-x-12 gap-y-16 md:grid-cols-4 md:gap-x-24">
                            {/* Speed */}
                            <motion.div
                                className="flex flex-col items-start text-left"
                                {...getBlurAnimationProps(0.1)}
                            >
                                <Illustrations.AboutSpeed className="text-foreground-primary mb-6 h-20 w-26" />
                                <h3 className="mb-2 text-xl font-normal">Speed</h3>
                                <p className="text-foreground-secondary md:text-large text-lg font-light text-balance">
                                    Setting an olympic pace, relentlessness, strategy through
                                    execution.
                                </p>
                            </motion.div>
                            {/* Resilience */}
                            <motion.div
                                className="flex flex-col items-start text-left"
                                {...getBlurAnimationProps(0.2)}
                            >
                                <Illustrations.AboutResilience className="text-foreground-primary mb-6 h-20 w-20" />
                                <h3 className="mb-2 text-xl font-normal">Resilience</h3>
                                <p className="text-foreground-secondary md:text-large text-lg font-light text-balance">
                                    Enduring challenges without losing momentum – grit, stamina, and
                                    drive.
                                </p>
                            </motion.div>
                            {/* Reinvention */}
                            <motion.div
                                className="flex flex-col items-start text-left"
                                {...getBlurAnimationProps(0.3)}
                            >
                                <Illustrations.AboutReinvention className="text-foreground-primary mb-6 h-20 w-20" />
                                <h3 className="mb-2 text-xl font-normal">Reinvention</h3>
                                <p className="text-foreground-secondary md:text-large text-lg font-light text-balance">
                                    Creativity in approaching problems, pushing us beyond the
                                    state-of-the-art.
                                </p>
                            </motion.div>
                            {/* Competence */}
                            <motion.div
                                className="flex flex-col items-start text-left"
                                {...getBlurAnimationProps(0.4)}
                            >
                                <Illustrations.AboutCompetence className="text-foreground-primary mb-6 h-20 w-20 py-4 pr-3" />
                                <h3 className="mb-2 text-xl font-normal">Competence</h3>
                                <p className="text-foreground-secondary md:text-large text-lg font-light text-balance">
                                    Taking pride in one's work, inspiring others with your taste and
                                    technique.
                                </p>
                            </motion.div>
                        </div>
                        <motion.div className="flex justify-start" {...getBlurAnimationProps(0.5)}>
                            <ButtonLink
                                href="https://www.ycombinator.com/companies/onlook/jobs/e4gHv1n-founding-engineer-fullstack"
                                target="_blank"
                                rel="noopener noreferrer"
                                rightIcon={<span className="ml-2">→</span>}
                            >
                                Browse open roles
                            </ButtonLink>
                        </motion.div>
                    </div>
                </section>

                {/* What we look for Section */}
                <section className="text-foreground-primary bg-black py-56">
                    <div className="mx-auto max-w-6xl px-8">
                        <motion.h2
                            className="mb-20 text-left text-7xl leading-tight font-light"
                            {...getBlurAnimationProps()}
                        >
                            What we{' '}
                            <span
                                className={vujahdayScript.className + ' ml-1 text-8xl font-normal'}
                            >
                                look&nbsp;for
                            </span>
                        </motion.h2>
                        <div className="grid grid-cols-1 gap-x-24 gap-y-16 md:grid-cols-3">
                            {/* Commitment */}
                            <motion.div
                                className="flex flex-col items-start text-left"
                                {...getBlurAnimationProps(0.1)}
                            >
                                <h3 className="text-title3 mb-4 font-normal">Commitment</h3>
                                <p className="text-foreground-secondary md:text-large text-lg font-light text-balance">
                                    Have you put real time into something you cared about? We're
                                    looking for builders who've made long-term bets on themselves.
                                </p>
                            </motion.div>
                            {/* Passion */}
                            <motion.div
                                className="flex flex-col items-start text-left"
                                {...getBlurAnimationProps(0.2)}
                            >
                                <h3 className="text-title3 mb-4 font-normal">Passion</h3>
                                <p className="text-foreground-secondary md:text-large text-lg font-light text-balance">
                                    We're allergic to apathy. We want people who give a damn about
                                    design, devtools, or AI – and have receipts.
                                </p>
                            </motion.div>
                            {/* Excellence */}
                            <motion.div
                                className="flex flex-col items-start text-left"
                                {...getBlurAnimationProps(0.3)}
                            >
                                <h3 className="text-title3 mb-4 font-normal">Excellence</h3>
                                <p className="text-foreground-secondary md:text-large text-lg font-light text-balance">
                                    Bring something rare. We want people who are world-class at
                                    something and won't compromise.
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Our Process Section */}
                <section className="text-foreground-primary bg-black py-56">
                    <div className="mx-auto flex max-w-6xl flex-col justify-between gap-32 px-8 md:flex-row">
                        {/* Left: Title and CTA */}
                        <div className="mb-16 flex flex-col items-start justify-start md:mb-0">
                            <motion.h2
                                className="mb-12 text-left text-7xl leading-tight font-light"
                                {...getBlurAnimationProps()}
                            >
                                Join the Odyssey
                            </motion.h2>
                            <motion.div {...getBlurAnimationProps(0.1)}>
                                <ButtonLink
                                    href="https://www.ycombinator.com/companies/onlook/jobs/e4gHv1n-founding-engineer-fullstack"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    rightIcon={<span className="ml-2">→</span>}
                                >
                                    Take the leap
                                </ButtonLink>
                            </motion.div>
                        </div>
                        {/* Right: Timeline */}
                        <div className="relative max-w-[500px]">
                            {/* Timeline vertical line and steps container */}
                            <div className="relative flex flex-col" ref={timelineContainerRef}>
                                {/* Timeline vertical line (dynamically positioned) */}
                                <div
                                    className="bg-foreground-primary/20 absolute left-0 z-0 w-px"
                                    style={{ top: lineStyle.top, height: lineStyle.height }}
                                />
                                {/* Vertical shimmer overlay */}
                                <div
                                    className="animate-shimmer-vertical absolute left-0 z-10 w-px bg-gradient-to-b from-transparent via-white/60 to-transparent bg-[length:100%_200%]"
                                    style={{ top: lineStyle.top, height: lineStyle.height }}
                                />
                                <div className="relative z-10 flex flex-col gap-0">
                                    {/* Step 1: Apply directly */}
                                    <motion.div
                                        className="relative mb-16 flex flex-row items-start"
                                        {...getBlurAnimationProps(0.2)}
                                    >
                                        <div
                                            ref={firstSquareRef}
                                            className="bg-foreground-tertiary absolute top-2 left-0 h-3 w-3 -translate-x-1/2 transform"
                                        />
                                        <div className="ml-12">
                                            <div className="text-title3 mb-3 md:text-lg">
                                                Apply directly
                                            </div>
                                            <div className="text-foreground-secondary md:text-large text-lg font-light text-balance">
                                                Send in your application and a link to a project
                                                you've made. For extra initiative, tackle an issue
                                                on GitHub and add it in your application.
                                            </div>
                                        </div>
                                    </motion.div>
                                    {/* Step 2: Screening call */}
                                    <motion.div
                                        className="relative mb-16 flex flex-row items-start"
                                        {...getBlurAnimationProps(0.3)}
                                    >
                                        <div className="bg-foreground-tertiary absolute top-2 left-0 h-3 w-3 -translate-x-1/2 transform" />
                                        <div className="ml-12">
                                            <div className="text-title3 mb-3 md:text-lg">
                                                Screening call with each of the Founders
                                            </div>
                                            <div className="text-foreground-secondary md:text-large text-lg font-light text-balance">
                                                Walk us through your history, share your experience,
                                                and help us understand who you are.
                                            </div>
                                        </div>
                                    </motion.div>
                                    {/* Step 3: Technical interview */}
                                    <motion.div
                                        className="relative mb-16 flex flex-row items-start"
                                        {...getBlurAnimationProps(0.4)}
                                    >
                                        <div className="bg-foreground-tertiary absolute top-2 left-0 h-3 w-3 -translate-x-1/2 transform" />
                                        <div className="ml-12">
                                            <div className="text-title3 mb-3 md:text-lg">
                                                Technical interview
                                            </div>
                                            <div className="text-foreground-secondary md:text-large text-lg font-light text-balance">
                                                We'll ask about the projects you've built and do a
                                                deep-dive into your implementation and the decisions
                                                you've made.
                                            </div>
                                        </div>
                                    </motion.div>
                                    {/* Step 4: Two reference calls */}
                                    <motion.div
                                        className="relative mb-16 flex flex-row items-start"
                                        {...getBlurAnimationProps(0.5)}
                                    >
                                        <div className="bg-foreground-tertiary absolute top-2 left-0 h-3 w-3 -translate-x-1/2 transform" />
                                        <div className="ml-12">
                                            <div className="text-title3 mb-3 md:text-lg">
                                                Reference calls
                                            </div>
                                            <div className="text-foreground-secondary md:text-large text-lg font-light text-balance">
                                                Connect us with trusted managers or colleagues who
                                                can vouch for your work.
                                            </div>
                                        </div>
                                    </motion.div>
                                    {/* Step 5: Paid work trial */}
                                    <motion.div
                                        className="relative mb-16 flex flex-row items-start"
                                        {...getBlurAnimationProps(0.6)}
                                    >
                                        <div className="bg-foreground-tertiary absolute top-2 left-0 h-3 w-3 -translate-x-1/2 transform" />
                                        <div className="ml-12">
                                            <div className="text-title3 mb-3 md:text-lg">
                                                Paid work trial
                                            </div>
                                            <div className="text-foreground-secondary md:text-large text-lg font-light text-balance">
                                                Collaborate with us on a problem and get a feel for
                                                what it's like to work with the team at Onlook.
                                            </div>
                                        </div>
                                    </motion.div>
                                    {/* Step 6: Offer */}
                                    <motion.div
                                        className="relative flex flex-row items-start"
                                        {...getBlurAnimationProps(0.7)}
                                    >
                                        <div
                                            ref={lastSquareRef}
                                            className="bg-foreground-tertiary absolute top-2 left-0 h-3 w-3 -translate-x-1/2 transform"
                                        />
                                        <div className="ml-12">
                                            <div className="text-title3 mb-3 md:text-lg">Offer</div>
                                            <div className="text-foreground-secondary md:text-large text-lg font-light text-balance">
                                                Sign and become a full-time member of the Odyssey.
                                                Pick up your laptop, put on your jacket, and get
                                                ready to craft a beloved design tool.
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <CTASection
                href="https://www.ycombinator.com/companies/onlook/jobs/e4gHv1n-founding-engineer-fullstack"
                ctaText="Apply today"
                buttonText="Browse open roles"
                showSubtext={false}
            />
        </WebsiteLayout>
    );
}

'use client';

import { Icons } from '@onlook/ui/icons/index';
import React from 'react';
import { ButtonLink } from './_components/button-link';
import { Hero } from './_components/hero';
import { ContributorSection } from './_components/landing-page/ContributorSection';
import { Footer } from './_components/landing-page/Footer';
import { TopBar } from './_components/top-bar';
import { Button } from '@onlook/ui/button';;
import { FAQDropdown } from './_components/landing-page/FAQDropdown';

export default function Main() {
    const faqs = [
        {
            question: 'What kinds of things can I design with Onlook?',
            answer: 'You can prototype, ideate, and create websites from scratch with Onlook',
        },
        {
            question: 'Why would I use Onlook?',
            answer: 'When you design in Onlook you design in the real product – in other words, the source of truth. Other products are great for ideating, but Onlook is the only one that lets you design with the existing product and the only one that translates your designs to code instantly.',
        },
        {
            question: 'Who owns the code that I write with Onlook?',
            answer: "The code you make with Onlook is all yours. Your code is written locally directly to your files, and isn't hosted off your device.",
        },
    ];
    const [openIndex, setOpenIndex] = React.useState<number | null>(null);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center relative overflow-x-hidden">
            <div className="fixed top-0 left-0 w-full h-12 bg-background/80 backdrop-blur-sm z-50">
                <TopBar />
            </div>
            <div className="w-screen h-screen flex items-center justify-center">
                <Hero />
            </div>
            <div className="w-full max-w-6xl mx-auto py-32 px-8 flex flex-col items-start">
                <h2 className="text-foreground-primary text-[6vw] leading-[1.1] font-light mb-12 max-w-5xl">
                    See what you can<br />
                    craft in Onlook
                </h2>
                <ButtonLink href="#" rightIcon={<Icons.ArrowRight className="w-5 h-5" />}>Browse more</ButtonLink>
            </div>
            {/* New Features Section */}
            <div className="w-full max-w-6xl mx-auto py-20 px-8 flex flex-col md:flex-row items-start md:items-stretch gap-12 md:gap-0">
                <div className="flex-1 mb-12 md:mb-0 md:mr-8">
                    <h3 className="text-foreground-primary text-lg mb-4">Real Code</h3>
                    <p className="text-foreground-secondary text-regular text-balance">This is where more information<br />would go</p>
                </div>
                <div className="flex-1 mb-12 md:mb-0 md:mr-8">
                    <h3 className="text-foreground-primary text-lg mb-4">AI powered</h3>
                    <p className="text-foreground-secondary text-regular text-balance">Even more control and power with<br />the interface</p>
                </div>
                <div className="flex-1">
                    <h3 className="text-foreground-primary text-lg mb-4">Publish in a click</h3>
                    <p className="text-foreground-secondary text-regular text-balance">Share a link with colleagues or<br />attach a domain in seconds</p>
                </div>
            </div>
            {/* CTA to start */}
            <div className="w-full max-w-6xl mx-auto py-48 flex flex-col md:flex-row items-right gap-24 md:gap-12">
                <div className="flex-1 flex flex-col items-end justify-center mx-auto text-right">
                    <h1 className="text-foreground-primary text-[7vw] md:text-[5vw] leading-[1.05] font-light mb-8 max-w-4xl">
                        Craft a website<br className="hidden md:block" /> for free today
                    </h1>
                    <div className="flex flex-col sm:flex-row items-center justify-right gap-0">
                        <Button variant="secondary" size="lg" className="p-6 cursor-pointer hover:bg-foreground-primary hover:text-background-primary transition-colors">
                            Get Started
                        </Button>
                        <span className="text-foreground-tertiary text-regular text-left ml-0 sm:ml-6 mt-2 sm:mt-0">
                            No credit card required.<br /> Cancel anytime.
                        </span>
                    </div>
                </div>
            </div>
            {/* Contributor Section */}
            <ContributorSection />
            {/* FAQ Section */}
            <div className="w-full max-w-6xl mx-auto py-32 px-8 flex flex-col md:flex-row items-start gap-24 md:gap-12">
                <div className="flex-1 flex flex-col items-start">
                    <h2 className="text-foreground-primary text-[5vw] leading-[1.1] font-light mb-8 max-w-3xl">
                        What did<br />we miss?
                    </h2>
                    <ButtonLink href="/faq" rightIcon={<Icons.ArrowRight className="w-5 h-5" />}>Read our FAQs</ButtonLink>
                </div>
                <div className="flex-1 flex flex-col gap-6">
                    <FAQDropdown faqs={faqs} />
                </div>
            </div>
            {/* What can Onlook do? Section */}
            <div className="w-full max-w-6xl mx-auto py-32 px-8 flex flex-col md:flex-row gap-24 md:gap-24">
                {/* Left Column */}
                <div className="flex-1 flex flex-col gap-24">
                    {/* Section Title */}
                    <h2 className="text-foreground-primary text-[4vw] leading-[1.1] font-light mb-8 max-w-xl">What can<br />Onlook do?</h2>
                    {/* Direct editing */}
                    <div className="flex flex-col gap-4">
                        <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                        <div className="flex flex-row items-start gap-8 w-full">
                            {/* Icon + Title */}
                            <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons.Edit className="w-10 h-10 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Direct editing</span>
                        </div>
                        {/* Description */}
                            <p className="text-foreground-secondary text-regular text-balance w-1/2 mt-2">Drag-and-drop, rearrange, scale, and more with elements directly in the editor.</p>
                        </div>
                    </div>
                    {/* Components */}
                    <div className="flex flex-col gap-4">
                        <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                        <div className="flex flex-row items-start gap-8 w-full">
                            {/* Icon + Title */}
                            <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons.Component className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Components</span>
                        </div>
                        {/* Description */}
                            <p className="text-foreground-secondary text-regular text-balance w-1/2 mt-2">Customize reusable components that you can swap-out across websites.</p>
                        </div>
                    </div>
                    {/* Layers */}
                    <div className="flex flex-col gap-4">
                        <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                        <div className="flex flex-row items-start gap-8 w-full">
                            {/* Icon + Title */}
                            <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons.Layers className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Layers</span>
                        </div>
                        {/* Description */}
                            <p className="text-foreground-secondary text-regular text-balance w-1/2 mt-2">Select elements exactly where you need them to be</p>
                        </div>
                    </div>
                </div>
                {/* Right Column */}
                <div className="flex-1 flex flex-col gap-18 mt-16 md:mt-32">
                    {/* Work in the true product */}
                    <div className="flex flex-col gap-4">
                        <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                        <div className="flex flex-row items-start gap-8 w-full">
                            {/* Icon + Title */}
                            <div className="flex flex-col items-start w-1/2">
                                {/* Placeholder icon for Eye */}
                                <div className="mb-2"><Icons.EyeOpen className="w-6 h-6 text-foreground-primary" /></div>
                                <span className="text-foreground-primary text-largePlus font-light">Work in the <span className='underline'>true</span> product</span>
                            </div>
                            {/* Description */}
                            <p className="text-foreground-secondary text-regular text-balance w-1/2 mt-2">Work an entirely new dimension – experience your designs come to life</p>
                        </div>
                    </div>
                    {/* Brand compliance */}
                    <div className="flex flex-col gap-4">
                        <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                        <div className="flex flex-row items-start gap-8 w-full">
                            {/* Icon + Title */}
                            <div className="flex flex-col items-start w-1/2">
                                {/* Placeholder icon for BadgeCheck */}
                                <div className="mb-2"><Icons.Brand className="w-6 h-6 text-foreground-primary" /></div>
                                <span className="text-foreground-primary text-largePlus font-light">Brand compliance</span>
                            </div>
                            {/* Description */}
                            <p className="text-foreground-secondary text-regular text-balance w-1/2 mt-2">Make your fonts, colors, and styles all speak the same language.</p>
                        </div>
                    </div>
                    {/* Instantly responsive */}
                    <div className="flex flex-col gap-4">
                        <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                        <div className="flex flex-row items-start gap-8 w-full">
                            {/* Icon + Title */}
                            <div className="flex flex-col items-start w-1/2">
                                <div className="mb-2"><Icons.Laptop className="w-6 h-6 text-foreground-primary" /></div>
                                <span className="text-foreground-primary text-largePlus font-light">Instantly responsive</span>
                            </div>
                            {/* Description */}
                            <p className="text-foreground-secondary text-regular text-balance w-1/2 mt-2">Craft sites that look great on laptops, tablets, and phones with minimal adjustments.</p>
                        </div>
                    </div>
                    {/* Revision history */}
                    <div className="flex flex-col gap-4">
                        <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                        <div className="flex flex-row items-start gap-8 w-full">
                            {/* Icon + Title */}
                            <div className="flex flex-col items-start w-1/2">
                                <div className="mb-2"><Icons.CounterClockwiseClock className="w-6 h-6 text-foreground-primary" /></div>
                                <span className="text-foreground-primary text-largePlus font-light">Revision history</span>
                            </div>
                            {/* Description */}
                            <p className="text-foreground-secondary text-regular text-balance w-1/2 mt-2">Never lose your progress – revert when you need to</p>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}

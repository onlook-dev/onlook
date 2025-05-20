'use client';

import { Icons } from '@onlook/ui/icons/index';
import React from 'react';
import { ButtonLink } from './_components/button-link';
import { Hero } from './_components/hero';
import { ContributorSection } from './_components/landing-page/ContributorSection';
import { TopBar } from './_components/top-bar';

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
            {/* Contributors Section */}
            <div className="w-full max-w-6xl mx-auto py-32 px-8 flex flex-col md:flex-row items-start gap-24 md:gap-12">
                <ContributorSection />
            </div>
            {/* FAQ Section */}
            <div className="w-full max-w-6xl mx-auto py-32 px-8 flex flex-col md:flex-row items-start gap-24 md:gap-12">
                <div className="flex-1 flex flex-col items-start">
                    <h2 className="text-foreground-primary text-[5vw] leading-[1.1] font-light mb-8 max-w-3xl">
                        What did<br />we miss?
                    </h2>
                    <ButtonLink href="#" rightIcon={<Icons.ArrowRight className="w-5 h-5" />}>Read our FAQs</ButtonLink>
                </div>
                <div className="flex-1 flex flex-col gap-6">
                    {/* FAQ List */}
                    <div className="flex flex-col gap-1 w-full">
                        {faqs.map((faq, idx) => (
                            <div
                                key={faq.question}
                                className="px-8 py-6"
                            >
                                <button
                                    className="flex items-center justify-between w-full text-left text-foreground-primary text-lg focus:outline-none cursor-pointer py-2"
                                    onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                                    aria-expanded={openIndex === idx}
                                >
                                    <span>{faq.question}</span>
                                    <span className="ml-4 flex items-center">
                                        {openIndex === idx ? (
                                            <Icons.Minus className="w-6 h-6 text-foreground-primary transition-transform duration-200" />
                                        ) : (
                                            <Icons.Plus className="w-6 h-6 text-foreground-primary transition-transform duration-200" />
                                        )}
                                    </span>
                                </button>
                                <div
                                    className={`overflow-hidden transition-all duration-300 ${openIndex === idx ? 'max-h-40 mt-4 opacity-100' : 'max-h-0 opacity-0'}`}
                                    style={{ pointerEvents: openIndex === idx ? 'auto' : 'none' }}
                                >
                                    <p className="text-foreground-secondary text-regular leading-relaxed">{faq.answer}</p>
                                </div>
                            </div>
                        ))}
                    </div>
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
                        <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
                            {/* Icon + Title */}
                            <div className="flex flex-col items-start min-w-[120px]">
                                <div className="mb-2"><Icons.Edit className="w-10 h-10 text-foreground-primary" /></div>
                                <span className="text-foreground-primary text-largePlus font-light">Direct editing</span>
                            </div>
                            {/* Description */}
                            <p className="text-foreground-secondary text-regular text-balance max-w-xs md:mt-0 mt-2">Drag-and-drop, rearrange, scale, and more with elements directly in the editor.</p>
                        </div>
                    </div>
                    {/* Components */}
                    <div className="flex flex-col gap-4">
                        <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                        <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
                            {/* Icon + Title */}
                            <div className="flex flex-col items-start min-w-[120px]">
                                <div className="mb-2"><Icons.Component className="w-6 h-6 text-foreground-primary" /></div>
                                <span className="text-foreground-primary text-largePlus font-light">Components</span>
                            </div>
                            {/* Description */}
                            <p className="text-foreground-secondary text-regular text-balance max-w-xs md:mt-0 mt-2">Customize reusable components that you can swap-out across websites.</p>
                        </div>
                    </div>
                    {/* Layers */}
                    <div className="flex flex-col gap-4">
                        <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                        <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
                            {/* Icon + Title */}
                            <div className="flex flex-col items-start min-w-[120px]">
                                <div className="mb-2"><Icons.Layers className="w-6 h-6 text-foreground-primary" /></div>
                                <span className="text-foreground-primary text-largePlus font-light">Layers</span>
                            </div>
                            {/* Description */}
                            <p className="text-foreground-secondary text-regular text-balance max-w-xs md:mt-0 mt-2">Select elements exactly where you need them to be</p>
                        </div>
                    </div>
                </div>
                {/* Right Column */}
                <div className="flex-1 flex flex-col gap-18 mt-16 md:mt-32">
                    {/* Work in the true product */}
                    <div className="flex flex-col gap-18">
                        <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-2" />
                        <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
                            {/* Icon + Title */}
                            <div className="flex flex-col items-start min-w-[120px]">
                                {/* Placeholder icon for Eye */}
                                <div className="mb-2"><Icons.EyeOpen className="w-6 h-6 text-foreground-primary" /></div>
                                <span className="text-foreground-primary text-largePlus font-light">Work in the <span className='underline'>true</span> product</span>
                            </div>
                            {/* Description */}
                            <p className="text-foreground-secondary text-regular text-balance max-w-xs md:mt-0 mt-2">Work an entirely new dimension – experience your designs come to life</p>
                        </div>
                    </div>
                    {/* Brand compliance */}
                    <div className="flex flex-col gap-8">
                        <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                        <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
                            {/* Icon + Title */}
                            <div className="flex flex-col items-start min-w-[120px]">
                                {/* Placeholder icon for BadgeCheck */}
                                <div className="mb-2"><Icons.Brand className="w-6 h-6 text-foreground-primary" /></div>
                                <span className="text-foreground-primary text-largePlus font-light">Brand compliance</span>
                            </div>
                            {/* Description */}
                            <p className="text-foreground-secondary text-regular text-balance max-w-xs md:mt-0 mt-2">Make your fonts, colors, and styles all speak the same language.</p>
                        </div>
                    </div>
                    {/* Instantly responsive */}
                    <div className="flex flex-col gap-8">
                        <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                        <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
                            {/* Icon + Title */}
                            <div className="flex flex-col items-start min-w-[120px]">
                                <div className="mb-2"><Icons.Laptop className="w-6 h-6 text-foreground-primary" /></div>
                                <span className="text-foreground-primary text-largePlus font-light">Instantly responsive</span>
                            </div>
                            {/* Description */}
                            <p className="text-foreground-secondary text-regular text-balance max-w-xs md:mt-0 mt-2">Craft sites that look great on laptops, tablets, and phones with minimal adjustments.</p>
                        </div>
                    </div>
                    {/* Revision history */}
                    <div className="flex flex-col gap-8">
                        <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                        <div className="flex flex-col md:flex-row items-start gap-4 md:gap-8">
                            {/* Icon + Title */}
                            <div className="flex flex-col items-start min-w-[120px]">
                                <div className="mb-2"><Icons.CounterClockwiseClock className="w-6 h-6 text-foreground-primary" /></div>
                                <span className="text-foreground-primary text-largePlus font-light">Revision history</span>
                            </div>
                            {/* Description */}
                            <p className="text-foreground-secondary text-regular text-balance max-w-xs md:mt-0 mt-2">Never lose your progress – revert when you need to</p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Footer Section */}
            <footer className="w-full text-foreground-primary border-t border-foreground-primary/10 mt-24 pb-24">
                <div className="max-w-6xl mx-auto px-8 pt-16 pb-24 flex flex-col md:flex-row md:items-start gap-12">
                    {/* Left: Slogan */}
                    <div className="flex-1 flex flex-col gap-8 min-w-[250px]">
                        <Icons.OnlookTextLogo className="w-24 h-5 text-foreground-primary" />
                        <div>
                            <h2 className="text-title2 text-foreground-primary mb-2">Build in seconds –<br />obsess for hours</h2>
                        </div>
                    </div>
                    {/* Center: Links */}
                    <div className="flex-1 flex flex-col md:flex-row gap-12 md:gap-24 justify-center">
                        <div>
                            <h4 className="text-regularPlus mb-4">Company</h4>
                            <ul className="flex flex-col gap-2 text-regular text-foreground-secondary">
                                <li><a href="#" className="hover:underline">About</a></li>
                                <li><a href="#" className="hover:underline">Blog</a></li>
                                <li><a href="#" className="hover:underline">Careers</a></li>
                            </ul>
                        </div>
                        <div className="min-w-[200px]">
                            <h4 className="text-regularPlus mb-4">Product</h4>
                            <ul className="flex flex-col gap-2 text-regular text-foreground-secondary">
                                <li><a href="#" className="hover:underline">Get Started</a></li>
                                <li><a href="#" className="hover:underline">GitHub</a></li>
                                <li><a href="#" className="hover:underline">Visual Editor</a></li>
                                <li><a href="#" className="hover:underline">ShadCN</a></li>
                                <li><a href="#" className="hover:underline">AI for Frontend</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-regularPlus mb-4">Follow Us</h4>
                            <div className="flex gap-6 mt-2">
                                {[...Array(5)].map((_, i) => (
                                    <Icons.Component key={i} className="w-6 h-6 text-white hover:text-white/70 transition-colors" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Bottom Bar */}
                <div className="max-w-6xl mx-auto px-8 pb-4">
                    <div className="flex flex-col md:flex-row items-center md:items-center justify-center md:justify-between w-full gap-0 md:gap-4 border-t border-foreground-primary/10 pt-6">
                        {/* Left: Language Selector */}
                        <div className="flex items-center gap-2 text-small text-foreground-tertiary justify-center md:justify-start w-full md:w-auto mb-4 md:mb-0">
                            <span className="mr-2"><svg width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" /></svg></span>
                            English
                            <span className="ml-1">▼</span>
                        </div>
                        {/* Center: Links */}
                        <div className="flex gap-8 text-foreground-tertiary text-small justify-center w-full md:w-auto mb-4 md:mb-0">
                            <a href="#" className="hover:underline">Terms</a>
                            <a href="#" className="hover:underline">Privacy</a>
                            <a href="#" className="hover:underline">Sitemap</a>
                        </div>
                        {/* Right: Copyright */}
                        <div className="text-foreground-tertiary text-small w-full md:w-auto flex justify-center md:justify-end">© 2025 On Off, Inc.</div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

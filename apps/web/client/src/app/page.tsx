'use client';

import { AuthModal } from './_components/auth-modal';
import { Hero } from './_components/hero';
import { ContributorSection } from './_components/landing-page/contributor-section';
import { WhatCanOnlookDoSection } from './_components/landing-page/what-can-onlook-do-section';
import { Footer } from './_components/landing-page/page-footer';
import { TopBar } from './_components/top-bar';
import { FAQSection } from './_components/landing-page/faq-section';
import { CTASection } from './_components/landing-page/cta-section';
import { TestimonialsSection } from './_components/landing-page/testimonials-section';


export default function Main() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center relative overflow-x-hidden">
            <div className="fixed top-0 left-0 w-full h-12 bg-background/80 backdrop-blur-sm z-50">
                <TopBar />
            </div>
            <div className="w-screen h-screen flex items-center justify-center">
                <Hero />
            </div>

            {/* <FeaturesSection /> */}
            {/* <CodeOneToOneSection /> */}
            <ContributorSection />
            {/* <CTASection /> */}
            <WhatCanOnlookDoSection />
            <TestimonialsSection />
            <FAQSection /> 
            <Footer />
            <AuthModal />
        </div>
    );
}

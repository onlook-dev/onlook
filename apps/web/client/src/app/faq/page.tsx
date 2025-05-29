'use client';

import { FAQDropdown } from '../_components/landing-page/faq-dropdown';
import { Footer } from '../_components/landing-page/footer';
import { TopBar } from '../_components/top-bar';
import { useEffect, useRef, useState } from 'react';

const faqSections = [
    {
        title: "General",
        anchor: "general",
        faqs: [
            {
                question: "What is Onlook?",
                answer: "Onlook is a modern development platform that helps you build and deploy applications faster. We provide tools and services to streamline your development workflow."
            },
            {
                question: "How do I get started?",
                answer: "Getting started with Onlook is easy. Simply sign up for an account, create a new project, and follow our step-by-step guide to deploy your first application."
            },
            {
                question: "What features does Onlook offer?",
                answer: "Onlook offers a comprehensive suite of features including real-time collaboration, automated deployments, version control integration, and powerful development tools."
            },
            {
                question: "Is Onlook free to use?",
                answer: "Onlook offers both free and paid plans. Our free tier includes basic features suitable for small projects, while our paid plans provide additional capabilities for larger teams and projects."
            },
            {
                question: "How can I get support?",
                answer: "We offer multiple support channels including documentation, community forums, and direct support for paid plans. You can also reach out to our team through our contact page."
            }
        ]
    },
    {
        title: "Billing",
        anchor: "billing",
        faqs: [
            {
                question: "How do I upgrade my plan?",
                answer: "You can upgrade your plan from the billing section in your dashboard."
            },
            {
                question: "What payment methods are accepted?",
                answer: "We accept all major credit cards and PayPal."
            }
        ]
    },
    {
        title: "Payment",
        anchor: "payment",
        faqs: [
            {
                question: "How do I upgrade my plan?",
                answer: "You can upgrade your plan from the billing section in your dashboard."
            },
            {
                question: "What payment methods are accepted?",
                answer: "We accept all major credit cards and PayPal."
            }
        ]
    }
    // Add more sections as needed
];

export default function FAQPage() {
    const [currentSection, setCurrentSection] = useState(faqSections[0]?.anchor || '');
    const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const handleScroll = () => {
            const offsets = sectionRefs.current.map(ref => {
                if (!ref) return Infinity;
                const rect = ref.getBoundingClientRect();
                return Math.abs(rect.top - 120); // 120px offset for sticky sidebar
            });
            const minOffset = Math.min(...offsets);
            const idx = offsets.indexOf(minOffset);
            if (idx !== -1 && faqSections[idx]?.anchor && faqSections[idx].anchor !== currentSection) {
                setCurrentSection(faqSections[idx].anchor);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [currentSection]);

    return (
        <main className="min-h-screen bg-background">
            <div className="fixed top-0 left-0 w-full h-12 bg-background/80 backdrop-blur-sm z-50">
                <TopBar />
            </div>
            <div className="w-full max-w-6xl mx-auto py-32 px-8">
                <h1 className="text-foreground-primary text-[4vw] leading-[1.1] font-light mb-16 max-w-3xl text-balance">
                    Frequently Asked <br />Questions
                </h1>
                <div className="flex gap-16">
                    {/* Left: FAQ List */}
                    <section className="flex-1 pr-8">
                        {faqSections.map((section, i) => (
                            <div
                                key={section.anchor}
                                id={section.anchor}
                                className="mb-12"
                                ref={el => { sectionRefs.current[i] = el; }}
                            >
                                <h2 className="text-foreground-secondary text-large mb-4 ">{section.title}</h2>
                                <FAQDropdown faqs={section.faqs} />
                            </div>
                        ))}
                    </section>
                    {/* Divider */}
                    <div className="flex items-stretch">
                        <div className="w-px bg-foreground-tertiary/30 rounded-full" />
                    </div>
                    {/* Fixed Sidebar */}
                    <div className="w-64 hidden md:block">
                        <div className="fixed" style={{ 
                            top: '380px',
                        }}>
                            <div className="flex flex-row items-start">
                                {/* Divider */}
                                <div className="w-px h-full bg-foreground-tertiary/30 rounded-full mr-6" />
                                {/* Sidebar List */}
                                <ul className="flex flex-col gap-4">
                                    {faqSections.map((section, i) => (
                                        <li key={section.anchor}>
                                            <a
                                                href={`#${section.anchor}`}
                                                className={`transition-colors text-regular px-2 py-1 rounded-md ${
                                                    currentSection === section.anchor
                                                        ? 'text-foreground-primary'
                                                        : 'text-foreground-tertiary hover:text-foreground-hover'
                                                }`}
                                                onClick={e => {
                                                    e.preventDefault();
                                                    const el = sectionRefs.current[i];
                                                    if (el) {
                                                        el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
                                                    }
                                                }}
                                            >
                                                {section.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </main>
    );
} 
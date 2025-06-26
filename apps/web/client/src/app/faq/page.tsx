'use client';

import { useEffect, useRef, useState } from 'react';
import { FAQDropdown } from '../_components/landing-page/faq-dropdown';
import { CTASection } from '../_components/landing-page/cta-section';
import { WebsiteLayout } from '../_components/website-layout';

const faqSections = [
    {
        title: "General",
        anchor: "general",
        faqs: [
            {
                question: "What is Onlook?",
                answer: "Onlook is an open-source, visual editor for websites. It allows anyone to create and style their own websites without any coding knowledge."
            },
            {
                question: "What can I use Onlook to do?",
                answer: "Onlook is great for creating websites, prototypes, user interfaces, and designs. Whether you need a quick mockup or a full-fledged website, ask Onlook to craft it for you."
            },
            {
                question: "How do I get started?",
                answer: "Getting started with Onlook is easy. Simply sign up for an account, create a new project, and follow our step-by-step guide to deploy your first application."
            },
            {
                question: "Is Onlook free to use?",
                answer: "Onlook is free for your first prompt, but you're limited by the number of messages you can send. Please see our Pricing page for more details."
            },
            {
                question: "What features does Onlook offer?",
                answer: "Onlook offers a comprehensive suite of features including real-time collaboration, automated deployments, version control integration, and powerful development tools."
            }
        ]
    },
    {
        title: "Product",
        anchor: "product",
        faqs: [
            {
                question: "How do I use Onlook?",
                answer: "Onlook is a visual editor for websites. It allows you to create and style your own websites without any coding knowledge. You can use Onlook to create websites, prototypes, user interfaces, and designs."
            },
            {
                question: "What features can I expect in Onlook in the months to come?",
                answer: "You can easily get a sense of our roadmap from the open issues on our GitHub repository, but our priority right now is to make a stable, reliable editor visual editor experience. We have plans to bring many of your favorite design tool features such as layers, components, and more into the interface. And of course, we'll be continuing to enhance the AI capabilities of Onlook to make it faster to craft designs."
            },
            {
                question: "What is the difference between Onlook and other design tools?",
                answer: "Onlook is a visual editor for code. It allows you to create and style your own creations with code as the source of truth. While it is best suited for creating websites, it can be used for anything visual – presentations, mockups, and more. Because Onlook uses code as the source of truth, the types of designs you can create are unconstrained by Onlook's interface."
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
    },
    {
        title: "About",
        anchor: "about",
        faqs: [
            {
                question: "Why was Onlook created?",
                answer: "Both the founders come from either side of the design and development divide. We realized that AI could be the final leap to solve the problem of designers and developers work together. Onlook is a continuous iteration towards the new state-of-the-art for collaboration in code."
            },
            {
                question: "Why is Onlook open-source?",
                answer: "Developers have historically been second-rate citizens in the design process. Onlook was founded to bridge the divide between design and development, and we wanted to make developers first-class citizens alongside designers. We chose to be open-source to give developers transparency into how we are building Onlook and how the work created through Onlook will complement the work of developers."
            },
            {
                question: "Where is Onlook based?",
                answer: "Onlook was founded in Cincinnati, Ohio, USA, and started as a remote-first company between Cincinnati and New York City. After the YC Winter 2025 batch, Onlook opened a barracks in San Francisco. Our open-source contributors are scattered across the world, bringing their unique perspectives and incredible talent to the project as we continue to push the limits of design and development."
            }
        ]
    }
];

export default function FAQPage() {
    const [currentSection, setCurrentSection] = useState(faqSections[0]?.anchor || '');
    const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
    const faqContainerRef = useRef<HTMLDivElement | null>(null);
    const sidebarRef = useRef<HTMLDivElement | null>(null);
    const [sidebarStyle, setSidebarStyle] = useState<React.CSSProperties>({ position: 'fixed', top: '8rem', right: '2rem', width: '16rem' });

    useEffect(() => {
        const handleScroll = () => {
            // Smart fixed sidebar logic
            const faqContainer = faqContainerRef.current;
            const sidebar = sidebarRef.current;
            if (faqContainer && sidebar) {
                const faqRect = faqContainer.getBoundingClientRect();
                const sidebarHeight = sidebar.offsetHeight;
                const topOffset = 128; // 8rem in px
                const rightOffset = 32; // 2rem in px
                if (faqRect.top > topOffset) {
                    setSidebarStyle({ position: 'fixed', top: `${topOffset}px`, right: `${rightOffset}px`, width: '16rem' });
                } else if (faqRect.bottom - sidebarHeight < topOffset) {
                    setSidebarStyle({ position: 'absolute', top: 'auto', bottom: '0', right: '0', width: '16rem' });
                } else {
                    setSidebarStyle({ position: 'fixed', top: `${topOffset}px`, right: `${rightOffset}px`, width: '16rem' });
                }
            }
            // Scroll spy logic for highlighting current section
            const offset = 120; // or your sticky top
            let activeIdx = 0;
            for (let i = 0; i < sectionRefs.current.length; i++) {
                const ref = sectionRefs.current[i];
                if (ref) {
                    const top = ref.getBoundingClientRect().top;
                    if (top <= offset) {
                        activeIdx = i;
                    }
                }
            }
            if (faqSections[activeIdx]?.anchor && faqSections[activeIdx]?.anchor !== currentSection) {
                setCurrentSection(faqSections[activeIdx]?.anchor || '');
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [currentSection]);

    return (
        <WebsiteLayout showFooter={true}>
            <div className="w-full max-w-6xl mx-auto py-32 px-4 md:px-8">
                <h1 className="text-foreground-primary text-6xl leading-[1.1] font-light mb-16 max-w-3xl text-balance">
                    Frequently Asked <br />Questions
                </h1>
                <div className="flex flex-col md:flex-row gap-8" ref={faqContainerRef} style={{ position: 'relative' }}>
                    {/* FAQ Content */}
                    <section className="flex-1 pr-0 md:pr-8  max-w-[800px]">
                        {faqSections.map((section, i) => (
                            <div
                                key={section.anchor}
                                id={section.anchor}
                                className="mb-12 scroll-mt-24"
                                ref={el => { sectionRefs.current[i] = el; }}
                            >
                                <h2 className="text-foreground-secondary text-large mb-4 text-balance">{section.title}</h2>
                                <FAQDropdown faqs={section.faqs} />
                            </div>
                        ))}
                    </section>
                </div>
            </div>
            <CTASection href="/" />
        </WebsiteLayout>
    );
} 
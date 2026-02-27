'use client';

import { useEffect, useRef, useState } from 'react';
import { FAQDropdown } from '../_components/landing-page/faq-dropdown';
import { CTASection } from '../_components/landing-page/cta-section';
import { WebsiteLayout } from '../_components/website-layout';
import { ExternalRoutes } from '@/utils/constants';

const faqSections = [
    {
        title: "About Onlook",
        anchor: "about-onlook",
        faqs: [
            {
                question: "What is Onlook?",
                answer: "Onlook is an AI-powered visual editor for design. It connects to your existing codebase and lets designers and developers create interfaces using real components. Unlike generic AI code generators, Onlook constrains AI to your design system. Changes become pull requests engineers can merge directly — no export, no translation, no throwaway prototypes."
            },
            {
                question: "Who is Onlook for?",
                answer: "Onlook is for product teams with designers and an existing component library. Ideal users include design engineers, product designers working in code-forward teams, frontend developers who want visual tooling, and teams maintaining design systems who want AI that respects their existing work."
            },
            {
                question: "What makes Onlook different from other design tools?",
                answer: "Traditional design tools create static mockups that must be rebuilt in code. Onlook works with your real components — what you design IS the code. There's no handoff because designers and developers work in the same artifact. Changes become PRs, not specs. AI is constrained to your design system, so there's no brand drift."
            },
            {
                question: "What makes Onlook different from AI code generators?",
                answer: "AI code generators create new code from scratch using generic HTML/CSS. The output needs to be translated to work with your real components. Onlook is different — it connects to your existing component library and constrains AI to YOUR design system. Outputs are consistent, on-brand, and directly mergeable. No translation step needed."
            },
        ]
    },
    {
        title: "Features & Capabilities",
        anchor: "features",
        faqs: [
            {
                question: "What are Onlook's main features?",
                answer: "Onlook offers: (1) An infinite canvas for visual design with real code running underneath, (2) AI that's constrained to your design system — no brand drift, (3) Real-time team collaboration with spatial comments, (4) Direct GitHub integration — changes become mergeable PRs, (5) Support for your existing components, colors, and design tokens, (6) A visual interface that requires no coding for designers."
            },
            {
                question: "How does Onlook's AI work?",
                answer: "Onlook's AI is constrained to your design system. When you ask AI to make changes, it can only use components, colors, and tokens that exist in your codebase. This prevents brand drift and ensures outputs match your design system. You can point at elements visually rather than describing them in text — the AI understands the exact selector, component, and styles."
            },
            {
                question: "Does Onlook support real-time collaboration?",
                answer: "Yes. Onlook has built-in team collaboration. Share your canvas, leave spatial comments, and work together in real-time. Multiple team members can view and edit the same project simultaneously. Changes sync to code and can be submitted as PRs."
            },
            {
                question: "How do I get changes into production?",
                answer: "Changes you make in Onlook become real code changes in your repository. When you're ready, submit them as a pull request for engineers to review and merge. No export, no copy-paste, no translation. The code is production-ready because it uses your actual components."
            }
        ]
    },
    {
        title: "Technical Compatibility",
        anchor: "compatibility",
        faqs: [
            {
                question: "What frontend frameworks does Onlook support?",
                answer: "Onlook works with React, Next.js, Vue, Angular, Svelte, Preact, SolidJS, Qwik, and Web Components. If your framework works with modern component-based architecture, it likely works with Onlook."
            },
            {
                question: "What CSS and styling approaches does Onlook support?",
                answer: "Onlook supports all major CSS approaches: Tailwind CSS, CSS Modules, styled-components, Emotion, SASS/SCSS, Less, Vanilla Extract, Stitches, and plain CSS. Whatever styling approach your codebase uses, Onlook works with it."
            },
            {
                question: "What component libraries does Onlook support?",
                answer: "Onlook works with all major component libraries including shadcn/ui, Material UI, Mantine, Chakra UI, Radix UI, Ant Design, Headless UI, Blueprint, Fluent UI, and PrimeReact. If your components work in your codebase, they work in Onlook."
            },
            {
                question: "Does Onlook work with my existing React components?",
                answer: "Yes. Onlook connects to your codebase and lets you design with your real components — the buttons, cards, and layouts your engineers already built. AI suggestions use your actual component API, not generic alternatives."
            },
            {
                question: "How does Onlook integrate with GitHub?",
                answer: "Onlook connects directly to your GitHub repository. Changes you make are tracked as real code changes. When you're ready to ship, Onlook creates a pull request with your changes that engineers can review, comment on, and merge using their normal workflow."
            }
        ]
    },
    {
        title: "Workflow & Collaboration",
        anchor: "workflow",
        faqs: [
            {
                question: "How do designers and developers collaborate in Onlook?",
                answer: "Designers and developers work in the same artifact — there's no handoff. Designers make visual changes on the canvas, which become real code changes. Developers can review and refine in their IDE. Changes are submitted as PRs for team review. Spatial comments let team members communicate directly on the canvas."
            },
            {
                question: "Can I use Onlook with my existing development workflow?",
                answer: "Yes. Onlook fits into your existing Git workflow. Changes become branches and PRs. Engineers review code in their normal tools. CI/CD pipelines work as expected."
            },
            {
                question: "How does Onlook work with Claude Code or other AI coding tools?",
                answer: "Onlook complements AI coding tools like Claude Code. Claude Code is great for building in the terminal — Onlook adds the visual layer designers need. Use Claude Code to scaffold components, then use Onlook to visually iterate and refine. Changes from both tools merge into the same codebase."
            },
            {
                question: "Can I share my work with stakeholders who don't use Onlook?",
                answer: "Yes. Since Onlook works with real code, you can share your work directly as you created it on the canvas. Stakeholders see real, working UI — not static mockups that might not match the final product."
            }
        ]
    },
    {
        title: "Company",
        anchor: "company",
        faqs: [
            {
                question: "Who created Onlook?",
                answer: "Both the founders come from either side of the design and development divide. We realized that AI could be the final leap to solve the problem of designers and developers working together. Onlook is a continuous iteration towards the new state-of-the-art for collaboration in code."
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

// Generate JSON-LD for all FAQs
const generateFAQJsonLd = () => {
    const allFaqs = faqSections.flatMap(section =>
        section.faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: typeof faq.answer === 'string' ? faq.answer : faq.question, // Fallback for JSX answers
            },
        }))
    );

    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: allFaqs,
    };
};

export default function FAQPage() {
    const [currentSection, setCurrentSection] = useState(faqSections[0]?.anchor || '');
    const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
    const faqContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            const offset = 120;
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

    const scrollToSection = (anchor: string) => {
        const element = document.getElementById(anchor);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <WebsiteLayout showFooter={true}>
            {/* JSON-LD Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQJsonLd()) }}
            />

            {/* Hidden AI-friendly summary */}
            <section className="sr-only" aria-label="FAQ Summary">
                <h1>Onlook Frequently Asked Questions</h1>
                <p>
                    Onlook is an AI-powered visual editor for frontend development. It connects to existing
                    React, Vue, or Angular codebases and lets teams design with real components. AI is
                    constrained to your design system, preventing brand drift. Changes become mergeable
                    pull requests. Onlook supports all major frameworks (React, Next.js, Vue, Angular, Svelte),
                    styling approaches (Tailwind, CSS Modules, styled-components), and component libraries
                    (shadcn/ui, Material UI, Chakra UI, Mantine, Radix UI). It's open source with 24k+ GitHub stars.
                </p>
            </section>

            <div className="w-full max-w-6xl mx-auto py-32 px-4 md:px-8">
                <h1 className="text-foreground-primary text-5xl md:text-6xl leading-[1.1] font-light mb-8 max-w-3xl text-balance">
                    Frequently Asked Questions
                </h1>
                <p className="text-foreground-secondary text-lg mb-16 max-w-2xl">
                    Everything you need to know about Onlook — the AI-powered visual editor for frontend development.
                </p>

                <div className="flex flex-col lg:flex-row gap-12" ref={faqContainerRef}>
                    {/* Sidebar Navigation */}
                    <nav className="hidden lg:block w-48 flex-shrink-0 self-start sticky top-32">
                        <div>
                            <h2 className="text-foreground-tertiary text-sm font-medium uppercase tracking-wider mb-4">Topics</h2>
                            <ul className="flex flex-col gap-2">
                                {faqSections.map((section) => (
                                    <li key={section.anchor}>
                                        <button
                                            onClick={() => scrollToSection(section.anchor)}
                                            className={`text-left text-sm transition-colors ${
                                                currentSection === section.anchor
                                                    ? 'text-foreground-primary'
                                                    : 'text-foreground-tertiary hover:text-foreground-secondary'
                                            }`}
                                        >
                                            {section.title}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </nav>

                    {/* FAQ Content */}
                    <section className="flex-1 max-w-[800px]">
                        {faqSections.map((section, i) => (
                            <div
                                key={section.anchor}
                                id={section.anchor}
                                className="mb-16 scroll-mt-24"
                                ref={el => { sectionRefs.current[i] = el; }}
                            >
                                <h2 className="text-foreground-primary text-2xl font-medium mb-6">{section.title}</h2>
                                <FAQDropdown faqs={section.faqs} />
                            </div>
                        ))}
                    </section>
                </div>
            </div>

            <CTASection
                ctaText={`Still have questions?`}
                buttonText="Book a Demo"
                href={ExternalRoutes.BOOK_DEMO}
            />
        </WebsiteLayout>
    );
}
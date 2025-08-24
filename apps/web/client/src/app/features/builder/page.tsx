'use client';

import React from 'react';

function BuilderFeaturesHero() {
    return (
        <div className="w-full h-screen flex flex-col items-center justify-center gap-12 p-8 text-lg text-center relative">
            <div className="flex flex-col gap-6 items-center relative z-20 pt-4 pb-2 max-w-3xl">
                <h1 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">
                    React Visual Builder
                </h1>
                <p className="text-4xl md:text-6xl font-light leading-tight text-center !leading-[1] text-balance">
                    Build and Edit Apps Visually
                </p>
                <p className="text-lg text-foreground-secondary mx-auto max-w-xl text-center">
                    Onlook's visual builder lets you drag, drop, and edit webapps directly in your browser while maintaining full code access. Perfect for builders who want visual speed without no-code limitations.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-8">
                    <button className="bg-foreground-primary text-background-primary px-8 py-3 rounded-lg font-medium hover:bg-foreground-primary/90 transition-colors">
                        Start Building React Apps
                    </button>
                </div>
            </div>
        </div>
    );
}

function BuilderBenefitsSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8">
            <div className="space-y-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">Visual React Editing for Developers</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Edit React Apps Visually with Code Sync</p>
                        <p className="text-foreground-secondary text-regular mb-8 text-balance max-w-xl">
                            Manipulate your React codebase visually while seeing real-time code changes. No more switching between editor and browser. Build, style, and refactor your react app with pixel-perfect control and automatic code generation.
                        </p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">No-Code React Builder with Developer Tools</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Create Complex React UIs Without Writing Every Line</p>
                        <p className="text-foreground-secondary text-regular mb-8 text-balance max-w-xl">
                            Use drag-and-drop for layouts, components, and state management while Onlook generates production-ready React code.
                        </p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="flex flex-col order-2 lg:order-1">
                        <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-4">AI-Assisted React Development</h2>
                        <p className="text-foreground-primary text-2xl md:text-4xl font-light mb-6">Generate and Refine React Code with AI</p>
                        <p className="text-foreground-secondary text-regular mb-6 text-balance max-w-xl">
                            Combine visual building with AI prompts to create custom React components, hooks, and patterns that match your project's architecture, ensuring everything is typed, optimized, and ready for production.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BuilderFeaturesIntroSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8 text-center">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-foreground-secondary text-sm font-medium uppercase tracking-wider mb-6">
                    Complete React Visual Builder
                </h2>
                <p className="text-foreground-primary text-2xl md:text-5xl leading-[1.1] font-light mb-8 text-balance">
                    All the Tools to Build and Scale Your Apps
                </p>
                <p className="text-foreground-secondary text-lg max-w-xl mx-auto text-balance">
                    Get the best of visual design with developer-grade features. Build complex React applications visually while maintaining full control over your code, components, and architecture.
                </p>
            </div>
        </div>
    );
}

function BuilderFeaturesGridSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-16 px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-20">
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Live Code Editing</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Make visual changes that instantly update your React files with proper TSX, props, and state management</p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Layer Management</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Navigate and organize your app's structure through an intuitive layers panel for precise element selection and editing</p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Component Library Integration</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Use your existing React component library or import any next/tailwind kit</p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">TailwindCSS Visual Editor</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Visually edit and apply Tailwind classes with auto-completion and real-time styling previews</p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Responsive Design Tools</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Build mobile-first React apps with breakpoint previews and automatic media query generation</p>
                </div>
                
                <div>
                    <h3 className="text-foreground-secondary text-small uppercase tracking-wider mb-4">Import Templates</h3>
                    <p className="text-foreground-primary text-lg md:text-xl font-light mb-6 text-balance">Start with any Next.js/Tailwind template and let AI understand your patterns to generate matching components</p>
                </div>
            </div>
        </div>
    );
}

function BuilderCTASection() {
    return (
        <div className="w-full max-w-4xl mx-auto py-32 px-8 text-center">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-foreground-primary text-3xl md:text-5xl leading-[1.1] font-light mb-8 text-balance">
                    Start Building React Apps Visually Today
                </h2>
                <p className="text-foreground-secondary text-lg mb-12 max-w-xl mx-auto text-balance">
                    Join thousands of developers creating efficient, scalable React applications with Onlook's visual builder—combining the power of code with intuitive visual tools.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                    <button className="bg-foreground-primary text-background-primary px-8 py-3 rounded-lg font-medium hover:bg-foreground-primary/90 transition-colors">
                        Get Started for Free
                    </button>
                </div>
            </div>
        </div>
    );
}

function BuilderFAQSection() {
    const builderFAQs = [
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
            question: "What is the difference between Onlook and other design tools?",
            answer: "Onlook is a visual editor for code. It allows you to create and style your own creations with code as the source of truth. While it is best suited for creating websites, it can be used for anything visual – presentations, mockups, and more. Because Onlook uses code as the source of truth, the types of designs you can create are unconstrained by Onlook's interface."
        },
        {
            question: "Why is Onlook open-source?",
            answer: "Developers have historically been second-rate citizens in the design process. Onlook was founded to bridge the divide between design and development, and we wanted to make developers first-class citizens alongside designers. We chose to be open-source to give developers transparency into how we are building Onlook and how the work created through Onlook will complement the work of developers."
        }
    ];

    return (
        <div className="w-full max-w-4xl mx-auto py-32 px-8">
            <div className="text-center mb-16">
                <h2 className="text-foreground-primary text-3xl md:text-5xl leading-[1.1] font-light mb-8 text-balance">
                    Frequently Asked Questions
                </h2>
            </div>
            <div className="space-y-4">
                {builderFAQs.map((faq, index) => (
                    <div key={index} className="border border-border-primary rounded-lg p-6">
                        <h3 className="text-foreground-primary text-lg font-medium mb-3">
                            {faq.question}
                        </h3>
                        <p className="text-foreground-secondary text-regular leading-relaxed">
                            {faq.answer}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function BuilderFeaturesPage() {
    return (
        <div className="min-h-screen bg-background-primary">
            <BuilderFeaturesHero />
            <BuilderBenefitsSection />
            <BuilderFeaturesIntroSection />
            <BuilderFeaturesGridSection />
            <BuilderCTASection />
            <BuilderFAQSection />
        </div>
    );
}

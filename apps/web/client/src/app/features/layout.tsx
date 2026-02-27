import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Features | Onlook - AI-Powered Visual Editor for React, Vue, Angular',
    description: 'Explore Onlook\'s features: AI constrained to your design system, infinite canvas, real-time collaboration, component library integration, version history, and direct GitHub PR output. Works with React, Next.js, Vue, Angular, Tailwind, shadcn/ui, and more.',
    keywords: [
        // Core features
        'visual editor features',
        'AI design tool features',
        'React visual editor',
        'design to code features',
        // Specific features
        'component library editor',
        'design system management',
        'real-time collaboration',
        'version history',
        'infinite canvas',
        'layer management',
        // Technical
        'React editor',
        'Next.js visual editor',
        'Tailwind visual editor',
        'shadcn visual editor',
        // Comparisons
        'Figma alternative for code',
        'visual code editor',
        'design engineer tools',
    ],
    openGraph: {
        title: 'Features | Onlook',
        description: 'AI-powered visual editor with infinite canvas, real-time collaboration, component library integration, and direct PR output.',
        type: 'website',
        url: 'https://onlook.com/features',
        siteName: 'Onlook',
        images: [
            {
                url: 'https://framerusercontent.com/images/ScnnNT7JpmUya7afqGAets8.png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Features | Onlook',
        description: 'AI-powered visual editor with infinite canvas, real-time collaboration, and direct PR output.',
        images: ['https://framerusercontent.com/images/ScnnNT7JpmUya7afqGAets8.png'],
    },
    alternates: {
        canonical: 'https://onlook.com/features',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-snippet': -1,
        },
    },
};

// JSON-LD structured data
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Onlook',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    description: 'Onlook is an AI-powered visual editor for frontend development. Design with your real React, Vue, or Angular components on an infinite canvas. AI is constrained to your design system. Changes become mergeable pull requests.',
    url: 'https://onlook.com/features',
    featureList: [
        'AI constrained to your design system',
        'Infinite canvas for visual design',
        'Real-time team collaboration',
        'Component library integration',
        'Theming and branding management',
        'Visual layer management',
        'Version history with auto-save',
        'React and Next.js templates',
        'Direct GitHub PR output',
        'Works with Tailwind, shadcn/ui, Material UI',
        'Open source with 24k+ GitHub stars',
    ],
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free tier available',
    },
};

const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'What is Onlook?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Onlook is an AI-powered visual editor for frontend development. It connects to your existing React, Vue, or Angular codebase and lets you design with your real components on an infinite canvas. AI is constrained to your design system, and changes become pull requests engineers can merge directly.',
            },
        },
        {
            '@type': 'Question',
            name: 'What features does Onlook offer?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Onlook offers: an infinite canvas for visual design, AI constrained to your design system, real-time team collaboration, component library integration, centralized theming and branding, visual layer management, version history with auto-save, and direct GitHub PR output.',
            },
        },
        {
            '@type': 'Question',
            name: 'What frameworks and libraries does Onlook support?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Onlook works with React, Next.js, Vue, Angular, Svelte, and more. It supports all CSS approaches including Tailwind, CSS Modules, and styled-components. Compatible with component libraries like shadcn/ui, Material UI, Chakra UI, Mantine, and Radix UI.',
            },
        },
        {
            '@type': 'Question',
            name: 'How is Onlook different from other design tools?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Onlook is a visual editor for code. Unlike traditional design tools that create static mockups, Onlook works with your real components — what you design IS the code. Changes become PRs, not specs. AI is constrained to your design system, so there\'s no brand drift.',
            },
        },
        {
            '@type': 'Question',
            name: 'Is Onlook open source?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes. Onlook is open source with 24k+ GitHub stars. You can browse the codebase, contribute improvements, or self-host it for your team.',
            },
        },
    ],
};

export default function FeaturesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            {children}
        </>
    );
}

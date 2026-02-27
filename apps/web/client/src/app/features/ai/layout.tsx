import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI Visual Editor | Build UIs with AI Using Your Design System | Onlook',
    description:
        'Onlook is an AI-powered visual editor that builds frontend UIs using your real React components. AI is constrained to your design system — no brand drift, no throwaway code. Changes become mergeable PRs.',
    keywords: [
        // Primary keywords
        'AI visual editor',
        'AI UI builder',
        'AI design tool',
        'AI frontend development',
        // Design system
        'AI design system',
        'AI component builder',
        'constrained AI code',
        'brand safe AI',
        // Framework specific
        'React AI builder',
        'Next.js AI editor',
        'AI Tailwind editor',
        // Workflow
        'AI to PR workflow',
        'visual AI coding',
        'design to code AI',
        // Comparisons
        'v0 alternative',
        'AI website builder',
        'AI prototype generator',
    ],
    openGraph: {
        title: 'AI Visual Editor | Onlook',
        description:
            'Build frontend UIs with AI constrained to your design system. Your real components. Mergeable PRs, not throwaway code.',
        type: 'website',
        url: 'https://onlook.com/features/ai',
        siteName: 'Onlook',
        images: [
            {
                url: 'https://framerusercontent.com/images/ScnnNT7JpmUya7afqGAets8.png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AI Visual Editor | Onlook',
        description:
            'Build frontend UIs with AI constrained to your design system. Your real components. Mergeable PRs.',
        images: ['https://framerusercontent.com/images/ScnnNT7JpmUya7afqGAets8.png'],
    },
    alternates: {
        canonical: 'https://onlook.com/features/ai',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
};

// JSON-LD structured data
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Onlook AI Visual Editor',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    description:
        'Onlook is an AI-powered visual editor that builds frontend UIs using your real React, Vue, or Angular components. AI is constrained to your design system. Changes become mergeable pull requests.',
    url: 'https://onlook.com/features/ai',
    featureList: [
        'AI constrained to your design system',
        'Visual canvas with real code underneath',
        'Works with React, Vue, Angular, Next.js, Svelte',
        'Supports Tailwind, CSS Modules, styled-components',
        'Compatible with shadcn/ui, Material UI, Chakra UI',
        'Direct GitHub PR output',
        'Real-time team collaboration',
        'No coding required for designers',
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
                text: 'Onlook is an AI-powered visual editor for frontend development. It connects to your existing codebase and lets you design with your real components. AI is constrained to your design system, and changes become mergeable pull requests.',
            },
        },
        {
            '@type': 'Question',
            name: 'How does Onlook AI differ from other AI code generators?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: "Most AI tools generate generic HTML/CSS from scratch. Onlook connects to your existing component library and constrains AI to YOUR design system. Outputs are consistent, on-brand, and directly mergeable. No translation step needed.",
            },
        },
        {
            '@type': 'Question',
            name: 'Does Onlook AI work with my existing React components?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes. Onlook connects to your codebase and lets you design with your real components — the buttons, cards, and layouts your engineers already built. AI suggestions use your actual component API.',
            },
        },
        {
            '@type': 'Question',
            name: 'Can AI drift from my design system in Onlook?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: "No. Unlike raw AI code generation, Onlook constrains AI to your existing components, colors, and tokens. AI can only use what's in your design system — no drift, no off-brand results.",
            },
        },
    ],
};

export default function AiFeaturesLayout({ children }: { children: React.ReactNode }) {
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

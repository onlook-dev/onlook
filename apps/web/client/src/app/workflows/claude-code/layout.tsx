import { type Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Claude Code for Designers: Add a Visual Canvas to Your Workflow | Onlook',
    description:
        'Designers using Claude Code need a visual layer. Onlook gives you an infinite canvas for your AI-built UIs — with your real components, team collaboration, and PR output.',
    keywords: [
        // Primary keywords
        'claude code for designers',
        'claude code visual editor',
        'claude code design tool',
        'claude code UI design',
        'visual layer for claude code',
        'claude code collaboration',
        // Related tools
        'cursor for designers',
        'AI code visual canvas',
        'anthropic claude design',
        // Workflow
        'design engineer workflow',
        'AI coding visual design',
        'claude code infinite canvas',
        'visual AI development',
        // Problem/solution
        'claude code team collaboration',
        'claude code PR output',
        'claude code design system',
        'AI generated UI editor',
    ],
    openGraph: {
        url: 'https://onlook.com/workflows/claude-code',
        type: 'website',
        siteName: 'Onlook',
        title: 'Claude Code for Designers: Add a Visual Canvas to Your Workflow | Onlook',
        description:
            'Designers using Claude Code need a visual layer. Onlook gives you an infinite canvas for your AI-built UIs — with your real components, team collaboration, and PR output.',
        images: [
            {
                url: 'https://framerusercontent.com/images/ScnnNT7JpmUya7afqGAets8.png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        site: '@onlookdev',
        creator: '@onlookdev',
        title: 'Claude Code for Designers | Onlook',
        description:
            'The visual canvas your Claude Code workflow is missing. Design with your real components, collaborate with your team, ship PRs.',
        images: [
            {
                url: 'https://framerusercontent.com/images/ScnnNT7JpmUya7afqGAets8.png',
            },
        ],
    },
    alternates: {
        canonical: 'https://onlook.com/workflows/claude-code',
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
    name: 'Onlook for Claude Code',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    description:
        'Onlook adds a visual design layer to Claude Code. An infinite canvas for AI-built UIs with your real components, team collaboration, and direct PR output.',
    url: 'https://onlook.com/workflows/claude-code',
    featureList: [
        'Infinite canvas for Claude Code projects',
        'Visual editing of AI-generated UIs',
        'Design with your real React components',
        'Real-time team collaboration',
        'Spatial comments on the canvas',
        'Direct GitHub PR output',
        'AI constrained to your design system',
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
            name: 'How does Onlook work with Claude Code?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Claude Code handles the terminal and code generation. Onlook provides the visual canvas. Together, they give you a complete design-to-code workflow — Claude Code builds, Onlook lets you visually iterate and refine.',
            },
        },
        {
            '@type': 'Question',
            name: 'Do I need to know code to use Onlook with Claude Code?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: "No. Onlook gives you a visual canvas where you can drag, resize, and arrange elements. The code runs underneath — you don't need to touch it unless you want to.",
            },
        },
        {
            '@type': 'Question',
            name: 'Can I use my existing components with Onlook?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes. Onlook connects to your existing codebase and lets you design with your real components — the buttons, cards, and layouts your engineers already built.',
            },
        },
        {
            '@type': 'Question',
            name: 'What makes Onlook different from using Claude Code alone?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Claude Code is terminal-based and works best for building. Onlook adds the visual layer designers need — an infinite canvas, team collaboration, and visual iteration on AI-generated UIs.',
            },
        },
        {
            '@type': 'Question',
            name: 'Does Onlook constrain AI to my design system?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes. Unlike raw AI code generation, Onlook constrains AI to your existing components, colors, and tokens. This means outputs match your design system — no drift, no off-brand results.',
            },
        },
    ],
};

export default function ClaudeCodeLayout({ children }: { children: React.ReactNode }) {
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

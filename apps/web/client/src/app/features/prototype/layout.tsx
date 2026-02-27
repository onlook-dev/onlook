import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI Prototype Generator | Create Functional React Prototypes | Onlook',
    description:
        'Onlook generates functional React prototypes with real interactions — not static mockups. From idea to interactive prototype in minutes. Perfect for rapid prototyping and product validation.',
    keywords: [
        // Primary keywords
        'AI prototype generator',
        'rapid prototyping tool',
        'functional prototype',
        'interactive prototype',
        // Specific features
        'React prototype generator',
        'AI prototyping',
        'functional mockup',
        'working prototype',
        // Use cases
        'product validation',
        'user testing prototype',
        'stakeholder demo',
        'MVP prototype',
        // Comparisons
        'Figma prototype alternative',
        'beyond static mockups',
        'clickable prototype',
        // Workflow
        'design to prototype',
        'prototype to production',
        'rapid product iteration',
    ],
    openGraph: {
        title: 'AI Prototype Generator | Onlook',
        description:
            'Create functional React prototypes with real interactions in minutes. Not static mockups — working applications.',
        type: 'website',
        url: 'https://onlook.com/features/prototype',
        siteName: 'Onlook',
        images: [
            {
                url: 'https://framerusercontent.com/images/ScnnNT7JpmUya7afqGAets8.png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AI Prototype Generator | Onlook',
        description:
            'Create functional React prototypes with real interactions in minutes. Not static mockups — working applications.',
        images: ['https://framerusercontent.com/images/ScnnNT7JpmUya7afqGAets8.png'],
    },
    alternates: {
        canonical: 'https://onlook.com/features/prototype',
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
    name: 'Onlook AI Prototype Generator',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    description:
        'Onlook generates functional React prototypes with real interactions. Perfect for rapid prototyping, product validation, and user testing.',
    url: 'https://onlook.com/features/prototype',
    featureList: [
        'AI-powered prototype generation',
        'Functional React prototypes with real interactions',
        'Working forms, navigation, data visualization',
        'Production-ready code output',
        'Version history and rollback',
        'Team sharing and collaboration',
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
            name: 'What makes Onlook different from other prototyping tools?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: "Onlook generates functional React prototypes with real interactions — not just clickable mockups. While other tools create static prototypes, Onlook's AI builds production-ready code you can actually test and deploy.",
            },
        },
        {
            '@type': 'Question',
            name: 'How quickly can I create a prototype with Onlook?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: "Most prototypes can be generated in seconds. Simply describe your idea or import a reference design image, and Onlook's AI will create a functional prototype with working components, proper styling, and interactive features ready for testing.",
            },
        },
        {
            '@type': 'Question',
            name: 'What kind of prototypes can I build?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'You can build any type of web application prototype — dashboards, e-commerce sites, social platforms, SaaS tools, mobile apps, and more. Onlook generates components with real interactions.',
            },
        },
        {
            '@type': 'Question',
            name: 'Is the generated code production-ready?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes! Onlook generates clean, well-structured React code with proper TypeScript, Tailwind CSS, and modern best practices. You can use the prototype code as a foundation for your production application.',
            },
        },
        {
            '@type': 'Question',
            name: 'How do I share prototypes with my team?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Onlook provides instant deployment to live URLs that you can share with anyone. Team members can interact with the prototype, leave comments, and collaborate in real-time.',
            },
        },
    ],
};

export default function PrototypeFeaturesLayout({ children }: { children: React.ReactNode }) {
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
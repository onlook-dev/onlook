import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About Onlook | The Team Behind the Visual Editor for React',
    description:
        'Meet the team behind Onlook — an AI-powered visual editor for frontend development. Founded to obliterate the divide between creativity and implementation. YC W25, 24k+ GitHub stars, open source.',
    keywords: [
        // Company
        'Onlook team',
        'Onlook founders',
        'Onlook company',
        'Onlook about',
        // Mission
        'design engineering',
        'design to code',
        'creative tools startup',
        'developer tools startup',
        // Location
        'San Francisco startup',
        'YC W25',
        'Y Combinator startup',
        // Hiring
        'Onlook careers',
        'Onlook jobs',
        'design tools jobs',
        'developer tools jobs',
        // Open source
        'open source design tool',
        'open source visual editor',
    ],
    openGraph: {
        title: 'About Onlook',
        description:
            'Meet the team behind Onlook. Founded to obliterate the divide between creativity and implementation.',
        type: 'website',
        url: 'https://onlook.com/about',
        siteName: 'Onlook',
        images: [
            {
                url: 'https://framerusercontent.com/images/ScnnNT7JpmUya7afqGAets8.png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'About Onlook',
        description:
            'Meet the team behind Onlook. Founded to obliterate the divide between creativity and implementation.',
        images: ['https://framerusercontent.com/images/ScnnNT7JpmUya7afqGAets8.png'],
    },
    alternates: {
        canonical: 'https://onlook.com/about',
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

// JSON-LD structured data for the organization
const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Onlook',
    url: 'https://onlook.com',
    logo: 'https://onlook.com/logo.png',
    description:
        'Onlook is an AI-powered visual editor for frontend development. Design with your real React, Vue, or Angular components. Changes become mergeable pull requests.',
    foundingDate: '2024',
    founders: [
        {
            '@type': 'Person',
            name: 'Daniel Farrell',
            jobTitle: 'Co-Founder, Design & Growth',
            url: 'https://www.linkedin.com/in/danielrfarrell/',
        },
        {
            '@type': 'Person',
            name: 'Kiet Ho',
            jobTitle: 'Co-Founder, Engineering',
            url: 'https://www.linkedin.com/in/kiet-ho/',
        },
    ],
    numberOfEmployees: {
        '@type': 'QuantitativeValue',
        value: 3,
    },
    address: {
        '@type': 'PostalAddress',
        addressLocality: 'San Francisco',
        addressRegion: 'CA',
        addressCountry: 'US',
    },
    sameAs: [
        'https://github.com/onlook-dev/onlook',
        'https://x.com/onlookdev',
        'https://www.linkedin.com/company/onlook-dev/',
        'https://discord.gg/ZZzadNQtns',
        'https://onlook.substack.com/',
    ],
    award: 'Y Combinator W25',
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
                text: 'Onlook is an AI-powered visual editor for frontend development. It connects to your existing React, Vue, or Angular codebase and lets you design with your real components. AI is constrained to your design system, and changes become mergeable pull requests.',
            },
        },
        {
            '@type': 'Question',
            name: 'Who founded Onlook?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Onlook was founded by Daniel Farrell (Design & Growth) and Kiet Ho (Engineering). Daniel is a designer with over a decade of experience, former Head of Growth at Bird. Kiet is an ex-Amazon engineer who maintained the design system at ServiceNow.',
            },
        },
        {
            '@type': 'Question',
            name: 'Where is Onlook based?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Onlook is based in San Francisco, California. The team operates from their headquarters (the "Barracks") after completing Y Combinator W25.',
            },
        },
        {
            '@type': 'Question',
            name: 'Is Onlook open source?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes. Onlook is open source with 24k+ GitHub stars and 100+ contributors. You can browse the codebase, contribute improvements, or self-host it for your team.',
            },
        },
        {
            '@type': 'Question',
            name: 'Is Onlook hiring?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes. Onlook is hiring for "The Odyssey" — their founding team. They look for commitment, passion for design/devtools/AI, and world-class excellence. The hiring process includes screening calls, technical interviews, reference calls, and a paid work trial.',
            },
        },
    ],
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            {children}
        </>
    );
}
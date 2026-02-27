import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'FAQ | Onlook - AI-Powered Visual Editor for Frontend Development',
    description: 'Frequently asked questions about Onlook, the AI-powered visual editor for frontend development. Learn about supported frameworks (React, Vue, Angular), component libraries (shadcn/ui, Material UI), AI features, pricing, and how Onlook differs from other design tools.',
    keywords: [
        'Onlook FAQ',
        'Onlook questions',
        'AI visual editor FAQ',
        'React visual editor',
        'design to code tool',
        'frontend AI tools',
        'Onlook vs Figma',
        'Onlook vs V0',
        'Onlook pricing',
        'Onlook features',
        'design system tools',
        'component library editor',
    ],
    openGraph: {
        title: 'FAQ | Onlook',
        description: 'Everything you need to know about Onlook - the AI-powered visual editor for frontend development.',
        type: 'website',
        url: 'https://onlook.com/faq',
        siteName: 'Onlook',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'FAQ | Onlook',
        description: 'Everything you need to know about Onlook - the AI-powered visual editor for frontend development.',
    },
    alternates: {
        canonical: 'https://onlook.com/faq',
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

export default function FAQLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}

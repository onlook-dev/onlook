import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sitemap | Onlook',
    description:
        'Complete sitemap for Onlook.com — the AI-powered visual editor for frontend development. Browse all pages including features, workflows, resources, and documentation.',
    openGraph: {
        title: 'Sitemap | Onlook',
        description:
            'Complete sitemap for Onlook.com. Browse all pages including features, workflows, and resources.',
        type: 'website',
        url: 'https://onlook.com/site-map',
        siteName: 'Onlook',
    },
    alternates: {
        canonical: 'https://onlook.com/site-map',
    },
    robots: {
        index: true,
        follow: true,
    },
};

// JSON-LD structured data for sitemap
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Onlook Sitemap',
    description: 'Complete sitemap for Onlook.com — the AI-powered visual editor for frontend development.',
    url: 'https://onlook.com/site-map',
    mainEntity: {
        '@type': 'ItemList',
        itemListElement: [
            {
                '@type': 'SiteNavigationElement',
                position: 1,
                name: 'Home',
                url: 'https://onlook.com/',
            },
            {
                '@type': 'SiteNavigationElement',
                position: 2,
                name: 'Features',
                url: 'https://onlook.com/features',
            },
            {
                '@type': 'SiteNavigationElement',
                position: 3,
                name: 'Workflows',
                url: 'https://onlook.com/workflows',
            },
            {
                '@type': 'SiteNavigationElement',
                position: 4,
                name: 'Pricing',
                url: 'https://onlook.com/pricing',
            },
            {
                '@type': 'SiteNavigationElement',
                position: 5,
                name: 'About',
                url: 'https://onlook.com/about',
            },
            {
                '@type': 'SiteNavigationElement',
                position: 6,
                name: 'FAQ',
                url: 'https://onlook.com/faq',
            },
        ],
    },
};

export default function SitemapLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            {children}
        </>
    );
}

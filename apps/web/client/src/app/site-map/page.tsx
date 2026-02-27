'use client';

import { useEffect, useRef, useState } from 'react';
import { WebsiteLayout } from '../_components/website-layout';
import { ExternalRoutes, Routes } from '@/utils/constants';
import { Icons } from '@onlook/ui/icons';

interface SitemapLink {
    title: string;
    href: string;
    description: string;
    external?: boolean;
}

interface SitemapSection {
    title: string;
    anchor: string;
    links: SitemapLink[];
}

const sitemapSections: SitemapSection[] = [
    {
        title: "Main Pages",
        anchor: "main",
        links: [
            {
                title: "Home",
                href: Routes.HOME,
                description: "Onlook homepage — Cursor for Designers. AI-powered visual editor for frontend development."
            },
            {
                title: "Pricing",
                href: Routes.PRICING,
                description: "Onlook pricing plans and tiers for individuals and teams."
            },
            {
                title: "About",
                href: Routes.ABOUT,
                description: "Meet the team behind Onlook. Our mission, values, and story."
            },
            {
                title: "FAQ",
                href: Routes.FAQ,
                description: "Frequently asked questions about Onlook features, compatibility, and workflow."
            },
        ]
    },
    {
        title: "Features",
        anchor: "features",
        links: [
            {
                title: "All Features",
                href: Routes.FEATURES,
                description: "Overview of all Onlook features — infinite canvas, AI, collaboration, and more."
            },
            {
                title: "AI",
                href: Routes.FEATURES_AI,
                description: "AI-powered visual editing constrained to your design system."
            },
            {
                title: "AI for Frontend",
                href: Routes.FEATURES_AI_FRONTEND,
                description: "Build frontend UIs with AI using your real React, Vue, or Angular components."
            },
            {
                title: "Visual Builder",
                href: Routes.FEATURES_BUILDER,
                description: "Design with your real components on an infinite canvas."
            },
            {
                title: "Prototyping",
                href: Routes.FEATURES_PROTOTYPE,
                description: "Generate functional React prototypes with real interactions."
            },
        ]
    },
    {
        title: "Workflows",
        anchor: "workflows",
        links: [
            {
                title: "All Workflows",
                href: Routes.WORKFLOWS,
                description: "Connect Onlook to your existing AI coding tools."
            },
            {
                title: "Claude Code",
                href: Routes.WORKFLOWS_CLAUDE_CODE,
                description: "Add a visual canvas to your Claude Code workflow."
            },
            {
                title: "Vibe Coding",
                href: Routes.WORKFLOWS_VIBE_CODING,
                description: "Team collaboration for vibe coding workflows."
            },
        ]
    },
    {
        title: "Resources",
        anchor: "resources",
        links: [
            {
                title: "Documentation",
                href: ExternalRoutes.DOCS,
                description: "Learn how to use Onlook with guides and API references.",
                external: true
            },
            {
                title: "Blog",
                href: ExternalRoutes.BLOG,
                description: "News, updates, and insights from the Onlook team.",
                external: true
            },
            {
                title: "GitHub",
                href: ExternalRoutes.GITHUB,
                description: "Browse the open-source codebase, contribute, or report issues.",
                external: true
            },
            {
                title: "Discord",
                href: ExternalRoutes.DISCORD,
                description: "Join the Onlook community for support and discussions.",
                external: true
            },
        ]
    },
    {
        title: "Social",
        anchor: "social",
        links: [
            {
                title: "X (Twitter)",
                href: ExternalRoutes.X,
                description: "Follow @onlookdev for updates and announcements.",
                external: true
            },
            {
                title: "LinkedIn",
                href: ExternalRoutes.LINKEDIN,
                description: "Connect with Onlook on LinkedIn.",
                external: true
            },
            {
                title: "YouTube",
                href: ExternalRoutes.YOUTUBE,
                description: "Watch tutorials, demos, and product updates.",
                external: true
            },
            {
                title: "Substack",
                href: ExternalRoutes.SUBSTACK,
                description: "Subscribe to our newsletter for in-depth articles.",
                external: true
            },
        ]
    },
    {
        title: "Legal",
        anchor: "legal",
        links: [
            {
                title: "Terms of Service",
                href: "/terms-of-service",
                description: "Onlook terms of service and usage agreement."
            },
            {
                title: "Privacy Policy",
                href: "/privacy-policy",
                description: "How we collect, use, and protect your data."
            },
        ]
    },
];

function SitemapLinkItem({ link }: { link: SitemapLink }) {
    return (
        <a
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            className="group block py-4 border-b border-foreground-primary/10 last:border-b-0"
        >
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-foreground-primary text-lg group-hover:underline">
                            {link.title}
                        </span>
                        {link.external && (
                            <Icons.ExternalLink className="w-4 h-4 text-foreground-tertiary" />
                        )}
                    </div>
                    <p className="text-foreground-secondary text-regular mt-1">
                        {link.description}
                    </p>
                </div>
                <Icons.ArrowRight className="w-5 h-5 text-foreground-tertiary group-hover:text-foreground-primary transition-colors" />
            </div>
        </a>
    );
}

export default function SitemapPage() {
    const [currentSection, setCurrentSection] = useState(sitemapSections[0]?.anchor || '');
    const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);

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
            if (sitemapSections[activeIdx]?.anchor && sitemapSections[activeIdx]?.anchor !== currentSection) {
                setCurrentSection(sitemapSections[activeIdx]?.anchor || '');
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
            {/* Hidden AI-friendly summary */}
            <section className="sr-only" aria-label="Sitemap Summary">
                <h1>Onlook Sitemap</h1>
                <p>
                    Complete sitemap for Onlook.com — the AI-powered visual editor for frontend development.
                    Browse all pages including features, workflows, resources, and documentation.
                </p>
                <h2>Main Pages</h2>
                <ul>
                    <li>Home — Cursor for Designers, AI-powered visual editor</li>
                    <li>Pricing — Plans and pricing for individuals and teams</li>
                    <li>About — Team, mission, and company story</li>
                    <li>FAQ — Frequently asked questions</li>
                </ul>
                <h2>Features</h2>
                <ul>
                    <li>AI — AI-powered visual editing</li>
                    <li>AI for Frontend — Build UIs with your real components</li>
                    <li>Visual Builder — Infinite canvas design</li>
                    <li>Prototyping — Functional React prototypes</li>
                </ul>
                <h2>Workflows</h2>
                <ul>
                    <li>Claude Code — Visual canvas for Claude Code</li>
                    <li>Vibe Coding — Team collaboration for AI coding</li>
                </ul>
            </section>

            <div className="w-full max-w-6xl mx-auto py-32 px-4 md:px-8">
                <h1 className="text-foreground-primary text-5xl md:text-6xl leading-[1.1] font-light mb-8 max-w-3xl text-balance">
                    Sitemap
                </h1>
                <p className="text-foreground-secondary text-lg mb-16 max-w-2xl">
                    Browse all pages on Onlook.com — features, workflows, resources, and more.
                </p>

                <div className="flex flex-col lg:flex-row gap-12" ref={containerRef}>
                    {/* Sidebar Navigation */}
                    <nav className="hidden lg:block w-48 flex-shrink-0 self-start sticky top-32">
                        <div>
                            <h2 className="text-foreground-tertiary text-sm font-medium uppercase tracking-wider mb-4">Sections</h2>
                            <ul className="flex flex-col gap-2">
                                {sitemapSections.map((section) => (
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

                    {/* Sitemap Content */}
                    <section className="flex-1 max-w-[800px]">
                        {sitemapSections.map((section, i) => (
                            <div
                                key={section.anchor}
                                id={section.anchor}
                                className="mb-16 scroll-mt-24"
                                ref={el => { sectionRefs.current[i] = el; }}
                            >
                                <h2 className="text-foreground-primary text-2xl font-medium mb-6">{section.title}</h2>
                                <div className="flex flex-col">
                                    {section.links.map((link) => (
                                        <SitemapLinkItem key={link.href} link={link} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>
                </div>
            </div>
        </WebsiteLayout>
    );
}

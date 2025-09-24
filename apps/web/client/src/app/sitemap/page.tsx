'use client';

import { Icons } from '@onlook/ui/icons';

import { ExternalRoutes, Routes } from '@/utils/constants';
import { Footer } from '../_components/landing-page/page-footer';
import { TopBar } from '../_components/top-bar';

export default function SitemapPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <div className="bg-background/80 fixed top-0 left-0 z-50 h-12 w-full backdrop-blur-sm">
                <TopBar />
            </div>
            <main className="flex-1 pt-16">
                <div className="mx-auto max-w-4xl px-8 py-16">
                    <h1 className="text-foreground-primary mb-8 text-4xl font-light">Sitemap</h1>

                    <div className="prose prose-invert max-w-none">
                        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
                            {/* Company Section */}
                            <div>
                                <h2 className="text-foreground-primary mb-6 text-2xl font-light">
                                    Company
                                </h2>
                                <ul className="text-foreground-secondary space-y-4">
                                    <li>
                                        <a
                                            href={Routes.ABOUT}
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            About
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href={ExternalRoutes.DOCS}
                                            target="_blank"
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            Docs
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href={Routes.FAQ}
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            FAQ
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href={ExternalRoutes.BLOG}
                                            target="_blank"
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            Blog
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href={Routes.CAREERS}
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            Careers
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            {/* Product Section */}
                            <div>
                                <h2 className="text-foreground-primary mb-6 text-2xl font-light">
                                    Product
                                </h2>
                                <ul className="text-foreground-secondary space-y-4">
                                    <li>
                                        <a
                                            href="/get-started"
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            Get Started
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href={ExternalRoutes.GITHUB}
                                            target="_blank"
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            GitHub
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="/visual-editor"
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            Visual Editor
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="/shadcn"
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            ShadCN
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="/ai-frontend"
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            AI for Frontend
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            {/* Legal Section */}
                            <div>
                                <h2 className="text-foreground-primary mb-6 text-2xl font-light">
                                    Legal
                                </h2>
                                <ul className="text-foreground-secondary space-y-4">
                                    <li>
                                        <a
                                            href="/terms-of-service"
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            Terms of Service
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="/privacy-policy"
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            Privacy Policy
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="/sitemap"
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            Sitemap
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            {/* Resources Section */}
                            <div>
                                <h2 className="text-foreground-primary mb-6 text-2xl font-light">
                                    Resources
                                </h2>
                                <ul className="text-foreground-secondary space-y-4">
                                    <li>
                                        <a
                                            href="/ux-glossary"
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            UX Glossary
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="/support"
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            Support
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="/contact"
                                            className="text-foreground-secondary text-regular hover:text-foreground-primary hover:underline"
                                        >
                                            Contact
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            {/* Social Links */}
                            <div>
                                <h2 className="text-foreground-primary mb-6 text-2xl font-light">
                                    Connect
                                </h2>
                                <div className="flex gap-6">
                                    <a
                                        href={ExternalRoutes.GITHUB}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-foreground-secondary hover:text-foreground-primary transition-colors"
                                    >
                                        <Icons.GitHubLogo className="h-6 w-6" />
                                    </a>
                                    <a
                                        href={ExternalRoutes.DISCORD}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-foreground-secondary hover:text-foreground-primary transition-colors"
                                    >
                                        <Icons.DiscordLogo className="h-6 w-6" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

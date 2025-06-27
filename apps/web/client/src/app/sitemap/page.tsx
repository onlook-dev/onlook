'use client';

import { ExternalRoutes, Routes } from '@/utils/constants';
import { Icons } from '@onlook/ui/icons';
import { Footer } from '../_components/landing-page/page-footer';
import { TopBar } from '../_components/top-bar';

export default function SitemapPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <div className="fixed top-0 left-0 w-full h-12 bg-background/80 backdrop-blur-sm z-50">
                <TopBar />
            </div>
            <main className="flex-1 pt-16">
                <div className="max-w-4xl mx-auto px-8 py-16">
                    <h1 className="text-4xl font-light text-foreground-primary mb-8">Sitemap</h1>

                    <div className="prose prose-invert max-w-none">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                            {/* Company Section */}
                            <div>
                                <h2 className="text-2xl font-light text-foreground-primary mb-6">Company</h2>
                                <ul className="space-y-4 text-foreground-secondary">
                                    <li>
                                        <a href={Routes.ABOUT} className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">About</a>
                                    </li>
                                    <li>
                                        <a href={ExternalRoutes.DOCS} target="_blank" className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">Docs</a>
                                    </li>
                                    <li>
                                        <a href={Routes.FAQ} className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">FAQ</a>
                                    </li>
                                    <li>
                                        <a href={ExternalRoutes.BLOG} target="_blank" className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">Blog</a>
                                    </li>
                                    <li>
                                        <a href={Routes.CAREERS} className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">Careers</a>
                                    </li>
                                </ul>
                            </div>

                            {/* Product Section */}
                            <div>
                                <h2 className="text-2xl font-light text-foreground-primary mb-6">Product</h2>
                                <ul className="space-y-4 text-foreground-secondary">
                                    <li>
                                        <a href="/get-started" className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">Get Started</a>
                                    </li>
                                    <li>
                                        <a href={ExternalRoutes.GITHUB} target="_blank" className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">GitHub</a>
                                    </li>
                                    <li>
                                        <a href="/visual-editor" className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">Visual Editor</a>
                                    </li>
                                    <li>
                                        <a href="/shadcn" className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">ShadCN</a>
                                    </li>
                                    <li>
                                        <a href="/ai-frontend" className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">AI for Frontend</a>
                                    </li>
                                </ul>
                            </div>

                            {/* Legal Section */}
                            <div>
                                <h2 className="text-2xl font-light text-foreground-primary mb-6">Legal</h2>
                                <ul className="space-y-4 text-foreground-secondary">
                                    <li>
                                        <a href="/terms-of-service" className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">Terms of Service</a>
                                    </li>
                                    <li>
                                        <a href="/privacy-policy" className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">Privacy Policy</a>
                                    </li>
                                    <li>
                                        <a href="/sitemap" className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">Sitemap</a>
                                    </li>
                                </ul>
                            </div>

                            {/* Resources Section */}
                            <div>
                                <h2 className="text-2xl font-light text-foreground-primary mb-6">Resources</h2>
                                <ul className="space-y-4 text-foreground-secondary">
                                    <li>
                                        <a href="/ux-glossary" className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">UX Glossary</a>
                                    </li>
                                    <li>
                                        <a href="/support" className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">Support</a>
                                    </li>
                                    <li>
                                        <a href="/contact" className="text-foreground-secondary text-regular hover:underline hover:text-foreground-primary">Contact</a>
                                    </li>
                                </ul>
                            </div>

                            {/* Social Links */}
                            <div>
                                <h2 className="text-2xl font-light text-foreground-primary mb-6">Connect</h2>
                                <div className="flex gap-6">
                                    <a href={ExternalRoutes.GITHUB} target="_blank" rel="noopener noreferrer" className="text-foreground-secondary hover:text-foreground-primary transition-colors">
                                        <Icons.GitHubLogo className="w-6 h-6" />
                                    </a>
                                    <a href={ExternalRoutes.DISCORD} target="_blank" rel="noopener noreferrer" className="text-foreground-secondary hover:text-foreground-primary transition-colors">
                                        <Icons.DiscordLogo className="w-6 h-6" />
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
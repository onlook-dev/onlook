import { useRouter } from 'next/navigation';

import { Icons } from '@onlook/ui/icons';

import { ExternalRoutes, Routes } from '@/utils/constants';
import { Illustrations } from './illustrations';

export function Footer() {
    const router = useRouter();

    return (
        <footer className="text-foreground-primary border-foreground-primary/10 mt-24 w-full border-t pb-24">
            <div className="mx-auto flex max-w-6xl flex-col gap-24 px-8 pt-16 pb-24 md:flex-row md:items-start">
                {/* Left: Slogan */}
                <div
                    className="flex min-w-[250px] flex-1 cursor-pointer flex-col gap-8"
                    onClick={() => router.push('/')}
                >
                    <Icons.OnlookTextLogo className="text-foreground-primary h-5 w-24" />
                </div>
                {/* Center: Links */}
                <div className="flex flex-1 flex-col justify-center gap-12 md:flex-row md:gap-24">
                    <div>
                        <h3 className="text-regularPlus text-foreground-primary mb-4">Company</h3>
                        <ul className="text-regular text-foreground-secondary flex flex-col gap-4">
                            <li>
                                <a href={Routes.ABOUT} className="hover:underline">
                                    About
                                </a>
                            </li>
                            <li>
                                <a
                                    href={ExternalRoutes.DOCS}
                                    target="_blank"
                                    className="hover:underline"
                                    title="View Onlook documentation"
                                >
                                    Docs
                                </a>
                            </li>
                            <li>
                                <a
                                    href={Routes.FAQ}
                                    className="hover:underline"
                                    title="Frequently Asked Questions"
                                >
                                    FAQ
                                </a>
                            </li>
                            <li>
                                <a
                                    href={ExternalRoutes.BLOG}
                                    target="_blank"
                                    className="hover:underline"
                                    title="Read the Onlook blog"
                                >
                                    Blog
                                </a>
                            </li>
                            {/* <li><a href="#" className="hover:underline">Careers</a></li> */}
                            <li>
                                <a
                                    href="mailto:contact@onlook.com"
                                    className="hover:underline"
                                    title="Contact Onlook support"
                                >
                                    Contact
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div className="min-w-[200px]">
                        <h3 className="text-regularPlus text-foreground-primary mb-4">Product</h3>
                        <ul className="text-regular text-foreground-secondary flex flex-col gap-4">
                            <li>
                                <a
                                    href={Routes.PROJECTS}
                                    className="hover:underline"
                                    title="View your projects"
                                >
                                    My Projects
                                </a>
                            </li>
                            <li>
                                <a
                                    href={ExternalRoutes.GITHUB}
                                    target="_blank"
                                    className="hover:underline"
                                    title="View Onlook on GitHub"
                                >
                                    GitHub Repo
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/features"
                                    className="hover:underline"
                                    title="View Onlook features"
                                >
                                    Features
                                </a>
                            </li>
                            <li>
                                <a
                                    href={Routes.FEATURES_AI}
                                    className="hover:underline"
                                    title="AI-powered development tools"
                                >
                                    AI
                                </a>
                            </li>
                            <li>
                                <a
                                    href={Routes.FEATURES_PROTOTYPE}
                                    className="hover:underline"
                                    title="Rapid prototyping features"
                                >
                                    Prototyping
                                </a>
                            </li>
                            <li>
                                <a
                                    href={Routes.FEATURES_BUILDER}
                                    className="hover:underline"
                                    title="Visual builder tools"
                                >
                                    Visual Builder
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/pricing"
                                    className="hover:underline"
                                    title="View Onlook pricing"
                                >
                                    Pricing
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-regularPlus text-foreground-primary mb-4">Follow Us</h3>
                        <div className="mt-2 flex items-center gap-6">
                            <a
                                href={ExternalRoutes.X}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Follow Onlook on X"
                            >
                                <Icons.SocialX className="text-foreground-secondary hover:text-foreground-primary h-6 w-6 transition-colors" />
                            </a>
                            <a
                                href={ExternalRoutes.LINKEDIN}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Connect with Onlook on LinkedIn"
                            >
                                <Icons.SocialLinkedIn className="text-foreground-secondary hover:text-foreground-primary h-6 w-6 transition-colors" />
                            </a>
                            <a
                                href={ExternalRoutes.SUBSTACK}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Subscribe to Onlook on Substack"
                            >
                                <Icons.SocialSubstack className="text-foreground-secondary hover:text-foreground-primary h-6 w-6 transition-colors" />
                            </a>
                            <a
                                href={ExternalRoutes.YOUTUBE}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Watch Onlook on YouTube"
                            >
                                <Icons.SocialYoutube className="text-foreground-secondary hover:text-foreground-primary h-6 w-6 transition-colors" />
                            </a>
                            <a
                                href={ExternalRoutes.GITHUB}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View Onlook on GitHub"
                            >
                                <Icons.GitHubLogo className="text-foreground-secondary hover:text-foreground-primary h-5.5 w-5.5 transition-colors" />
                            </a>
                            <a
                                href={ExternalRoutes.DISCORD}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Join the Onlook Discord community"
                            >
                                <Icons.DiscordLogo className="text-foreground-secondary hover:text-foreground-primary h-6 w-6 transition-colors" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            {/* Bottom Bar */}
            <div className="mx-auto max-w-6xl px-8 pt-24 pb-4">
                <div className="border-foreground-primary/10 flex w-full flex-col items-center justify-center gap-0 border-t pt-6 md:flex-row md:items-center md:justify-between md:gap-4">
                    {/* Center: Links */}
                    <div className="text-foreground-tertiary text-small mb-4 flex w-full justify-center gap-8 md:mb-0 md:w-auto">
                        <a
                            href="/terms-of-service"
                            className="hover:underline"
                            title="Read our Terms of Service"
                        >
                            Terms of Service
                        </a>
                        <a
                            href="/privacy-policy"
                            className="hover:underline"
                            title="Read our Privacy Policy"
                        >
                            Privacy Policy
                        </a>
                        <a href="/sitemap.xml" className="hover:underline" title="View the sitemap">
                            Sitemap
                        </a>
                    </div>
                    {/* Right: Copyright */}
                    <div className="text-foreground-tertiary text-small flex w-full justify-center md:w-auto md:justify-end">
                        © {new Date().getFullYear()} On Off, Inc.
                    </div>
                </div>
            </div>
            <div className="mx-auto flex max-w-5xl justify-center px-8 pt-24 pb-4">
                <Illustrations.OnlookLogoSeal className="text-foreground-primary/20 h-full w-full [mask-image:linear-gradient(to_bottom,black_0%,transparent_100%)]" />
            </div>
        </footer>
    );
}

import { ExternalRoutes, Routes } from '@/utils/constants';
import { Icons } from '@onlook/ui/icons';
import { useRouter } from 'next/navigation';
import { Illustrations } from './illustrations';

export function Footer() {
    const router = useRouter();

    return (
        <footer className="w-full text-foreground-primary border-t border-foreground-primary/10 mt-24 pb-24">
            <div className="max-w-6xl mx-auto px-8 pt-16 pb-24 flex flex-col md:flex-row md:items-start gap-24">
                {/* Left: Slogan */}
                <div
                    className="flex-1 flex flex-col gap-8 min-w-[250px] cursor-pointer"
                    onClick={() => router.push('/')}
                >
                    <Icons.OnlookTextLogo className="w-24 h-5 text-foreground-primary" />
                </div>
                {/* Center: Links */}
                <div className="flex-1 flex flex-col md:flex-row gap-12 md:gap-24 justify-center">
                    <div>
                        <h4 className="text-regularPlus mb-4 text-foreground-primary">Company</h4>
                        <ul className="flex flex-col gap-4 text-regular text-foreground-secondary">
                            {/* <li><a href={Routes.ABOUT} className="hover:underline">About</a></li> */}
                            <li><a href={ExternalRoutes.DOCS} target="_blank" className="hover:underline">Docs</a></li>
                            <li><a href={Routes.FAQ} className="hover:underline">FAQ</a></li>
                            <li><a href={ExternalRoutes.BLOG} target="_blank" className="hover:underline">Blog</a></li>
                            {/* <li><a href="#" className="hover:underline">Careers</a></li> */}
                            <li><a href="mailto:contact@onlook.com" className="hover:underline">Contact</a></li>
                        </ul>
                    </div>
                    <div className="min-w-[200px]">
                        <h4 className="text-regularPlus mb-4 text-foreground-primary">Product</h4>
                        <ul className="flex flex-col gap-4 text-regular text-foreground-secondary">
                            <li><a href={Routes.PROJECTS} className="hover:underline">My Projects</a></li>
                            <li><a href={ExternalRoutes.GITHUB} target="_blank" className="hover:underline">GitHub Repo</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-regularPlus mb-4 text-foreground-primary">Follow Us</h4>
                        <div className="flex gap-6 mt-2 items-center">
                            <a href={ExternalRoutes.X} target="_blank" rel="noopener noreferrer">
                                <Icons.SocialX className="w-6 h-6 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                            </a>
                            <a href={ExternalRoutes.LINKEDIN} target="_blank" rel="noopener noreferrer">
                                <Icons.SocialLinkedIn className="w-6 h-6 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                            </a>
                            <a href={ExternalRoutes.SUBSTACK} target="_blank" rel="noopener noreferrer">
                                <Icons.SocialSubstack className="w-6 h-6 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                            </a>
                            <a href={ExternalRoutes.YOUTUBE} target="_blank" rel="noopener noreferrer">
                                <Icons.SocialYoutube className="w-6 h-6 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                            </a>
                            <a href={ExternalRoutes.GITHUB} target="_blank" rel="noopener noreferrer">
                                <Icons.GitHubLogo className="w-5.5 h-5.5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                            </a>
                            <a href={ExternalRoutes.DISCORD} target="_blank" rel="noopener noreferrer">
                                <Icons.DiscordLogo className="w-6 h-6 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            {/* Bottom Bar */}
            <div className="max-w-6xl mx-auto px-8 pb-4 pt-24">
                <div className="flex flex-col md:flex-row items-center md:items-center justify-center md:justify-between w-full gap-0 md:gap-4 border-t border-foreground-primary/10 pt-6">
                    {/* Center: Links */}
                    <div className="flex gap-8 text-foreground-tertiary text-small justify-center w-full md:w-auto mb-4 md:mb-0">
                        <a href="/terms-of-service" className="hover:underline">Terms of Service</a>
                        <a href="/privacy-policy" className="hover:underline">Privacy Policy</a>
                        <a href="/sitemap.xml" className="hover:underline">Sitemap</a>
                    </div>
                    {/* Right: Copyright */}
                    <div className="text-foreground-tertiary text-small w-full md:w-auto flex justify-center md:justify-end">© {new Date().getFullYear()} On Off, Inc.</div>
                </div>
            </div>
            <div className="max-w-5xl mx-auto px-8 pb-4 pt-24 flex justify-center">
                <Illustrations.OnlookLogoSeal className="w-full h-full [mask-image:linear-gradient(to_bottom,black_0%,transparent_100%)] text-foreground-primary/20" />
            </div>
        </footer>
    );
} 
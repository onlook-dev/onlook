import { Icons } from '@onlook/ui/icons/index';
import { useRouter } from 'next/navigation';

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
                            {/* <li><a href="#" className="hover:underline">About</a></li> */}
                            <li><a href="https://docs.onlook.com" target="_blank" className="hover:underline">Docs</a></li>
                            {/* <li><a href="/faq" className="hover:underline">FAQ</a></li> */}
                            <li><a href="https://onlook.substack.com" target="_blank" className="hover:underline">Blog</a></li>
                            {/* <li><a href="#" className="hover:underline">Careers</a></li> */}
                            <li><a href="mailto:contact@onlook.com" className="hover:underline">Contact</a></li>
                        </ul>
                    </div>
                    <div className="min-w-[200px]">
                        <h4 className="text-regularPlus mb-4 text-foreground-primary">Product</h4>
                        <ul className="flex flex-col gap-4 text-regular text-foreground-secondary">
                            <li><a href="/projects" className="hover:underline">My Projects</a></li>
                            <li><a href="https://github.com/onlook-dev/onlook" target="_blank" className="hover:underline">GitHub Repo</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-regularPlus mb-4 text-foreground-primary">Follow Us</h4>
                        <div className="flex gap-6 mt-2">
                            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                                <Icons.GitHubLogo className="w-6 h-6 text-white hover:text-white/70 transition-colors" />
                            </a>
                            <a href="https://discord.com" target="_blank" rel="noopener noreferrer">
                                <Icons.DiscordLogo className="w-6 h-6 text-white hover:text-white/70 transition-colors" />
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
        </footer>
    );
} 
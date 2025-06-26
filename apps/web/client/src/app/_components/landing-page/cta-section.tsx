import { Button } from '@onlook/ui/button';

interface CTASectionProps {
    href?: string;
    onClick?: () => void;
}

export function CTASection({ href, onClick }: CTASectionProps = {}) {
    const handleGetStartedClick = () => {
        if (onClick) {
            onClick();
        } else if (href) {
            // Navigate to the specified href
            window.location.href = href;
        } else {
            // Default behavior: scroll to hero section on homepage
            const heroSection = document.getElementById('hero');
            if (heroSection) {
                heroSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    };

    const handleHomepageNavigation = () => {
        // Navigate to homepage with hash to trigger scroll to hero
        window.location.href = '/';
    };

    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8 flex flex-col md:flex-row items-right gap-24 md:gap-12">
            <div className="flex-1 flex flex-col items-end justify-center mx-auto text-right">
                <h1 className="text-foreground-primary text-6xl leading-[1.05] font-light mb-8 max-w-4xl">
                    Craft a website<br className="hidden md:block" /> for free today
                </h1>
                <div className="flex flex-col sm:flex-row items-center justify-right gap-0">
                    <Button 
                        variant="secondary" 
                        size="lg" 
                        className="p-6 cursor-pointer hover:bg-foreground-primary hover:text-background-primary transition-colors"
                        onClick={href === '/' ? handleHomepageNavigation : handleGetStartedClick}
                    >
                        Get Started
                    </Button>
                    <span className="text-foreground-tertiary text-regular text-left ml-0 sm:ml-6 mt-2 sm:mt-0">
                        No credit card required.<br /> Cancel anytime.
                    </span>
                </div>
            </div>
        </div>
    );
} 
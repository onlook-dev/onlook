import { Icons } from '@onlook/ui/icons';
import { ButtonLink } from '../button-link';

export function FeaturesSection() {
    return (
        <>
            <div className="w-full max-w-6xl mx-auto py-32 px-8 flex flex-col items-start">
                <h2 className="text-foreground-primary text-[6vw] leading-[1.1] font-light mb-12 max-w-5xl">
                    See what you can<br />
                    craft in Onlook
                </h2>
                <ButtonLink href="#" rightIcon={<Icons.ArrowRight className="w-5 h-5" />}>Browse more</ButtonLink>
            </div>

            {/* New Features Section */}
            <div className="w-full max-w-6xl mx-auto py-20 px-8 flex flex-col md:flex-row items-start md:items-stretch gap-12 md:gap-0">
                <div className="flex-1 mb-12 md:mb-0 md:mr-8">
                    <h3 className="text-foreground-primary text-lg mb-4">Real Code</h3>
                    <p className="text-foreground-secondary text-regular text-balance">This is where more information<br />would go</p>
                </div>
                <div className="flex-1 mb-12 md:mb-0 md:mr-8">
                    <h3 className="text-foreground-primary text-lg mb-4">AI powered</h3>
                    <p className="text-foreground-secondary text-regular text-balance">Even more control and power with<br />the interface</p>
                </div>
                <div className="flex-1">
                    <h3 className="text-foreground-primary text-lg mb-4">Publish in a click</h3>
                    <p className="text-foreground-secondary text-regular text-balance">Share a link with colleagues or<br />attach a domain in seconds</p>
                </div>
            </div>
        </>
    );
} 
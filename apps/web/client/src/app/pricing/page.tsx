'use client';

import { Button } from '@onlook/ui/button';
import { Icons, type IconProps } from '@onlook/ui/icons';
import { AuthModal } from '../_components/auth-modal';
import { CTASection } from '../_components/landing-page/cta-section';
import { WebsiteLayout } from '../_components/website-layout';
import { FAQSection } from '../_components/landing-page/faq-section';
import { ExternalRoutes } from '@/utils/constants';
import Link from 'next/link';

const HIGHLIGHTED_FEATURES = [
    {
        icon: 'FilePlus',
        title: 'Project Templates',
        description: 'Save and reuse your projects as templates across your team',
    },
    {
        icon: 'Branch',
        title: 'Branching & Version Control',
        description: 'Create and manage branches for your projects with full version history',
    },
    {
        icon: 'Component',
        title: 'Your Real Design system',
        description: 'Bring your real components in Onlook and use them in your projects',
    },
    {
        icon: 'Brand',
        title: 'Theming & Branding',
        description: 'Centralized design tokens, color palettes, and typography management',
    },
    {
        icon: 'Layers',
        title: 'Built like a design tool',
        description: 'Navigate your React component tree with precise control over every element',
    },
    {
        icon: 'Sparkles',
        title: 'Unlimited AI Chat',
        description: 'Get instant help and generate code with unlimited AI-powered assistance',
    },
    {
        icon: 'GitHubLogo',
        title: 'Open Source',
        description: 'Built with the community. Customize and extend for your team\'s needs',
    },
    {
        icon: 'Globe',
        title: 'Custom Domains',
        description: 'Deploy your projects to your own internal domain',
    },
    {
        icon: 'LockClosed',
        title: 'Advanced Security',
        description: 'SSO (SAML/OAuth), advanced security controls, audit logs, and admin controls',
    },
];

const ENTERPRISE_FEATURES = [
    'Unlimited projects',
    'Custom integrations',
    'Advanced usage analytics',
    'Early access to new features',
    'Dedicated support',
    'Account manager',
    'Dedicated Slack channel',
    'Technical onboarding',
];

export default function PricingPage() {
    const handleContactUs = () => {
        const subject = encodeURIComponent('[Team Inquiry]: Getting Started with Onlook');
        const body = encodeURIComponent(`Hi Daniel,

I'm interested in setting up Onlook for our team.

Looking forward to hearing from you.

Best regards,
[Your name]`);

        window.location.href = `mailto:daniel@onlook.com?subject=${subject}&body=${body}`;
    };

    return (
        <WebsiteLayout showFooter={true}>
            <div className="w-full max-w-6xl mx-auto flex flex-col items-center px-8">
                <div className="text-left mb-12 mt-24 w-full">
                    <h1 className="text-foreground text-5xl font-light mb-4">Pricing</h1>
                    <p className="text-muted-foreground text-regular">Equip your product team with the power of AI</p>
                </div>

                {/* Enterprise Section */}
                <div className="w-full max-w-6xl mx-auto">
                    <div className="border border-border-primary rounded-lg p-8 sm:p-12">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                            <div className="text-left">
                                <h2 className="text-3xl sm:text-4xl font-light text-foreground mb-3">For Teams</h2>
                                <p className="text-regular text-foreground-secondary">Custom pricing tailored to your team's needs</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 lg:flex-shrink-0 w-full sm:w-auto">
                                <Button
                                    className="w-full sm:w-auto sm:min-w-[180px]"
                                    onClick={handleContactUs}
                                    variant="outline"
                                    size="lg"
                                >
                                    Contact us
                                </Button>
                                <Button
                                    className="w-full sm:w-auto sm:min-w-[180px]"
                                    size="lg"
                                    asChild
                                >
                                    <a href={ExternalRoutes.BOOK_DEMO} target="_blank" rel="noopener noreferrer">
                                        Book a demo
                                    </a>
                                </Button>
                            </div>
                        </div>

                        <div className="border-t border-border-primary my-8" />

                        {/* Highlighted Features */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-8">
                            {HIGHLIGHTED_FEATURES.map((feature) => {
                                const IconComponent = Icons[feature.icon as keyof typeof Icons] as React.FC<IconProps>;
                                return (
                                    <div
                                        key={feature.title}
                                        className="flex items-start gap-4 p-0 rounded-lg"
                                    >
                                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-foreground-onlook/10 flex items-center justify-center">
                                            <IconComponent className="w-5 h-5 text-foreground-onlook" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-base font-medium text-foreground">
                                                {feature.title}
                                            </h3>
                                            <p className="text-sm text-foreground-secondary text-balance">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="border-t border-border-primary my-8" />

                        {/* Standard Features */}
                        <h3 className="text-title3 font-light text-foreground mb-4">And more...</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
                            {ENTERPRISE_FEATURES.map((feature) => (
                                <div
                                    key={feature}
                                    className="flex items-center gap-3 text-base text-foreground-secondary"
                                >
                                    <Icons.CheckCircled className="w-5 h-5 text-foreground-onlook flex-shrink-0" />
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-border-primary my-8" />
                        <p className="text-small text-muted-foreground/50 max-w-2xl text-balance">
                            Existing paid plan users can continue using Onlook. New users – Please contact us or book a demo to get your team set up. If you're looking to self-host Onlook, please check out the <Link href="https://github.com/onlook-dev/onlook" target="_blank" className="underline">GitHub repository</Link> or reach out to us to schedule a call.
                        </p>
                    </div>
                </div>
            </div>
            <div className="w-full mx-auto flex flex-col items-center mt-16 sm:mt-20 lg:mt-28">
                <FAQSection />
            </div>
            <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
                <div className="mt-16 w-full">
                    <CTASection href={ExternalRoutes.BOOK_DEMO} />
                </div>
            </div>
            <AuthModal />
        </WebsiteLayout>
    );
}

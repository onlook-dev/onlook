import { Icons } from '@onlook/ui/icons';
import { WebsiteLayout } from '@/app/_components/website-layout';
import { CTASection } from '../_components/landing-page/cta-section';

export default function AboutPage() {
    return (
        <WebsiteLayout showFooter={true}>
            <main className="bg-background-primary text-foreground-primary">
                {/* Hero Section */}
                <section className="py-32">
                    <div className="max-w-6xl mx-auto px-8 text-center">
                        <h1 className="text-title1 tracking-tight mb-4">
                            Turning every product team into an engineering team
                        </h1>
                        <p className="text-regular text-foreground-secondary max-w-3xl mx-auto">
                            Onlook is equipping the next generation of builders with the ultimate tool for collaborating in code
                        </p>
                    </div>
                </section>

                {/* Team Section */}
                <section className="pb-24">
                    <div className="max-w-4xl mx-auto px-8">
                        <div className="text-left">
                            <h2 className="text-small uppercase text-foreground-secondary tracking-widest mb-4">
                                Team
                            </h2>
                            <h3 className="text-title1 tracking-tight mb-6 max-w-2xl mx-auto text-balance">
                                Design & Development duo hell-bent on a better way of building
                            </h3>
                            <p className="text-regular text-foreground-secondary mb-16 max-w-3xl mx-auto text-balance">
                                Frustrated with the status quo of creating software, Daniel and Kiet teamed up to give engineers, builders, designers, product managers, and marketers a new way to collaborate in code.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-16">
                            {/* Founder 1 */}
                            <div className="flex gap-6">
                                <div className="w-24 h-24 bg-neutral-800 rounded-2xl flex-shrink-0"></div>
                                <div className="flex flex-col">
                                    <h4 className="text-regularPlus">Daniel Farrell</h4>
                                    <p className="text-foreground-secondary mb-3 text-regular">Design & Growth</p>
                                    <div className="flex gap-3">
                                        <a href="https://twitter.com/danielofarel" target="_blank" rel="noopener noreferrer">
                                            <div className="w-5 h-5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                        </a>
                                        <a href="https://linkedin.com/in/daniel-farrell-159a49a9" target="_blank" rel="noopener noreferrer">
                                            <div className="w-5 h-5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Founder 2 */}
                            <div className="flex gap-6">
                                <div className="w-24 h-24 bg-neutral-800 rounded-2xl flex-shrink-0"></div>
                                <div className="flex flex-col">
                                    <h4 className="text-regularPlus">Kiet Ho</h4>
                                    <p className="text-foreground-secondary mb-3 text-regular">Engineering</p>
                                    <div className="flex gap-3">
                                         <a href="https://twitter.com/kietho_" target="_blank" rel="noopener noreferrer">
                                            <div className="w-5 h-5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                        </a>
                                        <a href="https://www.linkedin.com/in/kiet-ho/" target="_blank" rel="noopener noreferrer">
                                            <div className="w-5 h-5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* Divider */}
                <div className="max-w-6xl mx-auto px-8">
                    <hr className="border-foreground-primary/10" />
                </div>

                {/* Careers Section */}
                <section className="py-24">
                    <div className="max-w-6xl mx-auto px-8 text-center">
                        <p className="text-regular text-foreground-secondary mb-8 max-w-3xl mx-auto">
                            Are you passionate about design? Love to hack on side-projects? Or just want to make the web a little more interesting? We're always looking for talented people to join us.
                        </p>
                        <div className="inline-block border border-foreground-primary/10 rounded-lg px-8 py-6 text-left">
                            <h4 className="text-regularPlus">General Interest Application</h4>
                            <p className="text-foreground-secondary text-regular">NYC • FULL TIME</p>
                        </div>
                        <div className="mt-8">
                            <a href="mailto:contact@onlook.com" className="hover:underline text-foreground-secondary">
                                Browse all jobs
                            </a>
                        </div>
                    </div>
                </section>
            </main>
            <CTASection href="/" />
        </WebsiteLayout>
    );
} 
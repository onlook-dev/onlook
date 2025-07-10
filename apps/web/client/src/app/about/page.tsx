"use client";
import { Icons } from '@onlook/ui/icons';
import { WebsiteLayout } from '@/app/_components/website-layout';
import { CTASection } from '../_components/landing-page/cta-section';
import { vujahdayScript } from '../fonts';
import { ButtonLink } from '../_components/button-link';
import { useGitHubStats } from '../_components/top-bar/github';
import { useParallaxCursor } from '../../hooks/use-parallax-cursor';

export default function AboutPage() {
    const { raw: starCount, contributors } = useGitHubStats();
    const parallax = useParallaxCursor({ intensity: 0.15, smoothness: 0.08 });
    return (
        <WebsiteLayout showFooter={true}>
            <main className="bg-background text-foreground-primary">
                {/* Hero Section */}
                <section className="py-64 bg-black text-white">
                    <div className="max-w-6xl mx-auto px-8">
                        <h1 className="text-6xl font-light leading-tight mb-24 text-left">
                            Design deserves<br />the best tools
                        </h1>
                        <div className="flex gap-32 flex-col md:flex-row md:items-start md:justify-between">
                            <div className="md:w-1/2 text-left">
                                <p className="text-large text-foreground-secondary max-w-lg text-left font-light text-balance">
                                    Onlook was founded to obliterate the divide between creativity and implementation.<br /><br />
                                    We’re building a global movement, led by a passionate and highly technical team based in San Francisco called “The Odyssey.”<br /><br />
                                    If you’re deeply opinionated about design, developer tools, AI, or are looking to be a part of an entirely new kind of organization, apply to join The Odyssey below.
                                </p>
                            </div>
                            <div className="md:w-1/2 flex flex-col md:block mt-12 md:mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-y-12 gap-x-16 w-full">
                                    {/* Stat 1 */}
                                    <div className="row-start-1 col-start-1">
                                        <div className="text-4xl font-light mb-2">{starCount !== null ? starCount.toLocaleString() : ''}</div>
                                        <div className="text-regularPlus text-foreground-tertiary/80">Stars on GitHub</div>
                                    </div>
                                    {/* Stat 2 */}
                                    <div className="row-start-1 col-start-2">
                                        <div className="text-4xl font-light mb-2">{contributors !== null ? contributors.toLocaleString() : ''}</div>
                                        <div className="text-regularPlus text-foreground-tertiary/80">Open-Source<br />Contributors</div>
                                    </div>
                                    {/* Stat 3 */}
                                    <div className="row-start-2 col-start-1">
                                        <div className="text-4xl font-light mb-2">2</div>
                                        <div className="text-regularPlus text-foreground-tertiary/80">Team members</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

            
                {/* Meet the Founders Section */}
                <section className="py-48">
                    <div className="max-w-6xl mx-auto px-8">
                        <div className="text-left mb-24">
                            <h2 className="text-7xl font-light leading-tight mb-12 text-left">
                                Meet the <span className={vujahdayScript.className + ' text-8xl ml-1 font-normal'}>founders</span>
                            </h2>
                            <p className="text-regular text-foreground-secondary max-w-xl mt-8 mb-12 text-balance">
                                Frustrated with the status quo of creating software, Daniel and Kiet teamed up to give engineers, builders, designers, and product managers a new way to collaborate in code.
                            </p>
                            <div className="flex justify-start mt-8">
                                <ButtonLink href="https://onlook.substack.com" rightIcon={<Icons.ArrowRight className="w-5 h-5" />}>
                                    Read more on Substack
                                </ButtonLink>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                            {/* Founder 1 */}
                            <div className="flex gap-8 items-start rounded-2xl">
                                <img src="/assets/about-daniel.png" alt="Daniel Farrell" className="w-28 h-28 rounded-2xl object-cover bg-neutral-800 flex-shrink-0" />
                                <div className="flex flex-col">
                                    <h4 className="text-largePlus mb-1">Daniel Farrell</h4>
                                    <p className="text-foreground-secondary mb-4 text-regular">Design & Growth</p>
                                    <p className="text-foreground-secondary text-sm font-light mb-4 max-w-xs">Designer for over a decade, First 100 employee at Bird, former Head of Growth.</p>
                                    <div className="flex gap-3 items-center">
                                        <a href="https://github.com/drfarrell" target="_blank" rel="noopener noreferrer" aria-label="Daniel's GitHub">
                                            <Icons.GitHubLogo className="w-4.5 h-4.5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                        </a>
                                        <a href="https://www.linkedin.com/in/danielrfarrell/" target="_blank" rel="noopener noreferrer" aria-label="Daniel's LinkedIn">
                                            <Icons.SocialLinkedIn className="w-5 h-5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                        </a>
                                        <a href="https://x.com/D_R_Farrell" target="_blank" rel="noopener noreferrer" aria-label="Daniel's GitHub">
                                            <Icons.SocialX className="w-5 h-5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                            {/* Founder 2 */}
                            <div className="flex gap-8 items-start rounded-2xl">
                                <img src="/assets/about-kiet.png" alt="Kiet Ho" className="w-28 h-28 rounded-2xl object-cover bg-neutral-800 flex-shrink-0" />
                                <div className="flex flex-col">
                                    <h4 className="text-largePlus mb-1">Kiet Ho</h4>
                                    <p className="text-foreground-secondary mb-4 text-regular">Engineering</p>
                                    <p className="text-foreground-secondary text-sm font-light mb-4 max-w-xs">Ex-Amazon, maintained the design system at ServiceNow, jiu-jitsu fighter.</p>
                                    <div className="flex gap-3 items-center">
                                        <a href="https://github.com/Kitenite" target="_blank" rel="noopener noreferrer" aria-label="Kiet's GitHub">
                                            <Icons.GitHubLogo className="w-4.5 h-4.5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                        </a>
                                        <a href="https://www.linkedin.com/in/kiet-ho/" target="_blank" rel="noopener noreferrer" aria-label="Kiet's LinkedIn">
                                            <Icons.SocialLinkedIn className="w-5 h-5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                        </a>
                                        <a href="https://x.com/flyakiet" target="_blank" rel="noopener noreferrer" aria-label="Kiet's X">
                                            <Icons.SocialX className="w-5 h-5 text-foreground-secondary hover:text-foreground-primary transition-colors" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="text-left mt-24">
                            
                        </div>
                    </div>
                </section>

                {/* Creative Headquarters Section */}
                <section className="relative w-full min-h-[80vh] bg-black flex flex-col items-center justify-center py-80 overflow-x-clip">
                    <div className="w-full mx-auto flex flex-col gap-36">
                        {/* Row 1: Welcome + right square */}
                        <div className="flex max-w-5xl mx-auto flex-row items-center justify-between w-full relative">
                            <div className="pl-2 md:pl-0">
                                <h2 className="text-white text-5xl md:text-6xl font-light leading-tight mb-0">
                                    Welcome to<br />headquarters
                                </h2>
                            </div>
                            <img 
                                src="/assets/about-office-1.png" 
                                alt="Office space" 
                                className="w-[400px] h-[400px] object-cover mr-2 md:mr-0 transition-transform duration-300 ease-out" 
                                style={{
                                    transform: `translate(${parallax.x * 60}px, ${parallax.y * 45}px)`
                                }}
                            />
                        </div>
                        {/* Row 2: Three elements, offset right */}
                        <div className="flex flex-row items-center justify-center gap-50 w-full relative max-w-8xl">
                            <img 
                                src="/assets/about-office-2.png" 
                                alt="Office space" 
                                className="w-[400px] h-[400px] object-cover relative bottom-[60px] ml-12 transition-transform duration-300 ease-out" 
                                style={{
                                    transform: `translate(${parallax.x * -50}px, ${parallax.y * 80}px)`
                                }}
                            />
                            <div className="flex flex-col items-start justify-center text-white text-regular text-left min-w-[400px] px-8 relative left-24">
                                <span className="mb-8 text-foreground-secondary">Earn your stake<br />in the future of<br />creative work</span>
                                <ButtonLink  href="mailto:contact@onlook.com" rightIcon={<Icons.ArrowRight className="w-5 h-5" />}>
                                    Claim your desk
                                </ButtonLink>
                            </div>
                            <img 
                                src="/assets/about-office-3.png" 
                                alt="Office space" 
                                className="w-[400px] h-[400px] object-cover transition-transform duration-300 ease-out" 
                                style={{
                                    transform: `translate(${parallax.x * 55}px, ${parallax.y * -40}px)`
                                }}
                            />
                        </div>
                        {/* Row 3: Two left-offset squares */}
                        <div className="flex flex-row items-center justify-center gap-60 pt-12">
                            <img 
                                src="/assets/about-office-4.png" 
                                alt="Office space" 
                                className="w-[400px] h-[400px] object-cover relative -ml-60 top-24 transition-transform duration-300 ease-out" 
                                style={{
                                    transform: `translate(${parallax.x * -70}px, ${parallax.y * 60}px)`
                                }}
                            />
                            <img 
                                src="/assets/about-office-5.png" 
                                alt="Office space" 
                                className="w-[400px] h-[400px] object-cover relative left-60 transition-transform duration-300 ease-out" 
                                style={{
                                    transform: `translate(${parallax.x * 65}px, ${parallax.y * -65}px)`
                                }}
                            />
                        </div>
                    </div>
                </section>


                {/* Values Section */}
                <section className="py-60 bg-black text-white">
                    <div className="max-w-6xl mx-auto px-8">
                        <h2 className="text-7xl font-light leading-tight mb-20 text-left">
                            What we <span className={vujahdayScript.className + ' text-8xl ml-1 font-normal'}>reward</span>
                        </h2>
                        <div className="grid grid-cols-4 gap-y-16 gap-x-24 mb-16">
                            {/* Speed */}
                            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                <div className="w-20 h-20 bg-background-onlook mb-8" />
                                <h3 className="text-xl font-normal mb-2">Speed</h3>
                                <p className="text-foreground-secondary text-regular font-light text-balance">Setting an olympic pace, relentlessness, strategy through execution.</p>
                            </div>
                            {/* Resilience */}
                            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                <div className="w-20 h-20 bg-background-onlook mb-8" />
                                <h3 className="text-xl font-normal mb-2">Resilience</h3>
                                <p className="text-foreground-secondary text-regular font-light text-balance">Enduring challenges without losing momentum – grit, stamina, and drive.</p>
                            </div>
                            {/* Reinvention */}
                            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                <div className="w-20 h-20 bg-background-onlook mb-8" />
                                <h3 className="text-xl font-normal mb-2">Reinvention</h3>
                                <p className="text-foreground-secondary text-regular font-light text-balance">Creativity in approaching problems, pushing us beyond the state-of-the-art.</p>
                            </div>
                            {/* Competence */}
                            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                <div className="w-20 h-20 bg-background-onlook mb-8" />
                                <h3 className="text-xl font-normal mb-2">Competence</h3>
                                <p className="text-foreground-secondary text-regular font-light text-balance">Taking pride in one’s work, inspiring others with your taste and technique.</p>
                            </div>
                        </div>
                        <div className="flex justify-start">
                            <ButtonLink href="mailto:contact@onlook.com" rightIcon={<Icons.ArrowRight className="w-5 h-5" />}>
                                Browse open roles
                            </ButtonLink>
                        </div>
                    </div>
                </section>

                {/* What we look for Section */}
                <section className="py-56 bg-black text-white">
                    <div className="max-w-6xl mx-auto px-8">
                        <h2 className="text-7xl font-light leading-tight mb-20 text-left">
                            What we <span className={vujahdayScript.className + ' text-8xl ml-1 font-normal'}>look for</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-16 gap-x-24">
                            {/* Commitment */}
                            <div className="flex flex-col items-start text-left">
                                <h3 className="text-title3 font-normal mb-4">Commitment</h3>
                                <p className="text-foreground-secondary text-regular font-light text-balance">Have you put real time into something you cared about? We’re looking for builders who’ve made a long-term bets on themselves.</p>
                            </div>
                            {/* Passion */}
                            <div className="flex flex-col items-start text-left">
                                <h3 className="text-title3 font-normal mb-4">Passion</h3>
                                <p className="text-foreground-secondary text-regular font-light text-balance">We’re allergic to apathy. We want people who give a damn about design, devtools, or AI – and have receipts.</p>
                            </div>
                            {/* Excellence */}
                            <div className="flex flex-col items-start text-left">
                                <h3 className="text-title3 font-normal mb-4">Excellence</h3>
                                <p className="text-foreground-secondary text-regular font-light text-balance">Bring something rare. We want people who are world-class at something and won't compromise.</p>
                            </div>
                        </div>
                    </div>
                </section>


                {/* Our Process Section */}
                <section className="py-56 bg-black text-white">
                    <div className="max-w-6xl mx-auto px-8 flex flex-col md:flex-row justify-between gap-32">
                        {/* Left: Title and CTA */}
                        <div className="flex flex-col items-start justify-start mb-16 md:mb-0">
                            <h2 className="text-7xl font-light leading-tight mb-12 text-left">Join the Odyssey</h2>
                            <ButtonLink href="mailto:contact@onlook.com" rightIcon={<span className="ml-2">→</span>}>
                                Take a leap of faith in yourself
                            </ButtonLink>
                        </div>
                        {/* Right: Timeline */}
                        <div className="relative max-w-[500px]">
                            {/* Timeline vertical line (left-aligned) */}
                            <div className="absolute left-0 top-2 bottom-14 w-px bg-foreground-primary/20 z-0" />
                            {/* Vertical shimmer overlay */}
                            <div className="absolute left-0 top-2 bottom-14 w-px bg-gradient-to-b from-transparent via-white/60 to-transparent bg-[length:100%_200%] animate-shimmer-vertical z-10" />
                            <div className="relative z-10 flex flex-col gap-0">
                                {/* Step 1: Apply directly */}
                                <div className="flex flex-row items-start mb-16 relative">
                                    <div className="w-3 h-3 bg-foreground-tertiary absolute left-0 top-2 transform -translate-x-1/2" />
                                    <div className="ml-12">
                                        <div className="mb-1 text-lg">Apply directly</div>
                                        <div className="text-foreground-secondary text-regular text-balance">Send in your application and a link to a project you've made. For extra clout, tackle an issue on GitHub and add it in your application</div>
                                    </div>
                                </div>
                                {/* Step 2: Screening call */}
                                <div className="flex flex-row items-start mb-16 relative">
                                    <div className="w-3 h-3 bg-foreground-tertiary absolute left-0 top-2 transform -translate-x-1/2" />
                                    <div className="ml-12">
                                        <div className="mb-1 text-lg">Screening call with each of the Founders</div>
                                        <div className="text-foreground-secondary text-regular text-balance">Walk us through your experience, share your learnings, and help us understand who you are.</div>
                                    </div>
                                </div>
                                {/* Step 3: Technical interview */}
                                <div className="flex flex-row items-start mb-16 relative">
                                    <div className="w-3 h-3 bg-foreground-tertiary absolute left-0 top-2 transform -translate-x-1/2" />
                                    <div className="ml-12">
                                        <div className="mb-1 text-lg">Technical interview</div>
                                        <div className="text-foreground-secondary text-regular text-balance">We’ll ask about the projects you’ve built and do a deep-dive into the implementation and decisions you’ve made.</div>
                                    </div>
                                </div>
                                {/* Step 4: Two reference calls */}
                                <div className="flex flex-row items-start mb-16 relative">
                                    <div className="w-3 h-3 bg-foreground-tertiary absolute left-0 top-2 transform -translate-x-1/2" />
                                    <div className="ml-12">
                                        <div className="mb-1 text-lg">Two reference calls</div>
                                        <div className="text-foreground-secondary text-regular text-balance">Connect us with trusted managers or colleagues who can vouch for your work.</div>
                                    </div>
                                </div>
                                {/* Step 5: Paid work trial */}
                                <div className="flex flex-row items-start mb-16 relative">
                                    <div className="w-3 h-3 bg-foreground-tertiary absolute left-0 top-2 transform -translate-x-1/2" />
                                    <div className="ml-12">
                                        <div className="mb-1 text-lg">Paid work trial</div>
                                        <div className="text-foreground-secondary text-regular text-balance">Collaborate with us on a problem and get a feel for what it’s like to work with the team at Onlook.</div>
                                    </div>
                                </div>
                                {/* Step 6: Offer */}
                                <div className="flex flex-row items-start relative">
                                    <div className="w-3 h-3 bg-foreground-tertiary absolute left-0 top-2 transform -translate-x-1/2" />
                                    <div className="ml-12">
                                        <div className="mb-1 text-lg">Offer</div>
                                        <div className="text-foreground-secondary text-regular text-balance">You’re brought in as an expert and we trust you’ll make the right calls.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <CTASection href="/" />
        </WebsiteLayout>
    );
} 
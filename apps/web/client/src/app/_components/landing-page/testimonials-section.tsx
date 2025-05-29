import { TestimonialCard } from './TestimonialCard';

export function TestimonialsSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-48 px-8">
            <h2 className="text-foreground-primary text-[4vw] leading-[1.1] font-light mb-16 max-w-4xl text-left text-balance">
                Thousands of builders <br />love Onlook
            </h2>
            <div className="w-full flex flex-col md:flex-row gap-6 md:gap-8">
                {/* Column 1 */}
                <div className="flex flex-col gap-8 flex-1">
                    <TestimonialCard
                        text="What is this, something like Figma and v0 fused into a devilish combo? There's something called 'onlook' trending on GitHub, and it's so insanely cool it's scary."
                        name="Koder@海外Tech速報"
                        label=""
                        profileColor="#222"
                    />
                    <TestimonialCard
                        text="From an era where web designers were synonymous with Photoshop and XD, we've moved into the Figma era. And now, a new tool powered by AI has emerged! Its name is 'Onlook'. In summary, it seems you can publish your designs directly."
                        name="Ryutaro"
                        label="Studio Nika"
                        profileColor="#3b82f6"
                    />
                    <TestimonialCard
                        text="Your products have helped me a lot. Thank you from the bottom of my heart."
                        name="Utsumura Fuki"
                        label=""
                        profileColor="#6366f1"
                    />
                </div>
                {/* Column 2 */}
                <div className="flex flex-col gap-8 flex-1 mt-12 md:mt-0">
                    <TestimonialCard
                        text="lookin' rad!"
                        name="Adam Argyle"
                        label="Chrome CSS Developer Advocate at Google"
                        profileColor="#f59e42"
                    />
                    <TestimonialCard
                        text="Promising new tool for designers – gives you a Figma-like front end to visually edit your React app."
                        name="Aaron Epstein"
                        label="Cofounder of Creative Market"
                        profileColor="#6366f1"
                    />
                    <TestimonialCard
                        text="Onlook is great...! I want to use this for all web production from now on..."
                        name="Harukana"
                        label="Designer at MeIn Inc."
                        profileColor="#fbbf24"
                    />
                </div>
                {/* Column 3 */}
                <div className="flex flex-col gap-8 flex-1 mt-24 md:mt-0">
                    <TestimonialCard
                        text="this is getting pretty ergonomically close to the synthesis of generative code & design\ngreat product @onlookdev 🐣"
                        name="Tina He"
                        label="Product Lead, Developer Tools at Coinbase"
                        profileColor="#f472b6"
                    />
                    <TestimonialCard
                        text="V nice!"
                        name="John Maeda"
                        label="Head of Computational Design / AI Platform at Microsoft"
                        profileColor="#38bdf8"
                    />
                    <TestimonialCard
                        text="While playing with it, I once again thought, 'The boundary between design and development is melting away.'"
                        name="Kawai Design"
                        label=""
                        profileColor="#fff"
                    />
                </div>
            </div>
        </div>
    );
} 
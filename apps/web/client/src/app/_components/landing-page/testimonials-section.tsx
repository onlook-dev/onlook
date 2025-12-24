import React from 'react';

interface TestimonialCardProps {
  text: string;
  name: string;
  label: string;
  profileImage?: string; // Path to profile image
  profileColor?: string; // Fallback color for placeholder avatar
  href?: string; // Optional link URL
}

function TestimonialCard({ text, name, label, profileImage, profileColor = '#222', href }: TestimonialCardProps) {
  const cardContent = (
    <div className={`bg-background-onlook border border-foreground-secondary/10 rounded-xl p-6 flex flex-col justify-between min-h-[160px] duration-200 select-none ${href ? 'cursor-pointer hover:bg-background-onlook hover:border-foreground-secondary/20 transition-colors duration-50' : ''}`}>
      <div className="text-foreground-primary text-regular mb-6">{text}</div>
      <div className="flex items-center gap-3 mt-auto">
        {/* Profile picture */}
        <div className="w-10 h-10 min-w-10 min-h-10 rounded-full overflow-hidden flex items-center justify-center">
          {profileImage ? (
            <img
              src={profileImage}
              alt={`${name} profile`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full bg-white/10 flex items-center justify-center"
              style={{ background: profileColor }}
            >
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-foreground-secondary text-small">{name}</span>
          <span className="text-muted-foreground/50 text-mini">{label}</span>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {cardContent}
      </a>
    );
  }

  return cardContent;
}

export function TestimonialsSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-48 px-8">
            <h2 className="text-foreground-primary text-6xl leading-[1.1] font-light mb-16 max-w-4xl text-left text-balance">
                Tens of thousands of <br />builders love Onlook
            </h2>
            <div className="w-full flex flex-col md:flex-row gap-6 md:gap-8">
                {/* Column 1 */}
                <div className="flex flex-col gap-8 flex-1">
                    <TestimonialCard
                        text="What is this, something like Figma and v0 fused into a devilish combo? There's something called 'onlook' trending on GitHub, and it's so insanely cool it's scary."
                        name="Koder@海外Tech速報"
                        label=""
                        profileImage="/assets/testimonials-koder.png"
                        href="https://x.com/koder_dev/status/1884179672847847522" 
                    />
                    <TestimonialCard
                        text="From an era where web designers were synonymous with Photoshop and XD, we've moved into the Figma era. And now, a new tool powered by AI has emerged! Its name is 'Onlook'. In summary, it seems you can publish your designs directly."
                        name="Ryutaro"
                        label="Studio Nika"
                        profileImage="/assets/testimonials-ryutaro.png"
                        href="https://x.com/ryutar02ka/status/1884542011706912900" 
                    />
                </div>
                {/* Column 2 */}
                <div className="flex flex-col gap-8 flex-1 mt-0 md:mt-12">
                    <TestimonialCard
                        text="lookin' rad!"
                        name="Adam Argyle"
                        label="Chrome CSS Developer Advocate at Google"
                        profileImage="/assets/testimonials-adam.png"
                    />
                    <TestimonialCard
                        text="Promising new tool for designers – gives you a Figma-like front end to visually edit your React app."
                        name="Aaron Epstein"
                        label="Cofounder of Creative Market"
                        profileImage="/assets/testimonials-aaron.png"
                        href="https://x.com/aaron_epstein/status/1851299967752945967" 
                    />
                    <TestimonialCard
                        text="Your products have helped me a lot. Thank you from the bottom of my heart."
                        name="Utsumura Fuki"
                        label=""
                        profileImage="/assets/testimonials-utsumaru.png"
                        href="https://x.com/w5927a1/status/1887822962776326602" 
                    />
                </div>
                {/* Column 3 */}
                <div className="flex flex-col gap-8 flex-1 mt-0 md:mt-24">
                    <TestimonialCard
                        text="this is getting pretty ergonomically close to the synthesis of generative code & design. great product @onlookdev 🐣"
                        name="Tina He"
                        label="Product Lead, Developer Tools at Coinbase"
                        profileImage="/assets/testimonials-tina.png"
                        href="https://x.com/fkpxls/status/1887319067884716109" 
                    />
                    <TestimonialCard
                        text="V nice!"
                        name="John Maeda"
                        label="Head of Computational Design / AI Platform at Microsoft"
                        profileImage="/assets/testimonials-john.png"
                        href="https://x.com/johnmaeda/status/1855091938828968112" 
                    />
                    <TestimonialCard
                        text="While playing with it, I once again thought, 'The boundary between design and development is melting away.'"
                        name="Kawai Design"
                        label=""
                        profileImage="/assets/testimonials-kawai.png"
                        href="https://x.com/kawai_design/status/1884908670343086376" 
                    />
                </div>
            </div>
        </div>
    );
} 
import { Icons } from '@onlook/ui/icons/index';
import { vujahdayScript } from '../../fonts';

export function ObsessForHoursSection() {
    return (
        <div className="w-full mx-auto py-32 px-8 flex bg-background-onlook/80 flex-col md:flex-row items-start gap-24 md:gap-12">
            <div className="w-full max-w-6xl mx-auto flex flex-col gap-12">
                {/* Responsive heading */}
                <div className="w-full flex flex-col items-center justify-center mb-12 md:flex-row md:gap-1">
                    {/* Desktop: all in a row, no stacking */}
                    <span className="text-foreground-primary text-5xl leading-[1.1] font-light">Build in</span>
                    <span className={`text-foreground-primary ${vujahdayScript.className} text-6xl leading-[1.1] font-light md:ml-3 md:mr-3 mt-2 md:mt-0`}>Seconds</span>
                    <span className="hidden md:inline-block text-foreground-primary text-5xl leading-[1.1] font-ultraLight mx-8">–</span>
                    <span className="text-foreground-primary text-5xl leading-[1.1] font-light md:ml-3 hidden md:block">Obsess for</span>
                    <span className={`text-foreground-primary ${vujahdayScript.className} text-6xl leading-[1.1] font-light md:ml-0 md:mt-0 hidden md:block`}>Hours</span>
                    {/* Mobile: stack, no dash */}
                    <div className="flex flex-col items-center text-center w-full md:hidden mt-8">
                        <span className="text-foreground-primary text-5xl leading-[1.1] font-light">Obsess for</span>
                        <span className={`text-foreground-primary ${vujahdayScript.className} text-6xl leading-[1.1] font-light mt-2`}>Hours</span>
                    </div>
                </div>
                {/* Subtext blocks */}
                <div className="flex-1 flex md:flex-row flex-col w-full justify-between md:gap-24 gap-12">
                    <div className="flex flex-col gap-6 w-full text-center">
                        <p className="text-foreground-primary text-title3">Infused with AI</p>
                        <p className="text-foreground-secondary text-regular text-balance">Craft at the speed of thought</p>
                    </div>
                    <div className="flex flex-col gap-6 w-full text-center">
                        <p className="text-foreground-primary text-title3">Crafted for Design</p>
                        <p className="text-foreground-secondary text-regular text-balance">Precise styling, infinite possibilities, component-first </p>
                    </div>
                </div>
            </div>
        </div>
    );
} 
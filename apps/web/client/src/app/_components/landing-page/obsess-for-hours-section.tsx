import { Icons } from '@onlook/ui/icons/index';

import { vujahdayScript } from '../../fonts';

export function ObsessForHoursSection() {
    return (
        <div className="bg-background-onlook/80 mx-auto flex w-full flex-col items-start gap-24 px-8 py-32 md:flex-row md:gap-12">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
                {/* Responsive heading */}
                <div className="mb-12 flex w-full flex-col items-center justify-center md:flex-row md:gap-1">
                    {/* Desktop: all in a row, no stacking */}
                    <span className="text-foreground-primary text-5xl leading-[1.1] font-light">
                        Build in
                    </span>
                    <span
                        className={`text-foreground-primary ${vujahdayScript.className} mt-2 text-6xl leading-[1.1] font-light md:mt-0 md:mr-3 md:ml-3`}
                    >
                        Seconds
                    </span>
                    <span className="text-foreground-primary font-ultraLight mx-8 hidden text-5xl leading-[1.1] md:inline-block">
                        –
                    </span>
                    <span className="text-foreground-primary hidden text-5xl leading-[1.1] font-light md:ml-3 md:block">
                        Obsess for
                    </span>
                    <span
                        className={`text-foreground-primary ${vujahdayScript.className} hidden text-6xl leading-[1.1] font-light md:mt-0 md:ml-0 md:block`}
                    >
                        Hours
                    </span>
                    {/* Mobile: stack, no dash */}
                    <div className="mt-8 flex w-full flex-col items-center text-center md:hidden">
                        <span className="text-foreground-primary text-5xl leading-[1.1] font-light">
                            Obsess for
                        </span>
                        <span
                            className={`text-foreground-primary ${vujahdayScript.className} mt-2 text-6xl leading-[1.1] font-light`}
                        >
                            Hours
                        </span>
                    </div>
                </div>
                {/* Subtext blocks */}
                <div className="flex w-full flex-1 flex-col justify-between gap-12 md:flex-row md:gap-24">
                    <div className="flex w-full flex-col gap-6 text-center">
                        <p className="text-foreground-primary text-title3">Infused with AI</p>
                        <p className="text-foreground-secondary text-regular text-balance">
                            Craft at the speed of thought
                        </p>
                    </div>
                    <div className="flex w-full flex-col gap-6 text-center">
                        <p className="text-foreground-primary text-title3">Crafted for Design</p>
                        <p className="text-foreground-secondary text-regular text-balance">
                            Precise styling, infinite possibilities, component-first{' '}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

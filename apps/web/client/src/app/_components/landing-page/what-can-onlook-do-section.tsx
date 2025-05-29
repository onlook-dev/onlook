import { Icons } from '@onlook/ui/icons/index';
import { MockLayersTab } from './mock-layers-tab';

export function WhatCanOnlookDoSection() {
    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8 flex flex-col md:flex-row gap-24 md:gap-24">
            {/* Left Column */}
            <div className="flex-1 flex flex-col gap-24">
                {/* Section Title */}
                <h2 className="text-foreground-primary text-[4vw] leading-[1.1] font-light mb-8 max-w-xl">What can<br />Onlook do?</h2>
                {/* Direct editing */}
                <div className="flex flex-col gap-4">
                    <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6 overflow-hidden">
                        <MockLayersTab />
                    </div>
                    <div className="flex flex-row items-start gap-8 w-full">
                        {/* Icon + Title */}
                        <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons.DirectManipulation className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Direct editing</span>
                        </div>
                        {/* Description */}
                        <p className="text-foreground-secondary text-regular text-balance w-1/2">Drag-and-drop, rearrange, scale, and more with elements directly in the editor.</p>
                    </div>
                </div>
                {/* Components */}
                <div className="flex flex-col gap-4">
                    <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                    <div className="flex flex-row items-start gap-8 w-full">
                        {/* Icon + Title */}
                        <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons.Component className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Components</span>
                        </div>
                        {/* Description */}
                        <p className="text-foreground-secondary text-regular text-balance w-1/2">Customize reusable components that you can swap-out across websites.</p>
                    </div>
                </div>
                {/* Layers */}
                <div className="flex flex-col gap-4">
                    <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                    <div className="flex flex-row items-start gap-8 w-full">
                        {/* Icon + Title */}
                        <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons.Layers className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Layers</span>
                        </div>
                        {/* Description */}
                        <p className="text-foreground-secondary text-regular text-balance w-1/2">Select elements exactly where you need them to be</p>
                    </div>
                </div>
            </div>
            {/* Right Column */}
            <div className="flex-1 flex flex-col gap-18 mt-16 md:mt-32">
                {/* Work in the true product */}
                <div className="flex flex-col gap-4">
                    <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                    <div className="flex flex-row items-start gap-8 w-full">
                        {/* Icon + Title */}
                        <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons.EyeOpen className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Work in the <span className='underline'>true</span> product</span>
                        </div>
                        {/* Description */}
                        <p className="text-foreground-secondary text-regular text-balance w-1/2">Work an entirely new dimension – experience your designs come to life</p>
                    </div>
                </div>
                {/* Brand compliance */}
                <div className="flex flex-col gap-4">
                    <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                    <div className="flex flex-row items-start gap-8 w-full">
                        {/* Icon + Title */}
                        <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons.Brand className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Brand compliance</span>
                        </div>
                        {/* Description */}
                        <p className="text-foreground-secondary text-regular text-balance w-1/2">Make your fonts, colors, and styles all speak the same language.</p>
                    </div>
                </div>
                {/* Instantly responsive */}
                <div className="flex flex-col gap-4">
                    <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                    <div className="flex flex-row items-start gap-8 w-full">
                        {/* Icon + Title */}
                        <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons.Laptop className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Instantly responsive</span>
                        </div>
                        {/* Description */}
                        <p className="text-foreground-secondary text-regular text-balance w-1/2">Craft sites that look great on laptops, tablets, and phones with minimal adjustments.</p>
                    </div>
                </div>
                {/* Revision history */}
                <div className="flex flex-col gap-4">
                    <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                    <div className="flex flex-row items-start gap-8 w-full">
                        {/* Icon + Title */}
                        <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons.CounterClockwiseClock className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Revision history</span>
                        </div>
                        {/* Description */}
                        <p className="text-foreground-secondary text-regular text-balance w-1/2">Never lose your progress – revert when you need to</p>
                    </div>
                </div>
            </div>
        </div>
    );
} 
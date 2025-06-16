import { Icons } from '@onlook/ui/icons/index';
import { MockLayersTab } from './mock-layers-tab';

export function WhatCanOnlookDoSection() {
    // ColorSwatchGroup: label, colorClasses (array of 12 tailwind color classes)
    function ColorSwatchGroup({ label, colorClasses }: { label: string, colorClasses: string[] }) {
        return (
            <div className="mb-1">
                <div className="text-foreground-tertiary text-xs mb-1">{label}</div>
                <div className="grid grid-cols-6 gap-0.5 mb-1">
                    {colorClasses.slice(0, 6).map((cls, i) => (
                        <div key={cls + i} className={`w-8 h-8 rounded-md border-[1px] border-foreground-primary/20 ${cls}`} />
                    ))}
                </div>
                <div className="grid grid-cols-6 gap-0.5">
                    {colorClasses.slice(6, 12).map((cls, i) => (
                        <div key={cls + i} className={`w-8 h-8 rounded-md border-[1px] border-foreground-primary/20 ${cls}`} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto py-32 px-8 flex flex-col md:flex-row gap-24 md:gap-24">
            {/* Left Column */}
            <div className="flex-1 flex flex-col gap-24">
                {/* Section Title */}
                <h2 className="text-foreground-primary text-[4vw] leading-[1.1] font-light mb-8 max-w-xl">What can<br />Onlook do?</h2>
                {/* Direct editing */}
                <div className="flex flex-col gap-4">
                    <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6 overflow-hidden">
                        
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
                    {/* Custom Components Menu + Calendar Preview */}
                    <div className="flex flex-row gap-8 relative min-h-[400px] overflow-hidden bg-background-onlook/80 rounded-lg">
                        {/* Left menu container with grey background and overflow hidden */}
                        <div className="w-56 h-100 rounded-xl overflow-hidden absolute left-8 top-12 flex flex-col items-center justify-start bg-black border-[0.5px] border-foreground-primary/20">
                            <p className="text-foreground-primary text-regular font-light w-full text-left px-3 py-2 border-b-[0.5px] border-foreground-primary/20">Components</p>
                            <div className="grid grid-cols-2 grid-rows-3 gap-6 w-full h-full p-4">
                                {[
                                    { label: 'Calendar', selected: true },
                                    { label: 'Card', selected: false },
                                    { label: 'Carousel', selected: false },
                                    { label: 'Chart', selected: false },
                                    { label: 'Table', selected: false },
                                    { label: 'Map', selected: false },
                                ].map((item, idx) => (
                                    <div key={item.label} className="flex flex-col items-center w-full">
                                        <div
                                            className={
                                                `w-24 h-18 rounded-xs mb-2 flex items-start bg-background-secondary justify-start transition-all ` +
                                                (item.selected
                                                    ? 'outline outline-1 outline-purple-400 outline-offset-2'
                                                    : '')
                                            }
                                        >
                                            {/* Placeholder for component preview */}
                                            <div className="w-24 h-24 rounded" />
                                        </div>
                                        <span className="text-foreground-primary text-xs text-left w-full">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Floating calendar preview */}
                        <div className="absolute left-50 top-30 z-10">
                            <div className="rounded-xl border-1 border-purple-400 bg-black p-4 min-w-[240px]" style={{ fontSize: '0.6rem' }}>
                                {/* Calendar header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex gap-1">
                                        <button className="px-2 py-0.5 rounded bg-zinc-900 text-foreground-primary text-xs flex items-center">
                                            {new Date().toLocaleString('default', { month: 'short' })} 
                                            <svg width='8' height='8' className='ml-1'><path d='M2 3l2 2 2-2' stroke='white' strokeWidth='1' fill='none'/></svg>
                                        </button>
                                        <button className="px-2 py-0.5 rounded bg-zinc-900 text-foreground-primary text-xs flex items-center">
                                            {new Date().getFullYear()} 
                                            <svg width='8' height='8' className='ml-1'><path d='M2 3l2 2 2-2' stroke='white' strokeWidth='1' fill='none'/></svg>
                                        </button>
                                    </div>
                                    <div className="flex gap-1">
                                        <button className="text-foreground-primary hover:text-foreground-primary text-xs">&#60;</button>
                                        <button className="text-foreground-primary hover:text-foreground-primary text-xs">&#62;</button>
                                    </div>
                                </div>
                                {/* Calendar grid */}
                                <div className="grid grid-cols-7 gap-[2px] text-center text-zinc-400 text-xs mb-2 cursor-pointer">
                                    {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d}>{d}</div>)}
                                </div>
                                <div className="grid grid-cols-7 gap-[2px] text-center cursor-pointer">
                                    {(() => {
                                        const today = new Date();
                                        const currentMonth = today.getMonth();
                                        const currentYear = today.getFullYear();
                                        const firstDay = new Date(currentYear, currentMonth, 1);
                                        const lastDay = new Date(currentYear, currentMonth + 1, 0);
                                        const daysInMonth = lastDay.getDate();
                                        const startingDay = firstDay.getDay();
                                        
                                        return Array.from({length: 42}, (_,i) => {
                                            const day = i - startingDay + 1;
                                            const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                                            
                                            if (day < 1 || day > daysInMonth) return <div key={i}></div>;
                                            
                                            return (
                                                <div
                                                    key={i}
                                                    className={
                                                        `py-[2px] rounded-full text-xs ` +
                                                        (isToday ? 'bg-white text-black font-bold' : 'hover:bg-zinc-800 text-zinc-200')
                                                    }
                                                >
                                                    {day}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
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
                    <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6 relative overflow-hidden">
                    <div className="w-56 h-100 rounded-xl overflow-hidden absolute left-8 top-12 flex flex-col items-center justify-start bg-black border-[0.5px] border-foreground-primary/20">
                        <p className="text-foreground-primary text-regular font-light w-full text-left px-3 py-2 border-b-[0.5px] border-foreground-primary/20">Layers</p>
                        <div className="flex flex-row items-start gap-8 w-full">
                         <MockLayersTab />
                        </div>
                    </div>
                    </div>
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
                {/* Work in the true product 
                <div className="flex flex-col gap-4">
                    <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6" />
                    <div className="flex flex-row items-start gap-8 w-full">

                        <div className="flex flex-col items-start w-1/2">
                            <div className="mb-2"><Icons. className="w-6 h-6 text-foreground-primary" /></div>
                            <span className="text-foreground-primary text-largePlus font-light">Work in the <span className='underline'>true</span> product</span>
                        </div>
                        <p className="text-foreground-secondary text-regular text-balance w-1/2">Work an entirely new dimension – experience your designs come to life</p>
                    </div>
                </div> */}
                {/* Brand compliance */}
                <div className="flex flex-col gap-4">
                <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6 relative overflow-hidden">
                    <div className="w-60 h-100 rounded-xl overflow-hidden absolute left-8 top-7 flex flex-col items-center justify-start bg-black border-[0.5px] border-foreground-primary/20">
                        <p className="text-foreground-primary text-regular font-light w-full text-left px-3 py-2 border-b-[0.5px] border-foreground-primary/20">Brand Colors</p>
                        <div className="w-full h-full overflow-y-auto px-3 py-2 flex flex-col gap-2">
                            <ColorSwatchGroup label="Slate" colorClasses={[
                                "bg-slate-50","bg-slate-100","bg-slate-200","bg-slate-300","bg-slate-400","bg-slate-500",
                                "bg-slate-500","bg-slate-600","bg-slate-700","bg-slate-800","bg-slate-900","bg-slate-900"
                            ]} />
                            <ColorSwatchGroup label="Gray" colorClasses={[
                                "bg-gray-50","bg-gray-100","bg-gray-200","bg-gray-300","bg-gray-400","bg-gray-500",
                                "bg-gray-500","bg-gray-600","bg-gray-700","bg-gray-800","bg-gray-900","bg-gray-900"
                            ]} />
                            <ColorSwatchGroup label="Zinc" colorClasses={[
                                "bg-zinc-50","bg-zinc-100","bg-zinc-200","bg-zinc-300","bg-zinc-400","bg-zinc-500",
                                "bg-zinc-500","bg-zinc-600","bg-zinc-700","bg-zinc-800","bg-zinc-900","bg-zinc-900"
                            ]} />
                            <ColorSwatchGroup label="Amber" colorClasses={[
                                "bg-amber-50","bg-amber-100","bg-amber-200","bg-amber-300","bg-amber-400","bg-amber-500",
                                "bg-amber-500","bg-amber-600","bg-amber-700","bg-amber-800","bg-amber-900","bg-amber-900"
                            ]} />
                            <ColorSwatchGroup label="Yellow" colorClasses={[
                                "bg-yellow-50","bg-yellow-100","bg-yellow-200","bg-yellow-300","bg-yellow-400","bg-yellow-500",
                                "bg-yellow-500","bg-yellow-600","bg-yellow-700","bg-yellow-800","bg-yellow-900","bg-yellow-900"
                            ]} />
                            <ColorSwatchGroup label="Lime" colorClasses={[
                                "bg-lime-50","bg-lime-100","bg-lime-200","bg-lime-300","bg-lime-400","bg-lime-500",
                                "bg-lime-500","bg-lime-600","bg-lime-700","bg-lime-800","bg-lime-900","bg-lime-900"
                            ]} />
                            <ColorSwatchGroup label="Green" colorClasses={[
                                "bg-green-50","bg-green-100","bg-green-200","bg-green-300","bg-green-400","bg-green-500",
                                "bg-green-500","bg-green-600","bg-green-700","bg-green-800","bg-green-900","bg-green-900"
                            ]} />
                        </div>
                    </div>
                    <div className="w-60 h-100 rounded-xl overflow-hidden absolute right-10 top-20 flex flex-col items-center justify-start bg-black border-[0.5px] border-foreground-primary/20">
                        <p className="text-foreground-primary text-regular font-light w-full text-left px-3 py-2 border-b-[0.5px] border-foreground-primary/20">Brand Colors</p>
                        <div className="w-full h-full overflow-y-auto px-3 py-2 flex flex-col gap-2">
                            <ColorSwatchGroup label="Yellow" colorClasses={[
                                "bg-yellow-50","bg-yellow-100","bg-yellow-200","bg-yellow-300","bg-yellow-400","bg-yellow-500",
                                "bg-yellow-500","bg-yellow-600","bg-yellow-700","bg-yellow-800","bg-yellow-900","bg-yellow-900"
                            ]} />
                            <ColorSwatchGroup label="Lime" colorClasses={[
                                "bg-lime-50","bg-lime-100","bg-lime-200","bg-lime-300","bg-lime-400","bg-lime-500",
                                "bg-lime-500","bg-lime-600","bg-lime-700","bg-lime-800","bg-lime-900","bg-lime-900"
                            ]} />
                            <ColorSwatchGroup label="Green" colorClasses={[
                                "bg-green-50","bg-green-100","bg-green-200","bg-green-300","bg-green-400","bg-green-500",
                                "bg-green-500","bg-green-600","bg-green-700","bg-green-800","bg-green-900","bg-green-900"
                            ]} />
                            <ColorSwatchGroup label="Emerald" colorClasses={[
                                "bg-emerald-50","bg-emerald-100","bg-emerald-200","bg-emerald-300","bg-emerald-400","bg-emerald-500",
                                "bg-emerald-500","bg-emerald-600","bg-emerald-700","bg-emerald-800","bg-emerald-900","bg-emerald-900"
                            ]} />
                            <ColorSwatchGroup label="Teal" colorClasses={[
                                "bg-teal-50","bg-teal-100","bg-teal-200","bg-teal-300","bg-teal-400","bg-teal-500",
                                "bg-teal-500","bg-teal-600","bg-teal-700","bg-teal-800","bg-teal-900","bg-teal-900"
                            ]} />
                            <ColorSwatchGroup label="Cyan" colorClasses={[
                                "bg-cyan-50","bg-cyan-100","bg-cyan-200","bg-cyan-300","bg-cyan-400","bg-cyan-500",
                                "bg-cyan-500","bg-cyan-600","bg-cyan-700","bg-cyan-800","bg-cyan-900","bg-cyan-900"
                            ]} />
                            <ColorSwatchGroup label="Blue" colorClasses={[
                                "bg-blue-50","bg-blue-100","bg-blue-200","bg-blue-300","bg-blue-400","bg-blue-500",
                                "bg-blue-500","bg-blue-600","bg-blue-700","bg-blue-800","bg-blue-900","bg-blue-900"
                            ]} />
                        </div>
                    </div>
                    </div>
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
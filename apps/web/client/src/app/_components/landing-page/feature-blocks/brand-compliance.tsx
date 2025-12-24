import { Icons } from '@onlook/ui/icons';
import { ColorSwatchGroup } from '../color-swatch-group';
import React, { useRef, useState, useCallback, useEffect } from 'react';

function ParallaxContainer({ children, speed = 0.1 }: { children: React.ReactNode, speed?: number }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState(0);
    const ticking = useRef(false);

    const updateTransform = useCallback(() => {
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Calculate how far the element is from the center of the viewport
        const distanceFromCenter = rect.top + rect.height / 2 - viewportHeight / 2;
        
        // Apply transform based on distance from center
        setTransform(distanceFromCenter * speed);
        
        ticking.current = false;
    }, [speed]);

    useEffect(() => {
        const handleScroll = () => {
            if (!ticking.current) {
                window.requestAnimationFrame(() => {
                    updateTransform();
                });
                ticking.current = true;
            }
        };

        // Use passive scroll listener for better performance
        window.addEventListener('scroll', handleScroll, { passive: true });
        updateTransform(); // Initial calculation

        return () => window.removeEventListener('scroll', handleScroll);
    }, [updateTransform]);

    return (
        <div 
            ref={containerRef}
            style={{ 
                transform: `translate3d(0, ${transform}px, 0)`,
                transition: 'transform 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform',
                backfaceVisibility: 'hidden',
                perspective: '1000px'
            }}
        >
            {children}
        </div>
    );
}

export function BrandComplianceBlock() {
    return (
        <div className="flex flex-col gap-4">
            <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6 relative overflow-hidden">
                <ParallaxContainer speed={0.04}>
                    <div className="w-60 h-100 rounded-xl overflow-hidden absolute left-1/14 top-7 flex flex-col items-center justify-start bg-black/85 backdrop-blur-2xl border-[0.5px] border-foreground-primary/20">
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
                            <ColorSwatchGroup label="Orange" colorClasses={[
                                "bg-orange-50","bg-orange-100","bg-orange-200","bg-orange-300","bg-orange-400","bg-orange-500",
                                "bg-orange-500","bg-orange-600","bg-orange-700","bg-orange-800","bg-orange-900","bg-orange-900"
                            ]} />
                            <ColorSwatchGroup label="Amber" colorClasses={[
                                "bg-amber-50","bg-amber-100","bg-amber-200","bg-amber-300","bg-amber-400","bg-amber-500",
                                "bg-amber-500","bg-amber-600","bg-amber-700","bg-amber-800","bg-amber-900","bg-amber-900"
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
                </ParallaxContainer>
                <ParallaxContainer speed={-0.04}>
                    <div className="w-60 h-100 rounded-xl overflow-hidden absolute right-1/14 top-20 flex flex-col items-center justify-start bg-black/50 backdrop-blur-2xl border-[0.5px] border-foreground-primary/20">
                        <p className="text-foreground-primary text-regular font-light w-full text-left px-3 py-2 border-b-[0.5px] border-foreground-primary/20">Brand Colors</p>
                        <div className="w-full h-full overflow-y-auto px-3 py-2 flex flex-col gap-2">
                            <ColorSwatchGroup label="Cyan" colorClasses={[
                                "bg-cyan-50","bg-cyan-100","bg-cyan-200","bg-cyan-300","bg-cyan-400","bg-cyan-500",
                                "bg-cyan-500","bg-cyan-600","bg-cyan-700","bg-cyan-800","bg-cyan-900","bg-cyan-900"
                            ]} />
                            <ColorSwatchGroup label="Blue" colorClasses={[
                                "bg-blue-50","bg-blue-100","bg-blue-200","bg-blue-300","bg-blue-400","bg-blue-500",
                                "bg-blue-500","bg-blue-600","bg-blue-700","bg-blue-800","bg-blue-900","bg-blue-900"
                            ]} />
                            <ColorSwatchGroup label="Indigo" colorClasses={[
                                "bg-indigo-50","bg-indigo-100","bg-indigo-200","bg-indigo-300","bg-indigo-400","bg-indigo-500",
                                "bg-indigo-500","bg-indigo-600","bg-indigo-700","bg-indigo-800","bg-indigo-900","bg-indigo-900"
                            ]} />
                            <ColorSwatchGroup label="Violet" colorClasses={[
                                "bg-violet-50","bg-violet-100","bg-violet-200","bg-violet-300","bg-violet-400","bg-violet-500",
                                "bg-violet-500","bg-violet-600","bg-violet-700","bg-violet-800","bg-violet-900","bg-violet-900"
                            ]} />
                            <ColorSwatchGroup label="Purple" colorClasses={[
                                "bg-purple-50","bg-purple-100","bg-purple-200","bg-purple-300","bg-purple-400","bg-purple-500",
                                "bg-purple-500","bg-purple-600","bg-purple-700","bg-purple-800","bg-purple-900","bg-purple-900"
                            ]} />
                            <ColorSwatchGroup label="Pink" colorClasses={[
                                "bg-pink-50","bg-pink-100","bg-pink-200","bg-pink-300","bg-pink-400","bg-pink-500",
                                "bg-pink-500","bg-pink-600","bg-pink-700","bg-pink-800","bg-pink-900","bg-pink-900"
                            ]} />
                            <ColorSwatchGroup label="Rose" colorClasses={[
                                "bg-rose-50","bg-rose-100","bg-rose-200","bg-rose-300","bg-rose-400","bg-rose-500",
                                "bg-rose-500","bg-rose-600","bg-rose-700","bg-rose-800","bg-rose-900","bg-rose-900"
                            ]} />
                        </div>
                    </div>
                </ParallaxContainer>
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
    );
} 
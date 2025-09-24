'use client';

import React, { useState } from 'react';

import { ColorPicker } from '@onlook/ui/color-picker';
import { Icons as EditorIcons, Icons } from '@onlook/ui/icons';
import { Color } from '@onlook/utility';

import { InputSeparator } from '@/app/project/[id]/_components/editor-bar/separator';
import { ToolbarButton } from '@/app/project/[id]/_components/editor-bar/toolbar-button';
import { ColorSwatchGroup } from '../../landing-page/color-swatch-group';

export function TailwindColorEditorMockup() {
    const [color, setColor] = useState<Color>(() => Color.from('#0088FF').withAlpha(1));

    // Local aliases to satisfy JSX typing in this mock file
    const ImageIcon = Icons.Image as unknown as React.FC<React.SVGProps<SVGSVGElement>>;
    const CloseIcon = Icons.CrossS as unknown as React.FC<React.SVGProps<SVGSVGElement>>;

    const bunkerSwatches = [
        'bg-[#0D0F12]',
        'bg-[#171A1F]',
        'bg-[#1B1F26]',
        'bg-[#20242C]',
        'bg-[#252A33]',
        'bg-[#2B303B]',
        'bg-[#313846]',
        'bg-[#3A4354]',
        'bg-[#424B5E]',
        'bg-[#4B5566]',
        'bg-[#515C70]',
    ];

    return (
        <div className="bg-background-onlook/80 relative h-100 w-full overflow-hidden rounded-lg">
            {/* Morphing shader preview bound to picker color, positioned to the right of the dropdown */}
            <div
                className="border-foreground-primary/10 absolute top-24 left-[200px] z-10 h-[420px] w-[640px] overflow-hidden rounded-[28px] border shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]"
                style={{
                    WebkitMaskImage:
                        'radial-gradient(140% 140% at 50% 50%, black 86%, transparent 100%)',
                    maskImage: 'radial-gradient(140% 140% at 50% 50%, black 86%, transparent 100%)',
                }}
            >
                {/* Animated gooey blobs */}
                {(() => {
                    const primary = color.toHex();
                    const complementary = new Color({
                        ...color,
                        h: (color.h + 0.5) % 1,
                        a: 1,
                    }).toHex();
                    const triadic = new Color({ ...color, h: (color.h + 0.33) % 1, a: 1 }).toHex();
                    const split1 = new Color({ ...color, h: (color.h + 0.42) % 1, a: 1 }).toHex();
                    const split2 = new Color({ ...color, h: (color.h + 0.58) % 1, a: 1 }).toHex();
                    const primaryLight = new Color({
                        ...color,
                        v: Math.min(1, color.v * 1.12),
                        a: 1,
                    }).toHex();
                    const primaryDark = new Color({
                        ...color,
                        v: Math.max(0, color.v * 0.82),
                        a: 1,
                    }).toHex();
                    // alpha-adjusted variants for the soft background field
                    const primaryBg = `${primary}B3`; // ~70%
                    const compBg = `${complementary}40`; // ~25%
                    const triadicBg = `${triadic}33`; // ~20%
                    return (
                        <>
                            <style>
                                {`
                  @keyframes blobFloat1 { 0% { transform: translate(-10%, -10%) scale(1); } 33% { transform: translate(22%, -26%) scale(1.18); } 66% { transform: translate(10%, 12%) scale(0.98); } 100% { transform: translate(-10%, -10%) scale(1); } }
                  @keyframes blobFloat2 { 0% { transform: translate(40%, -5%) scale(1.08); } 33% { transform: translate(5%, 22%) scale(0.95); } 66% { transform: translate(30%, 15%) scale(1.18); } 100% { transform: translate(40%, -5%) scale(1.08); } }
                  @keyframes blobFloat3 { 0% { transform: translate(8%, 28%) scale(1.16); } 33% { transform: translate(-18%, 12%) scale(1.02); } 66% { transform: translate(0%, 22%) scale(1.12); } 100% { transform: translate(8%, 28%) scale(1.16); } }
                  @keyframes blobFloat4 { 0% { transform: translate(15%, -10%) scale(1); } 50% { transform: translate(5%, 8%) scale(1.2); } 100% { transform: translate(15%, -10%) scale(1); } }
                  @keyframes blobFloat5 { 0% { transform: translate(-10%, 10%) scale(1); } 50% { transform: translate(10%, -8%) scale(1.15); } 100% { transform: translate(-10%, 10%) scale(1); } }
                  @keyframes gradientShift { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
                  @keyframes waveSlide1 { 0% { transform: translateY(10%) translateX(-10%) rotate(-8deg); } 50% { transform: translateY(-4%) translateX(6%) rotate(-4deg); } 100% { transform: translateY(10%) translateX(-10%) rotate(-8deg); } }
                  @keyframes waveSlide2 { 0% { transform: translateY(-12%) translateX(8%) rotate(-6deg); } 50% { transform: translateY(6%) translateX(-4%) rotate(-10deg); } 100% { transform: translateY(-12%) translateX(8%) rotate(-6deg); } }
                  @keyframes waveSlide3 { 0% { transform: translateY(6%) translateX(2%) rotate(-12deg); } 50% { transform: translateY(-8%) translateX(-6%) rotate(-6deg); } 100% { transform: translateY(6%) translateX(2%) rotate(-12deg); } }
                `}
                            </style>
                            <div className="absolute inset-0 bg-black/10" />
                            <div
                                className="absolute -inset-40 opacity-90 blur-3xl"
                                style={{
                                    background: `radial-gradient(40% 40% at 20% 30%, ${primaryBg} 0%, transparent 60%), radial-gradient(35% 35% at 75% 25%, ${compBg} 0%, transparent 60%), radial-gradient(45% 45% at 50% 80%, ${triadicBg} 0%, transparent 60%)`,
                                    animation: 'gradientShift 60s linear infinite',
                                }}
                            />
                            {/* Waves grouped under an extra blur to ensure no edges */}
                            <div
                                className="absolute inset-0"
                                style={{ filter: 'blur(16px) saturate(110%)' }}
                            >
                                {/* Morphing wave ribbons (curved masks) */}
                                <div
                                    className="absolute inset-0 opacity-70"
                                    style={{
                                        background: `linear-gradient(90deg, ${primaryDark} 0%, ${primary} 68%, ${complementary} 100%)`,
                                        filter: 'saturate(120%) blur(18px)',
                                        WebkitMaskImage:
                                            'radial-gradient(120% 100% at 50% 0%, transparent 30%, black 52% 66%, transparent 74%)',
                                        maskImage:
                                            'radial-gradient(120% 100% at 50% 0%, transparent 30%, black 52% 66%, transparent 74%)',
                                        animation: 'waveSlide1 18s ease-in-out infinite',
                                    }}
                                />
                                {/* highlight for wave 1 (softer edge, no visible border) */}
                                <div
                                    className="absolute inset-0 opacity-[0.14] mix-blend-screen"
                                    style={{
                                        background:
                                            'linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0))',
                                        filter: 'blur(18px)',
                                        WebkitMaskImage:
                                            'radial-gradient(120% 100% at 50% 0%, transparent 36%, black 58% 62%, transparent 70%)',
                                        maskImage:
                                            'radial-gradient(120% 100% at 50% 0%, transparent 36%, black 58% 62%, transparent 70%)',
                                        animation: 'waveSlide1 18s ease-in-out infinite',
                                    }}
                                />
                                <div
                                    className="absolute inset-0 opacity-60"
                                    style={{
                                        background: `linear-gradient(90deg, ${triadic} 0%, ${primaryLight} 72%, ${split1} 100%)`,
                                        filter: 'saturate(130%) blur(18px)',
                                        WebkitMaskImage:
                                            'radial-gradient(140% 110% at 50% 100%, transparent 34%, black 56% 68%, transparent 80%)',
                                        maskImage:
                                            'radial-gradient(140% 110% at 50% 100%, transparent 34%, black 56% 68%, transparent 80%)',
                                        animation: 'waveSlide2 22s ease-in-out -3s infinite',
                                    }}
                                />
                                {/* highlight for wave 2 (softer edge, no visible border) */}
                                <div
                                    className="absolute inset-0 opacity-[0.11] mix-blend-screen"
                                    style={{
                                        background:
                                            'linear-gradient(90deg, rgba(255,255,255,0.36), rgba(255,255,255,0))',
                                        filter: 'blur(16px)',
                                        WebkitMaskImage:
                                            'radial-gradient(140% 110% at 50% 100%, transparent 40%, black 60% 64%, transparent 78%)',
                                        maskImage:
                                            'radial-gradient(140% 110% at 50% 100%, transparent 40%, black 60% 64%, transparent 78%)',
                                        animation: 'waveSlide2 22s ease-in-out -3s infinite',
                                    }}
                                />
                                {/* third wave */}
                                <div
                                    className="absolute inset-0 opacity-45"
                                    style={{
                                        background: `linear-gradient(90deg, ${split2} 0%, ${complementary} 84%, ${primaryLight} 100%)`,
                                        filter: 'saturate(140%) blur(18px)',
                                        WebkitMaskImage:
                                            'radial-gradient(120% 120% at 0% 50%, transparent 30%, black 52% 66%, transparent 78%)',
                                        maskImage:
                                            'radial-gradient(120% 120% at 0% 50%, transparent 30%, black 52% 66%, transparent 78%)',
                                        animation: 'waveSlide3 20s ease-in-out -6s infinite',
                                    }}
                                />
                                {/* highlight for wave 3 (softer edge, no visible border) */}
                                <div
                                    className="absolute inset-0 opacity-[0.1] mix-blend-screen"
                                    style={{
                                        background:
                                            'linear-gradient(90deg, rgba(255,255,255,0.3), rgba(255,255,255,0))',
                                        filter: 'blur(16px)',
                                        WebkitMaskImage:
                                            'radial-gradient(120% 120% at 0% 50%, transparent 38%, black 60% 64%, transparent 76%)',
                                        maskImage:
                                            'radial-gradient(120% 120% at 0% 50%, transparent 38%, black 60% 64%, transparent 76%)',
                                        animation: 'waveSlide3 20s ease-in-out -6s infinite',
                                    }}
                                />
                            </div>
                            <div
                                className="absolute top-[-5%] left-[-5%] h-[55%] w-[55%] rounded-[40%] opacity-90 mix-blend-screen"
                                style={{
                                    background: primary,
                                    filter: 'blur(40px)',
                                    animation: 'blobFloat1 16s ease-in-out infinite',
                                }}
                            />
                            <div
                                className="absolute top-[5%] right-[-8%] h-[45%] w-[45%] rounded-[45%] opacity-90 mix-blend-screen"
                                style={{
                                    background: complementary,
                                    filter: 'blur(48px)',
                                    animation: 'blobFloat2 20s ease-in-out -2s infinite',
                                }}
                            />
                            <div
                                className="absolute bottom-[-10%] left-[10%] h-[55%] w-[60%] rounded-[45%] opacity-85 mix-blend-screen"
                                style={{
                                    background: triadic,
                                    filter: 'blur(56px)',
                                    animation: 'blobFloat3 22s ease-in-out -4s infinite',
                                }}
                            />
                            {/* extra small energetic blobs */}
                            <div
                                className="absolute right-[12%] bottom-[12%] h-[24%] w-[24%] rounded-[50%] opacity-55 mix-blend-screen"
                                style={{
                                    background: split1,
                                    filter: 'blur(28px)',
                                    animation: 'blobFloat4 14s ease-in-out -1s infinite',
                                }}
                            />
                            <div
                                className="absolute top-[30%] left-[6%] h-[18%] w-[18%] rounded-[50%] opacity-60 mix-blend-screen"
                                style={{
                                    background: split2,
                                    filter: 'blur(24px)',
                                    animation: 'blobFloat5 12s ease-in-out -3s infinite',
                                }}
                            />
                            {/* Soft vignette & grain for style */}
                            <div
                                className="pointer-events-none absolute inset-0"
                                style={{
                                    background:
                                        'radial-gradient(120% 80% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.25) 100%)',
                                }}
                            />
                            <div
                                className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
                                style={{
                                    backgroundImage:
                                        "url(\"data:image/svg+xml;utf8,<?xml version='1.0' encoding='UTF-8'?><svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='linear' slope='0.5'/></feComponentTransfer></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>\")",
                                }}
                            />
                        </>
                    );
                })()}
            </div>
            {/* Top toolbar mockup (exact toolbar styles as editor bar) */}
            <div className="border-border bg-background absolute top-4 left-4 z-20 flex w-auto flex-col overflow-hidden rounded-xl border-[0.5px] p-1 px-1 drop-shadow-xl backdrop-blur">
                <div className="flex w-auto items-center justify-start gap-0.5 overflow-hidden">
                    <ToolbarButton
                        isOpen
                        className="flex w-10 flex-col items-center justify-center gap-0.5"
                    >
                        <Icons.PaintBucket className="h-2 w-2" />
                        <div
                            className="h-[4px] w-6 rounded-full"
                            style={{ backgroundColor: color.toHex() }}
                        />
                    </ToolbarButton>
                    <ToolbarButton className="flex h-9 w-9 items-center justify-center">
                        <ImageIcon className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton className="flex h-9 w-9 items-center justify-center">
                        <Icons.BorderEdit className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton className="flex w-10 flex-col items-center justify-center gap-0.5">
                        <Icons.PencilIcon className="h-4 w-4" />
                        <div className="bg-foreground-primary h-[4px] w-6 rounded-full" />
                    </ToolbarButton>
                    <InputSeparator />
                    <ToolbarButton className="flex min-w-10 items-center gap-1">
                        <Icons.Layout className="text-foreground-primary h-4 min-h-4 w-4 min-w-4" />
                        <span className="text-small text-foreground-primary">Flex</span>
                    </ToolbarButton>
                    <ToolbarButton className="flex min-w-10 items-center gap-1">
                        <Icons.PaddingFull className="h-4 min-h-4 w-4 min-w-4" />
                        <span className="text-small text-foreground-primary">8</span>
                    </ToolbarButton>
                    <ToolbarButton className="flex min-w-10 items-center gap-1">
                        <Icons.MarginTRB className="h-4 min-h-4 w-4 min-w-4" />
                        <span className="text-small text-foreground-primary">Mixed</span>
                    </ToolbarButton>
                    <InputSeparator />
                    <ToolbarButton className="flex min-w-10 items-center justify-start px-4">
                        <span className="text-regularPlus">Inter</span>
                    </ToolbarButton>
                    <InputSeparator />
                    <ToolbarButton className="flex min-w-10 items-center gap-1 px-3">
                        <span className="text-regularPlus">Regular</span>
                    </ToolbarButton>
                    <InputSeparator />
                    {/* Text color */}
                    <ToolbarButton className="flex w-10 flex-col items-center justify-center gap-0.5">
                        <Icons.TextColorSymbol className="h-3.5 w-3.5" />
                        <div className="bg-foreground-primary h-[4px] w-6 rounded-full" />
                    </ToolbarButton>
                    {/* Align left */}
                    <ToolbarButton className="flex min-w-9 items-center justify-center">
                        {}
                        {React.createElement(
                            Icons.TextAlignLeft as unknown as React.FC<
                                React.SVGProps<SVGSVGElement>
                            >,
                            { className: 'h-4 w-4' } as any,
                        )}
                    </ToolbarButton>
                    {/* Advanced typography */}
                    <ToolbarButton className="flex min-w-9 items-center justify-center px-2">
                        <Icons.AdvancedTypography className="h-4 w-4" />
                    </ToolbarButton>
                    <InputSeparator />
                    <ToolbarButton className="flex min-w-9 items-center justify-center">
                        {React.createElement(
                            Icons.DotsHorizontal as unknown as React.FC<
                                React.SVGProps<SVGSVGElement>
                            >,
                            { className: 'h-4 w-4' } as any,
                        )}
                    </ToolbarButton>
                </div>
            </div>

            {/* Color panel mockup – left anchored. Intentionally can overflow viewport width */}
            <div className="border-foreground-primary/20 absolute top-18 left-5 z-30 w-[232px] overflow-hidden rounded-xl border bg-black/85 shadow-lg backdrop-blur-lg">
                {/* Tabs row */}
                <div className="flex items-center gap-1 px-2 pt-2">
                    <button className="text-foreground-secondary text-small hover:text-foreground-primary hover:text-foreground-primary rounded px-1 py-1">
                        Brand
                    </button>
                    <button className="text-foreground-primary text-small rounded px-1 py-1">
                        Custom
                    </button>
                    <button className="text-foreground-secondary text-small hover:text-foreground-primary hover:text-foreground-primary rounded px-1 py-1">
                        Gradient
                    </button>
                    <div className="ml-auto">
                        <button className="hover:bg-background-tertiary group rounded p-1">
                            <CloseIcon className="text-foreground-tertiary group-hover:text-foreground-primary h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="mt-0.5 px-1 pb-3">
                    <div className="flex flex-col gap-3">
                        {/* Color picker */}
                        {React.createElement(
                            ColorPicker as unknown as React.FC<{
                                color: Color;
                                onChange?: (color: Color) => void;
                                onChangeEnd?: (color: Color) => void;
                                onMouseDown?: (color: Color) => void;
                                className?: string;
                            }>,
                            {
                                color,
                                onChange: (c: Color) => setColor(c),
                                onChangeEnd: (c: Color) => setColor(c),
                                onMouseDown: (c: Color) => setColor(c),
                                className: 'bg-transparent',
                            },
                        )}
                        <div className="mt-3">
                            <ColorSwatchGroup label="bunker" colorClasses={bunkerSwatches} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

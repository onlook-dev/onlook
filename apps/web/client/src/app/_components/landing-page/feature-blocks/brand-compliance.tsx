"use client";

import React, { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";

import { Icons } from "@onlook/ui/icons";

import { ColorSwatchGroup } from "../color-swatch-group";

interface ParallaxContainerProps {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}

function ParallaxContainer({
  children,
  speed = 0.1,
  className,
}: ParallaxContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Map scroll progress (0 to 1) to transform values
  // When scroll is 0 (element entering from bottom), we want positive offset (pushed down)
  // When scroll is 1 (element exiting at top), we want negative offset (pulled up)
  // The multiplier 2000 is an approximation of the viewport height + element height range to match previous 'distanceFromCenter' logic roughly
  const yRange = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? [0, 0] : [500 * speed, -500 * speed]
  );

  const y = useSpring(yRange, {
    stiffness: 100,
    damping: 30,
    mass: 0.1,
  });

  return (
    <div ref={containerRef} className={className}>
      <motion.div style={{ y }} className="h-full w-full will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}

export function BrandComplianceBlock() {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-background-onlook/80 relative mb-6 h-100 w-full overflow-hidden rounded-lg">
        <ParallaxContainer speed={0.08} className="absolute inset-0">
          <div className="border-foreground-primary/20 absolute top-7 left-1/14 flex h-100 w-60 flex-col items-center justify-start overflow-hidden rounded-xl border-[0.5px] bg-black/85 backdrop-blur-2xl">
            <p className="text-foreground-primary text-regular border-foreground-primary/20 w-full border-b-[0.5px] px-3 py-2 text-left font-light">
              Brand Colors
            </p>
            <div className="flex h-full w-full flex-col gap-2 overflow-y-auto px-3 py-2">
              <ColorSwatchGroup
                label="Slate"
                colorClasses={[
                  "bg-slate-50",
                  "bg-slate-100",
                  "bg-slate-200",
                  "bg-slate-300",
                  "bg-slate-400",
                  "bg-slate-500",
                  "bg-slate-600",
                  "bg-slate-700",
                  "bg-slate-800",
                  "bg-slate-900",
                  "bg-slate-950",
                ]}
              />
              <ColorSwatchGroup
                label="Gray"
                colorClasses={[
                  "bg-gray-50",
                  "bg-gray-100",
                  "bg-gray-200",
                  "bg-gray-300",
                  "bg-gray-400",
                  "bg-gray-500",
                  "bg-gray-600",
                  "bg-gray-700",
                  "bg-gray-800",
                  "bg-gray-900",
                  "bg-gray-950",
                ]}
              />
              <ColorSwatchGroup
                label="Zinc"
                colorClasses={[
                  "bg-zinc-50",
                  "bg-zinc-100",
                  "bg-zinc-200",
                  "bg-zinc-300",
                  "bg-zinc-400",
                  "bg-zinc-500",
                  "bg-zinc-600",
                  "bg-zinc-700",
                  "bg-zinc-800",
                  "bg-zinc-900",
                  "bg-zinc-950",
                ]}
              />
              <ColorSwatchGroup
                label="Orange"
                colorClasses={[
                  "bg-orange-50",
                  "bg-orange-100",
                  "bg-orange-200",
                  "bg-orange-300",
                  "bg-orange-400",
                  "bg-orange-500",
                  "bg-orange-600",
                  "bg-orange-700",
                  "bg-orange-800",
                  "bg-orange-900",
                  "bg-orange-950",
                ]}
              />
              <ColorSwatchGroup
                label="Amber"
                colorClasses={[
                  "bg-amber-50",
                  "bg-amber-100",
                  "bg-amber-200",
                  "bg-amber-300",
                  "bg-amber-400",
                  "bg-amber-500",
                  "bg-amber-600",
                  "bg-amber-700",
                  "bg-amber-800",
                  "bg-amber-900",
                  "bg-amber-950",
                ]}
              />

              <ColorSwatchGroup
                label="Lime"
                colorClasses={[
                  "bg-lime-50",
                  "bg-lime-100",
                  "bg-lime-200",
                  "bg-lime-300",
                  "bg-lime-400",
                  "bg-lime-500",
                  "bg-lime-600",
                  "bg-lime-700",
                  "bg-lime-800",
                  "bg-lime-900",
                  "bg-lime-950",
                ]}
              />
              <ColorSwatchGroup
                label="Green"
                colorClasses={[
                  "bg-green-50",
                  "bg-green-100",
                  "bg-green-200",
                  "bg-green-300",
                  "bg-green-400",
                  "bg-green-500",
                  "bg-green-600",
                  "bg-green-700",
                  "bg-green-800",
                  "bg-green-900",
                  "bg-green-950",
                ]}
              />
            </div>
          </div>
        </ParallaxContainer>
        <ParallaxContainer speed={-0.08} className="absolute inset-0">
          <div className="border-foreground-primary/20 absolute top-20 right-1/14 flex h-100 w-60 flex-col items-center justify-start overflow-hidden rounded-xl border-[0.5px] bg-black/50 backdrop-blur-2xl">
            <p className="text-foreground-primary text-regular border-foreground-primary/20 w-full border-b-[0.5px] px-3 py-2 text-left font-light">
              Brand Colors
            </p>
            <div className="flex h-full w-full flex-col gap-2 overflow-y-auto px-3 py-2">
              <ColorSwatchGroup
                label="Cyan"
                colorClasses={[
                  "bg-cyan-50",
                  "bg-cyan-100",
                  "bg-cyan-200",
                  "bg-cyan-300",
                  "bg-cyan-400",
                  "bg-cyan-500",
                  "bg-cyan-600",
                  "bg-cyan-700",
                  "bg-cyan-800",
                  "bg-cyan-900",
                  "bg-cyan-950",
                ]}
              />
              <ColorSwatchGroup
                label="Blue"
                colorClasses={[
                  "bg-blue-50",
                  "bg-blue-100",
                  "bg-blue-200",
                  "bg-blue-300",
                  "bg-blue-400",
                  "bg-blue-500",
                  "bg-blue-600",
                  "bg-blue-700",
                  "bg-blue-800",
                  "bg-blue-900",
                  "bg-blue-950",
                ]}
              />
              <ColorSwatchGroup
                label="Indigo"
                colorClasses={[
                  "bg-indigo-50",
                  "bg-indigo-100",
                  "bg-indigo-200",
                  "bg-indigo-300",
                  "bg-indigo-400",
                  "bg-indigo-500",
                  "bg-indigo-600",
                  "bg-indigo-700",
                  "bg-indigo-800",
                  "bg-indigo-900",
                  "bg-indigo-950",
                ]}
              />
              <ColorSwatchGroup
                label="Violet"
                colorClasses={[
                  "bg-violet-50",
                  "bg-violet-100",
                  "bg-violet-200",
                  "bg-violet-300",
                  "bg-violet-400",
                  "bg-violet-500",
                  "bg-violet-600",
                  "bg-violet-700",
                  "bg-violet-800",
                  "bg-violet-900",
                  "bg-violet-950",
                ]}
              />
              <ColorSwatchGroup
                label="Purple"
                colorClasses={[
                  "bg-purple-50",
                  "bg-purple-100",
                  "bg-purple-200",
                  "bg-purple-300",
                  "bg-purple-400",
                  "bg-purple-500",
                  "bg-purple-600",
                  "bg-purple-700",
                  "bg-purple-800",
                  "bg-purple-900",
                  "bg-purple-950",
                ]}
              />
              <ColorSwatchGroup
                label="Pink"
                colorClasses={[
                  "bg-pink-50",
                  "bg-pink-100",
                  "bg-pink-200",
                  "bg-pink-300",
                  "bg-pink-400",
                  "bg-pink-500",
                  "bg-pink-600",
                  "bg-pink-700",
                  "bg-pink-800",
                  "bg-pink-900",
                  "bg-pink-950",
                ]}
              />
              <ColorSwatchGroup
                label="Rose"
                colorClasses={[
                  "bg-rose-50",
                  "bg-rose-100",
                  "bg-rose-200",
                  "bg-rose-300",
                  "bg-rose-400",
                  "bg-rose-500",
                  "bg-rose-600",
                  "bg-rose-700",
                  "bg-rose-800",
                  "bg-rose-900",
                  "bg-rose-950",
                ]}
              />
            </div>
          </div>
        </ParallaxContainer>
      </div>
      <div className="flex w-full flex-row items-start gap-8">
        {/* Icon + Title */}
        <div className="flex w-1/2 flex-col items-start">
          <div className="mb-2">
            <Icons.Brand className="text-foreground-primary h-6 w-6" />
          </div>
          <span className="text-foreground-primary text-largePlus font-light">
            Brand compliance
          </span>
        </div>
        {/* Description */}
        <p className="text-foreground-secondary text-regular w-1/2 text-balance">
          Make your fonts, colors, and styles all speak the same language.
        </p>
      </div>
    </div>
  );
}

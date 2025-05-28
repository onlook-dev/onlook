'use client';

import { Icons } from '@onlook/ui/icons/index';
import React from 'react';
import { ButtonLink } from './_components/button-link';
import { Hero } from './_components/hero';
import { ContributorSection } from './_components/landing-page/ContributorSection';
import { Footer } from './_components/landing-page/Footer';
import { TopBar } from './_components/top-bar';
import { Button } from '@onlook/ui/button';;
import { FAQDropdown } from './_components/landing-page/FAQDropdown';
import { TestimonialCard } from './_components/landing-page/TestimonialCard';
import { cn } from '@onlook/ui/utils';
import { NodeIcon } from './project/[id]/_components/left-panel/layers-tab/tree/node-icon';
import { CodeOneToOneSection } from './_components/landing-page/CodeOneToOneSection';
import { FeaturesSection } from './_components/landing-page/FeaturesSection';
import { TestimonialsSection } from './_components/landing-page/TestimonialsSection';
import { WhatCanOnlookDoSection } from './_components/landing-page/WhatCanOnlookDoSection';
import { CTASection } from './_components/landing-page/CTASection';
import { FAQSection } from './_components/landing-page/FAQSection';

// Mock data for layers
const mockLayers = [
  { id: '1', name: 'Overview', tagName: 'SECTION', selected: true },
  { id: '2', name: 'Client Logo', tagName: 'IMG', selected: false },
  { id: '3', name: 'Component', tagName: 'COMPONENT', selected: false },
  { id: '4', name: 'Share', tagName: 'BUTTON', selected: false },
  { id: '5', name: 'New project', tagName: 'BUTTON', selected: false },
  { id: '6', name: 'Projects section', tagName: 'SECTION', selected: false },
  { id: '7', name: 'Controls', tagName: 'DIV', selected: false },
  { id: '8', name: 'Filter', tagName: 'INPUT', selected: false },
];

function MockLayersTab() {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string>('1');

  return (
    <div className="w-72 bg-background/80 rounded-lg shadow-lg p-2 overflow-hidden border border-border max-h-96 flex flex-col gap-1">
      <div className="flex flex-col gap-1.5">
        {mockLayers.map((layer) => (
          <div
            key={layer.id}
            className={cn(
              'flex items-center h-7 px-2 rounded cursor-pointer transition-colors select-none text-regular',
              selectedId === layer.id
                ? 'bg-red-500 text-foreground-primary'
                : hoveredId === layer.id
                ? 'bg-background-onlook text-foreground-primary'
                : 'text-foreground-secondary',
            )}
            onMouseEnter={() => setHoveredId(layer.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => setSelectedId(layer.id)}
            style={{ userSelect: 'none' }}
          >
            <NodeIcon iconClass="w-4 h-4 mr-2" tagName={layer.tagName} />
            <span className="truncate">{layer.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Main() {
    const faqs = [
        {
            question: 'What kinds of things can I design with Onlook?',
            answer: 'You can prototype, ideate, and create websites from scratch with Onlook',
        },
        {
            question: 'Why would I use Onlook?',
            answer: 'When you design in Onlook you design in the real product – in other words, the source of truth. Other products are great for ideating, but Onlook is the only one that lets you design with the existing product and the only one that translates your designs to code instantly.',
        },
        {
            question: 'Who owns the code that I write with Onlook?',
            answer: "The code you make with Onlook is all yours. Your code is written locally directly to your files, and isn't hosted off your device.",
        },
    ];
    const [openIndex, setOpenIndex] = React.useState<number | null>(null);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center relative overflow-x-hidden">
            <div className="fixed top-0 left-0 w-full h-12 bg-background/80 backdrop-blur-sm z-50">
                <TopBar />
            </div>
            <div className="w-screen h-screen flex items-center justify-center">
                <Hero />
            </div>

            {/* <FeaturesSection /> */}
            {/* <CodeOneToOneSection /> */}
            {/* <TestimonialsSection /> */}
            {/* <CTASection /> */}
            <ContributorSection />
            {/* <FAQSection /> */}
            {/* <WhatCanOnlookDoSection /> */}
            <Footer />
        </div>
    );
}

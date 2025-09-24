import React from 'react';

import { Icons } from '@onlook/ui/icons';

import { Routes } from '@/utils/constants';
import { ButtonLink } from '../button-link';
import { FAQDropdown } from './faq-dropdown';

interface FAQ {
    question: string;
    answer: string;
}

interface FAQSectionProps {
    faqs?: FAQ[];
    title?: string;
    buttonText?: string;
    buttonHref?: string;
    className?: string;
}

const defaultFaqs = [
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
    {
        question: 'What is the difference between Onlook and other design tools?',
        answer: 'Onlook is a visual editor for code. It allows you to create and style your own creations with code as the source of truth. While it is best suited for creating websites, it can be used for anything visual – presentations, mockups, and more. Because Onlook uses code as the source of truth, the types of designs you can create are unconstrained by Onlook interface.',
    },
    {
        question: 'Why is Onlook open-source?',
        answer: 'Developers have historically been second-rate citizens in the design process. Onlook was founded to bridge the divide between design and development, and we wanted to make developers first-class citizens alongside designers. We chose to be open-source to give developers transparency into how we are building Onlook and how the work created through Onlook will complement the work of developers.',
    },
];

export function FAQSection({
    faqs = defaultFaqs,
    title = 'Frequently\nasked questions',
    buttonText = 'Read our FAQs',
    buttonHref = Routes.FAQ,
    className = '',
}: FAQSectionProps) {
    return (
        <div className={`bg-background-onlook/80 w-full px-8 py-48 ${className}`} id="faq">
            <div className="mx-auto flex max-w-6xl flex-col items-start gap-24 md:flex-row md:gap-12">
                <div className="flex flex-1 flex-col items-start">
                    <h3 className="text-foreground-primary mt-4 mb-12 max-w-3xl text-5xl leading-[1.1] font-light text-balance md:text-6xl">
                        {title.split('\n').map((line, index) => (
                            <React.Fragment key={index}>
                                {line}
                                {index < title.split('\n').length - 1 && <br />}
                            </React.Fragment>
                        ))}
                    </h3>
                    <ButtonLink
                        href={buttonHref}
                        rightIcon={<Icons.ArrowRight className="h-5 w-5" />}
                    >
                        {buttonText}
                    </ButtonLink>
                </div>
                <div className="flex flex-1 flex-col gap-6">
                    <FAQDropdown faqs={faqs} />
                </div>
            </div>
        </div>
    );
}

import React from 'react';
import { Routes } from '@/utils/constants';
import { Icons } from '@onlook/ui/icons';
import { ButtonLink } from '../button-link';
import { FAQDropdown } from './faq-dropdown';

const featuresFaqs = [
    {
        question: 'What is Onlook?',
        answer: 'Onlook is an open-source, visual editor for websites. It allows anyone to create and style their own websites without any coding knowledge.',
    },
    {
        question: 'What can I use Onlook to do?',
        answer: 'Onlook is great for creating websites, prototypes, user interfaces, and designs. Whether you need a quick mockup or a full-fledged website, ask Onlook to craft it for you.',
    },
    {
        question: 'How do I get started?',
        answer: 'Getting started with Onlook is easy. Simply sign up for an account, create a new project, and follow our step-by-step guide to deploy your first application.',
    },
    {
        question: 'Is Onlook free to use?',
        answer: 'Onlook is free for your first prompt, but you are limited by the number of messages you can send. Please see our Pricing page for more details.',
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

export function FeaturesFAQSection() {
    return (
        <div className="w-full py-48 px-8 bg-background-onlook/80" id="faq">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start gap-24 md:gap-12">
                <div className="flex-1 flex flex-col items-start">
                    <h2 className="text-foreground-primary text-2xl md:text-4xl leading-[1.1] font-light mb-12 mt-4 max-w-3xl">
                        Frequently<br />asked questions
                    </h2>
                    <ButtonLink href={Routes.FAQ} rightIcon={<Icons.ArrowRight className="w-5 h-5" />}>Read our FAQs</ButtonLink>
                </div>
                <div className="flex-1 flex flex-col gap-6">
                    <FAQDropdown faqs={featuresFaqs} />
                </div>
            </div>
        </div>
    );
}

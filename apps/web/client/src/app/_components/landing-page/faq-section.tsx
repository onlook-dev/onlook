import { Routes } from '@/utils/constants';
import { Icons } from '@onlook/ui/icons';
import React from 'react';
import { ButtonLink } from '../button-link';
import { FAQDropdown } from './faq-dropdown';

interface FAQ {
    question: string;
    answer: string | React.ReactNode;
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
        question: 'Is there a free version of Onlook?',
        answer: 'Yes, Onlook can be self-hosted for free on GitHub. For the hosted cloud version, please contact our team or book a demo. We are working closely with teams to set up the best internal design and code workflow, and are happy to help you get started.',
    },
    {
        question: 'What kinds of things can I design with Onlook?',
        answer: 'You can prototype, ideate, and create websites from scratch with Onlook',
    },
    {
        question: 'Why would I use Onlook?',
        answer: 'When you design in Onlook you design in the real product – in other words, the source of truth. Other editors are great for ideating, but Onlook is the only one that lets you design with code using your existing design system instantly.',
    },
    {
        question: 'Who owns the code that I write with Onlook?',
        answer: "The code you make with Onlook is all yours. You can export it on your local machine, publish it to GitHub, or host it at a link",
    },
    {
        question: 'What is the difference between Onlook and other design tools?',
        answer: 'Onlook is a visual editor for code. It allows you to create and style your own creations with code as the source of truth. While it is best suited for creating web experiences, it can be used for anything visual – presentations, mockups, and more. Because Onlook uses code as the source of truth, the types of designs you can create are unconstrained by Onlook\'s interface.',
    },
    {
        question: 'Why is Onlook open-source?',
        answer: 'Developers have historically been second-rate citizens in the design process. Onlook was founded to bridge the divide between design and development, and we wanted to make developers first-class citizens alongside designers. We chose to be open-source Onlook to give developers transparency over the tool, and make it as flexible as possible for the unique ways teams set up their code.',
    },
];

export function FAQSection({
    faqs = defaultFaqs,
    title = "Frequently\nasked questions",
    buttonText = "Read our FAQs",
    buttonHref = Routes.FAQ,
    className = ""
}: FAQSectionProps) {
    return (
        <div className={`w-full py-48 px-8 bg-background-onlook/80 ${className}`} id="faq">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start gap-24 md:gap-12">
                <div className="flex-1 flex flex-col items-start">
                    <h3 className="text-foreground-primary text-5xl md:text-6xl leading-[1.1] font-light mb-12 mt-4 max-w-3xl text-balance">
                        {title.split('\n').map((line, index) => (
                            <React.Fragment key={index}>
                                {line}
                                {index < title.split('\n').length - 1 && <br />}
                            </React.Fragment>
                        ))}
                    </h3>
                    <ButtonLink href={buttonHref} rightIcon={<Icons.ArrowRight className="w-5 h-5" />}>{buttonText}</ButtonLink>
                </div>
                <div className="flex-1 flex flex-col gap-6">
                    <FAQDropdown faqs={faqs} />
                </div>
            </div>
        </div>
    );
}    

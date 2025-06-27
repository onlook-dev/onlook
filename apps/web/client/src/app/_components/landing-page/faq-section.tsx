import { Routes } from '@/utils/constants';
import { Icons } from '@onlook/ui/icons';
import { ButtonLink } from '../button-link';
import { FAQDropdown } from './faq-dropdown';

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

export function FAQSection() {
    return (
        <div className="w-full py-48 px-8 bg-background-onlook/80" id="faq">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start gap-24 md:gap-12">
                <div className="flex-1 flex flex-col items-start">
                    <h2 className="text-foreground-primary text-6xl leading-[1.1] font-light mb-12 mt-4 max-w-3xl">
                        Frequently<br />asked questions
                    </h2>
                    <ButtonLink href={Routes.FAQ} rightIcon={<Icons.ArrowRight className="w-5 h-5" />}>Read our FAQs</ButtonLink>
                </div>
                <div className="flex-1 flex flex-col gap-6">
                    <FAQDropdown faqs={faqs} />
                </div>
            </div>
        </div>
    );
} 
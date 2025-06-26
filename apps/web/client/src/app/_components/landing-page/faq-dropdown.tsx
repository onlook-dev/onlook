import { Icons } from '@onlook/ui/icons';
import { useState } from 'react';

interface FAQ {
    question: string;
    answer: string;
}

interface FAQDropdownProps {
    faqs: FAQ[];
}

export function FAQDropdown({ faqs }: FAQDropdownProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="flex flex-col gap-1 w-full">
            {faqs.map((faq, idx) => (
                <div
                    key={faq.question}
                    className="px-0 py-6"
                >
                    <button
                        className="flex items-center justify-between w-full text-left text-foreground-primary text-lg focus:outline-none cursor-pointer py-2"
                        onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                        aria-expanded={openIndex === idx}
                    >
                        <span>{faq.question}</span>
                        <span className="ml-4 flex items-center">
                            {openIndex === idx ? (
                                <Icons.Minus className="w-6 h-6 text-foreground-primary transition-transform duration-200" />
                            ) : (
                                <Icons.Plus className="w-6 h-6 text-foreground-primary transition-transform duration-200" />
                            )}
                        </span>
                    </button>
                    <div
                        className={`overflow-hidden transition-all duration-300 ${openIndex === idx ? 'mt-4 opacity-100' : 'max-h-0 opacity-0'}`}
                        style={{ pointerEvents: openIndex === idx ? 'auto' : 'none' }}
                    >
                        <p className="text-foreground-secondary text-regular leading-relaxed">{faq.answer}</p>
                    </div>
                </div>
            ))}
        </div>
    );
} 
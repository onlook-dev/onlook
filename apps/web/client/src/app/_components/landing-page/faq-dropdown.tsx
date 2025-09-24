import { useState } from 'react';

import { Icons } from '@onlook/ui/icons';

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
        <div className="flex w-full flex-col gap-1">
            {faqs.map((faq, idx) => (
                <div key={faq.question} className="px-0 py-6">
                    <button
                        className="text-foreground-primary flex w-full cursor-pointer items-center justify-between py-2 text-left text-lg focus:outline-none"
                        onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                        aria-expanded={openIndex === idx}
                    >
                        <span>{faq.question}</span>
                        <span className="ml-4 flex items-center">
                            {openIndex === idx ? (
                                <Icons.Minus className="text-foreground-primary h-6 w-6 transition-transform duration-200" />
                            ) : (
                                <Icons.Plus className="text-foreground-primary h-6 w-6 transition-transform duration-200" />
                            )}
                        </span>
                    </button>
                    <div
                        className={`overflow-hidden transition-all duration-300 ${openIndex === idx ? 'mt-4 opacity-100' : 'max-h-0 opacity-0'}`}
                        style={{ pointerEvents: openIndex === idx ? 'auto' : 'none' }}
                    >
                        <p className="text-foreground-secondary text-regular leading-relaxed">
                            {faq.answer}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

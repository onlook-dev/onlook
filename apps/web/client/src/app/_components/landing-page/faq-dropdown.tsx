import { Icons } from '@onlook/ui/icons';
import { useState, useRef, useEffect } from 'react';

interface FAQ {
    question: string;
    answer: string | React.ReactNode;
}

interface FAQDropdownProps {
    faqs: FAQ[];
}

function FAQItem({ faq, isOpen, onToggle }: { faq: FAQ; isOpen: boolean; onToggle: () => void }) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(0);

    useEffect(() => {
        if (contentRef.current) {
            setHeight(contentRef.current.scrollHeight);
        }
    }, [faq.answer]);

    return (
        <div className="px-0 py-6">
            <button
                className="flex items-center justify-between w-full text-left text-foreground-primary text-lg focus:outline-none cursor-pointer py-2"
                onClick={onToggle}
                aria-expanded={isOpen}
            >
                <span>{faq.question}</span>
                <span className="ml-4 flex items-center justify-center w-6 h-6 relative">
                    {/* Horizontal line (always visible) */}
                    <span className="absolute w-3 h-0.5 bg-foreground-primary rounded-full" />
                    {/* Vertical line (rotates to horizontal when open) */}
                    <span
                        className={`absolute w-3 h-0.5 bg-foreground-primary rounded-full transition-transform duration-300 ${
                            isOpen ? 'rotate-0' : 'rotate-90'
                        }`}
                    />
                </span>
            </button>
            <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                    maxHeight: isOpen ? `${height}px` : '0px',
                    opacity: isOpen ? 1 : 0,
                    marginTop: isOpen ? '16px' : '0px',
                }}
            >
                <div ref={contentRef}>
                    <p className="text-foreground-secondary text-regular leading-relaxed">{faq.answer}</p>
                </div>
            </div>
        </div>
    );
}

export function FAQDropdown({ faqs }: FAQDropdownProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="flex flex-col gap-1 w-full">
            {faqs.map((faq, idx) => (
                <FAQItem
                    key={faq.question}
                    faq={faq}
                    isOpen={openIndex === idx}
                    onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
                />
            ))}
        </div>
    );
} 
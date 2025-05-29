import { CODE_FENCE } from '../format';

const user1 = 'Create beautiful landing page with minimalist UI';
export const assistant1 = `${CODE_FENCE.start}
'use client';

import { useState, useEffect } from 'react';

export default function Page() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <div className="min-h-screen bg-white text-gray-800 font-light">
            <nav className="py-6 px-8 flex justify-between items-center border-b border-gray-100">
                <div className="text-xl font-medium tracking-tight">Example</div>
                <button className="px-4 py-2 border border-gray-200 rounded-full text-sm hover:bg-gray-50 transition-colors">
                    Sign Up
                </button>
            </nav>

            <main className="max-w-5xl mx-auto px-8 py-24">
                <div>
                    <h1 className="text-5xl md:text-7xl font-light leading-tight mb-6">
                        Simple design for <br />
                        <span className="text-gray-400">complex ideas</span>
                    </h1>

                    <p className="text-xl text-gray-500 max-w-xl mb-12">
                        Embrace the power of minimalism. Create stunning experiences with less
                        visual noise and more meaningful interactions.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button className="px-8 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors">
                            Get Started
                        </button>
                        <button className="px-8 py-3 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                            Learn More
                        </button>
                    </div>
                </div>
            </main>

            <footer className="border-t border-gray-100 py-12 px-8">
                Contact us at <a href="mailto:support@example.com">support@example.com</a>
            </footer>
        </div>
    );
}
${CODE_FENCE.end}`;

export const CREATE_PAGE_EXAMPLE_CONVERSATION = [
    {
        role: 'user',
        content: user1,
    },
    {
        role: 'assistant',
        content: assistant1,
    },
];

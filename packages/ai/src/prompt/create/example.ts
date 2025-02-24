const user1 = 'Create beautiful landing page with minimalist UI';
export const assistant1 = `'use client';

import { useState, useEffect } from 'react';

export default function Page() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <div className="min-h-screen bg-white text-gray-800 font-light">
            <nav className="py-6 px-8 flex justify-between items-center border-b border-gray-100">
                <div className="text-xl font-medium tracking-tight">minimø</div>
                <div className="hidden md:flex space-x-8">
                    <a href="#" className="hover:text-gray-500 transition-colors">
                        About
                    </a>
                    <a href="#" className="hover:text-gray-500 transition-colors">
                        Features
                    </a>
                    <a href="#" className="hover:text-gray-500 transition-colors">
                        Pricing
                    </a>
                    <a href="#" className="hover:text-gray-500 transition-colors">
                        Contact
                    </a>
                </div>
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

            <div className="max-w-6xl mx-auto px-8 py-24">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="p-6 border border-gray-100 rounded-lg hover:shadow-sm transition-shadow">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-xl mb-3">Fast & Efficient</h3>
                        <p className="text-gray-500">
                            Optimized for speed and performance, ensuring a smooth experience for
                            your users.
                        </p>
                    </div>

                    <div className="p-6 border border-gray-100 rounded-lg hover:shadow-sm transition-shadow">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                                />
                            </svg>
                        </div>
                        <h3 className="text-xl mb-3">Beautiful Design</h3>
                        <p className="text-gray-500">
                            Carefully crafted interfaces that focus on what matters most to your
                            audience.
                        </p>
                    </div>

                    <div className="p-6 border border-gray-100 rounded-lg hover:shadow-sm transition-shadow">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-xl mb-3">Secure & Reliable</h3>
                        <p className="text-gray-500">
                            Built with security in mind, ensuring your data is protected at all
                            times.
                        </p>
                    </div>
                </div>
            </div>

            <footer className="border-t border-gray-100 py-12 px-8">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <div className="text-xl font-medium tracking-tight mb-4">minimø</div>
                        <p className="text-gray-500 text-sm">
                            Simplicity is the ultimate sophistication.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-medium mb-4">Product</h4>
                        <div className="space-y-2 text-sm text-gray-500">
                            <p>
                                <a href="#" className="hover:text-gray-800 transition-colors">
                                    Features
                                </a>
                            </p>
                            <p>
                                <a href="#" className="hover:text-gray-800 transition-colors">
                                    Pricing
                                </a>
                            </p>
                            <p>
                                <a href="#" className="hover:text-gray-800 transition-colors">
                                    FAQ
                                </a>
                            </p>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-medium mb-4">Company</h4>
                        <div className="space-y-2 text-sm text-gray-500">
                            <p>
                                <a href="#" className="hover:text-gray-800 transition-colors">
                                    About
                                </a>
                            </p>
                            <p>
                                <a href="#" className="hover:text-gray-800 transition-colors">
                                    Blog
                                </a>
                            </p>
                            <p>
                                <a href="#" className="hover:text-gray-800 transition-colors">
                                    Careers
                                </a>
                            </p>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-medium mb-4">Connect</h4>
                        <div className="space-y-2 text-sm text-gray-500">
                            <p>
                                <a href="#" className="hover:text-gray-800 transition-colors">
                                    Twitter
                                </a>
                            </p>
                            <p>
                                <a href="#" className="hover:text-gray-800 transition-colors">
                                    Instagram
                                </a>
                            </p>
                            <p>
                                <a href="#" className="hover:text-gray-800 transition-colors">
                                    LinkedIn
                                </a>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-gray-100 text-sm text-gray-400 flex flex-col md:flex-row justify-between">
                    <p>© 2023 minimø. All rights reserved.</p>
                    <div className="space-x-6 mt-4 md:mt-0">
                        <a href="#" className="hover:text-gray-600 transition-colors">
                            Privacy Policy
                        </a>
                        <a href="#" className="hover:text-gray-600 transition-colors">
                            Terms of Service
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

`;

export const EXAMPLE_CONVERSATION = [
    {
        role: 'user',
        content: user1,
    },
    {
        role: 'assistant',
        content: assistant1,
    },
];

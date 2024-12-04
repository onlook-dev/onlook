import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
    return (
        <header className="bg-blue-600 text-white p-4">
            <nav className="container mx-auto flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold">
                    My App
                </Link>
                <div className="md:hidden">
                    <button className="text-white focus:outline-none">
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </div>
                <ul className="hidden md:flex md:space-x-4">
                    <li>
                        <Link
                            to="/"
                            className="hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium"
                        >
                            Home
                        </Link>
                    </li>
                    <li>
                        <Link
                            to="/about"
                            className="hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium"
                        >
                            About
                        </Link>
                    </li>
                    <li>
                        <Link
                            to="/contact"
                            className="hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium"
                        >
                            Contact
                        </Link>
                    </li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;

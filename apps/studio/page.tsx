import { useState } from 'react';

export default function Page() {
    const [darkMode, setDarkMode] = useState(false);

    return (
        <div
            className={`w-full min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-white'} relative overflow-hidden`}
        >
            <button
                onClick={() => setDarkMode(!darkMode)}
                className="absolute top-4 right-4 p-2 bg-gray-200 dark:bg-gray-800 rounded-full focus:outline-none"
            >
                {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            <div
                className={`text-center ${darkMode ? 'text-white' : 'text-gray-900'} p-8 relative z-10`}
            >
                <h1 className="text-5xl font-semibold mb-4 tracking-tight">Welcome to your app</h1>
                <p className={`text-2xl ${darkMode ? 'text-gray-300' : 'text-gray-800'} mb-8`}>
                    Open this page in Onlook to start
                </p>
            </div>
        </div>
    );
}

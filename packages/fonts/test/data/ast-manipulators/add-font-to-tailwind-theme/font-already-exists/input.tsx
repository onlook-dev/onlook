import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                inter: ['var(--font-inter)', 'sans-serif'],
                roboto: ['var(--font-roboto)', 'sans-serif'],
            },
        },
    },
    plugins: [],
};

export default config;

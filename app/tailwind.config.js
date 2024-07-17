/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    prefix: '',
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px',
            },
        },
        extend: {
            colors: {
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },

                /*--- TOKENS –--*/
                bg: {
                    active: 'var(--bg-tertiary)',
                    brand: {
                        DEFAULT: 'var(--color-teal-200)',
                        secondary: 'var(--color-teal-400)',
                    },
                    DEFAULT: 'var(--color-gray-1000)',
                    disabled: 'var(--color-gray-1000)',
                    hover: 'var(--bg-secondary)',
                    'new-active': 'var(--color-blue-800)',
                    'new-default': 'var(--color-blue-1000)',
                    positive: 'var(--color-green-800)',
                    primary: 'var(--color-gray-1000)',
                    secondary: 'var(--color-gray-900)',
                    tertiary: 'var(--color-gray-800)',
                    'toolbar-base': 'var(--color-black-85)',
                },
                text: {
                    active: 'var(--text-primary)',
                    brand: 'var(--color-red)',
                    DEFAULT: 'var(--text-secondary)',
                    disabled: 'var(--text-quadranary)',
                    'new-active': 'var(--color-blue-100)',
                    'new-default': 'var(--color-blue-300)',
                    positive: 'var(--color-green-200)',
                    primary: 'var(--color-gray-100)',
                    quadranary: 'var(--color-gray-600)',
                    secondary: 'var(--color-gray-300)',
                    tertiary: 'var(--color-gray-400)',
                },
                icon: {
                    active: 'var(--text-active)',
                    DEFAULT: 'var(--text-tertiary)',
                    disabled: 'var(--text-disabled)',
                    hover: 'var(--text-active)',
                },
                border: {
                    active: 'var(--color-gray-500)',
                    DEFAULT: 'var(--color-gray-700)',
                    hover: 'var(--color-gray-600)',
                    'new-active': 'var(--color-blue-500)',
                    'new-default': 'var(--color-blue-700)',
                    'new-hover': 'var(--color-blue-600)',
                },

                /*--- PRIMITIVES –--*/
                amber: '#ff8020', //to be extended
                black: { 
                    DEFAULT: '#000000',
                    30: '#0000004d',
                    60: '#00000099',
                    85: '#000000d9',
                },
                purple: '#6c33ff', //to be extended
                red: { //to be extended
                    DEFAULT: '#ea364e',
                    20: '#ea364e33',
                },
                gray: {
                    100: '#ffffff',
                    200: '#c7c7c7',
                    300: '#acacac',
                    400: '#929292',
                    500: '#787878',
                    600: '#606060',
                    700: '#494949',
                    800: '#333333',
                    900: '#1f1f1f',
                    1000: '#1a1a1a',
                },
                blue: {
                    100: '#e3f3ff',
                    200: '#90d1ff',
                    300: '#53b8ff',
                    400: '#109bff',
                    500: '#0081de',
                    600: '#006ab5',
                    700: '#00538f',
                    800: '#003e69',
                    900: '#002a48',
                    1000: '#001b2e',
                },
                teal: {
                    100: '#cbfff6',
                    200: '#00deba',
                    300: '#00c1a2',
                    400: '#00a68b',
                    500: '#008b74',
                    600: '#00715e',
                    700: '#005849',
                    800: '#004036',
                    900: '#002a23',
                    1000: '#00211c',
                },
                yellow: {
                    100: '#fff0bc',
                    200: '#f6c100',
                    300: '#d7a800',
                    400: '#b99000',
                    500: '#9b7900',
                    600: '#7f6300',
                    700: '#644e00',
                    800: '#493900',
                    900: '#312600',
                    1000: '#211a00',
                },
                green: {
                    100: '#d8ffe5',
                    200: '#00e14b',
                    300: '#00c441',
                    400: '#00a838',
                    500: '#008c2f',
                    600: '#007226',
                    700: '#00591e',
                    800: '#004116',
                    900: '#002a0e',
                    1000: '#00240c',
                },
            },

            /*--- TYPOGRAPHY –--*/
            fontSize: { //to be aliased to be more legible and in-line with Tailwind Styles
                title1: ['2.25rem', {
                    lineHeight: 'normal',
                    fontWeight: 'normal',
                }],
                title2: ['1rem', {
                    lineHeight: 'normal',
                    fontWeight: 'normal',
                }],
                title3: ['1rem', {
                    lineHeight: 'normal',
                    fontWeight: 'normal',
                }],
                largePlus: ['1rem', {
                    lineHeight: '8.75',
                    fontWeight: '500',
                }],
                large: ['1rem', {
                    lineHeight: '8.75',
                    fontWeight: 'normal',
                }],
                regularPlus: ['0.9375rem', {
                    lineHeight: '8.75',
                    fontWeight: '500',
                }],
                regular: ['0.9375rem', {
                    lineHeight: '8.75',
                    fontWeight: 'normal',
                }],
                smallPlus: ['0.8125rem', {
                    lineHeight: '8.75',
                    fontWeight: '500',
                }],
                small: ['0.8125rem', {
                    lineHeight: '8.75',
                    fontWeight: 'normal',
                }],
                miniPlus: ['1rem', {
                    lineHeight: 'normal',
                    fontWeight: '500',
                }],
                mini: ['1rem', {
                    lineHeight: 'normal',
                    fontWeight: 'normal',
                }],
                microPlus: ['0.6875rem', {
                    lineHeight: 'normal',
                    fontWeight: '500',
                }],
                micro: ['0.6875rem', {
                    lineHeight: 'normal',
                    fontWeight: 'normal',
                }],
            },

            /*--- NUMERIC VALUES –--*/
            borderRadius: { 
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },

            
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
};

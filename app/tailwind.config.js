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
                        DEFAULT: 'var(--color-red)',
                        secondary: 'var(--color-red-20)',
                    },
                    default: 'var(--color-gray-100)',
                    disabled: 'var(--color-gray-100)',
                    hover: 'var(--bg-secondary)',
                    'new-active': 'var(--color-blue-300)',
                    'new-default': 'var(--color-blue-100)',
                    positive: 'var(--color-green-300)',
                    primary: 'var(--color-gray-100)',
                    secondary: 'var(--color-gray-200)',
                    tertiary: 'var(--color-gray-300)',
                    'toolbar-base': 'var(--color-black-85)',
                },
                text: {
                    active: 'var(--text-primary)',
                    brand: 'var(--color-red)',
                    default: 'var(--text-secondary)',
                    disabled: 'var(--text-quadranary)',
                    'new-active': 'var(--color-blue-1000)',
                    'new-default': 'var(--color-blue-700)',
                    positive: 'var(--color-green-700)',
                    primary: 'var(--color-gray-1000)',
                    quadranary: 'var(--color-gray-500)',
                    secondary: 'var(--color-gray-900)',
                    tertiary: 'var(--color-gray-800)',
                },
                icon: {
                    active: 'var(--text-active)',
                    default: 'var(--text-tertiary)',
                    disabled: 'var(--text-disabled)',
                    hover: 'var(--text-active)',
                },
                border: {
                    active: 'var(--color-gray-600)',
                    default: 'var(--color-gray-400)',
                    hover: 'var(--color-gray-500)',
                    'new-active': 'var(--color-blue-600)',
                    'new-default': 'var(--color-blue-400)',
                    'new-hover': 'var(--color-blue-500)',
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
                blue: {
                    100: '#001b2e',
                    200: '#002a48',
                    300: '#003e69',
                    400: '#00538f',
                    500: '#006ab5',
                    600: '#0081de',
                    700: '#90d1ff',
                    800: '#109bff',
                    900: '#53b8ff',
                    1000: '#e3f3ff',
                },
                gray: {
                    100: '#1a1a1a',
                    200: '#1f1f1f',
                    300: '#333333',
                    400: '#494949',
                    500: '#606060',
                    600: '#787878',
                    700: '#c7c7c7',
                    800: '#929292',
                    900: '#acacac',
                    1000: '#ffffff',
                },
                green: {
                    100: '#00240c',
                    200: '#002a0e',
                    300: '#004116',
                    400: '#00591e',
                    500: '#007226',
                    600: '#008c2f',
                    700: '#00e14b',
                    800: '#00a838',
                    900: '#00c441',
                    1000: '#d8ffe5',
                },
                teal: {
                    100: '#00211c',
                    200: '#002a23',
                    300: '#004036',
                    400: '#005849',
                    500: '#00715e',
                    600: '#008b74',
                    700: '#00deba',
                    800: '#00a68b',
                    900: '#00c1a2',
                    1000: '#cbfff6',
                },
                yellow: {
                    100: '#211a00',
                    200: '#312600',
                    300: '#493900',
                    400: '#644e00',
                    500: '#7f6300',
                    600: '#9b7900',
                    700: '#f6c100',
                    800: '#b99000',
                    900: '#d7a800',
                    1000: '#fff0bc',
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
            borderRadius: { //to be consolidated
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
                'x-small': '2px',
                small: '4px', 
                medium: '6px',
                large: '8px',
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

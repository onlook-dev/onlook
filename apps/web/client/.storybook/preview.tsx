import type { Preview } from '@storybook/nextjs-vite'
import '@onlook/ui/globals.css'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { ThemeProvider } from 'next-themes'
import messages from '../messages/en.json'
import { TRPCReactProvider } from './mocks/trpc-react'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute="class"
        forcedTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <TRPCReactProvider>
          <NextIntlClientProvider locale="en" messages={messages}>
            <div className={inter.variable}>
              <Story />
            </div>
          </NextIntlClientProvider>
        </TRPCReactProvider>
      </ThemeProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;
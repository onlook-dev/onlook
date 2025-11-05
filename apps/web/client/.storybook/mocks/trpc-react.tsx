'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import { useState } from 'react';

/**
 * Mock tRPC client for Storybook
 *
 * This mock provides a functional tRPC context without making real API calls.
 * It prevents the import chain: AppRouter → subscriptionRouter/usageRouter → @onlook/stripe → dotenv.config()
 *
 * The mock client uses a dummy HTTP link that will never be called in Storybook
 * since we don't actually trigger mutations/queries in stories.
 */

// Create a minimal mock AppRouter type to avoid importing real routers
type MockAppRouter = Record<string, any>;

export const api = createTRPCReact<MockAppRouter>();

// Mock type exports to satisfy TypeScript
export type RouterInputs = Record<string, any>;
export type RouterOutputs = Record<string, any>;

// Create QueryClient singleton for Storybook
let queryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
    if (!queryClientSingleton) {
        queryClientSingleton = new QueryClient({
            defaultOptions: {
                queries: {
                    staleTime: 60 * 1000,
                    retry: false,
                },
            },
        });
    }
    return queryClientSingleton;
};

export function TRPCReactProvider(props: { children: React.ReactNode }) {
    const queryClient = getQueryClient();

    const [trpcClient] = useState(() =>
        api.createClient({
            links: [
                httpBatchLink({
                    url: '/api/trpc',
                    // This will never actually be called in Storybook
                }),
            ],
        }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            <api.Provider client={trpcClient} queryClient={queryClient}>
                {props.children}
            </api.Provider>
        </QueryClientProvider>
    );
}

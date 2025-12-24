import { env } from '@/env';
import { TRPCError } from '@trpc/server';
import { FreestyleSandboxes } from 'freestyle-sandboxes';

export const initializeFreestyleSdk = () => {
    if (!env.FREESTYLE_API_KEY) {
        throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'FREESTYLE_API_KEY is not configured. Please set the environment variable to use domain publishing features.',
        });
    }
    return new FreestyleSandboxes({
        apiKey: env.FREESTYLE_API_KEY
    });
};

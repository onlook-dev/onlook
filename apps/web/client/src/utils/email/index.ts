import { getResendClient } from '@onlook/email';
import { env } from '@/env';

export const emailClient = getResendClient({
    apiKey: env.RESEND_API_KEY,
});

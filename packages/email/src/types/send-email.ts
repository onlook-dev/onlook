import type { Resend } from 'resend';

export interface SendEmailOptions {
    dryRun?: boolean;
}

export type SendEmailParams<P> = [client: Resend, props: P, options?: Partial<SendEmailOptions>];

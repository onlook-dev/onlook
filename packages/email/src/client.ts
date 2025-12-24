import { Resend } from 'resend';

export const getResendClient = ({ apiKey }: { apiKey: string }) => {
    return new Resend(apiKey);
};

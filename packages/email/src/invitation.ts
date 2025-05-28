import type { CreateEmailResponse, Resend } from 'resend';
import { type InviteUserEmailProps, InviteUserEmail } from './templates';
import { render } from '@react-email/components';
import type { SendEmailParams } from './types/send-email';

export const sendInvitationEmail = async (...params: SendEmailParams<InviteUserEmailProps>) => {
    const [client, { invitedByEmail, inviteLink }, { dryRun = false } = {}] = params;

    if (dryRun) {
        const rendered = render(InviteUserEmail({ invitedByEmail, inviteLink }));
        console.log(rendered);
        return;
    }

    return await client.emails.send({
        from: 'Onlook <onlook@onlook.dev>',
        to: invitedByEmail,
        subject: 'You have been invited to Onlook',
        react: InviteUserEmail({ invitedByEmail, inviteLink }),
    });
};

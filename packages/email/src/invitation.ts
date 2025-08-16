import { render } from '@react-email/components';
import { type InviteUserEmailProps, InviteUserEmail } from './templates';
import type { SendEmailParams } from './types/send-email';

export const sendInvitationEmail = async (...params: SendEmailParams<InviteUserEmailProps>) => {
    const [client, { inviteeEmail, invitedByEmail, inviteLink }, { dryRun = false } = {}] = params;

    if (dryRun) {
        const rendered = await render(
            InviteUserEmail({ inviteeEmail, invitedByEmail, inviteLink }),
        );
        console.log(rendered);
        return;
    }

    return await client.emails.send({
        from: 'Onlook <support@onlook.com>',
        to: inviteeEmail,
        subject: 'You have been invited to Onlook',
        react: InviteUserEmail({ inviteeEmail, invitedByEmail, inviteLink }),
    });
};

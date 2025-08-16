import { render } from '@react-email/components';
import { type InviteUserEmailProps, InviteUserEmail } from './templates';
import type { SendEmailParams } from './types/send-email';

export const sendInvitationEmail = async (...params: SendEmailParams<InviteUserEmailProps>) => {
    const [client, inviteParams, { dryRun = false } = {}] = params;
    const { inviteeEmail, invitedByEmail, inviteLink, invitedByName } = inviteParams;

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
        subject: `Join ${invitedByName ?? invitedByEmail} on Onlook`,
        react: InviteUserEmail(inviteParams),
    });
};

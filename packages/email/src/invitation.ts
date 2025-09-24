import { render } from '@react-email/components';

import { SUPPORT_EMAIL } from '@onlook/constants';

import type { InviteUserEmailProps } from './templates';
import type { SendEmailParams } from './types/send-email';
import { InviteUserEmail } from './templates';

export const sendInvitationEmail = async (...params: SendEmailParams<InviteUserEmailProps>) => {
    const [client, inviteParams, { dryRun = false } = {}] = params;
    const { inviteeEmail, invitedByEmail, invitedByName } = inviteParams;

    if (dryRun) {
        const rendered = await render(InviteUserEmail(inviteParams));
        console.log(rendered);
        return;
    }

    return await client.emails.send({
        from: `Onlook <${SUPPORT_EMAIL}>`,
        to: inviteeEmail,
        subject: `Join ${invitedByName ?? invitedByEmail} on Onlook`,
        react: InviteUserEmail(inviteParams),
    });
};

export const constructInvitationLink = (publicUrl: string, invitationId: string, token: string) => {
    const url = new URL(`/invitation/${invitationId}`, publicUrl);
    url.searchParams.set('token', token);
    return url.toString();
};

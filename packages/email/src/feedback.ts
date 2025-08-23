import { render } from '@react-email/components';
import { type FeedbackNotificationEmailProps, FeedbackNotificationEmail } from './templates';
import type { SendEmailParams } from './types/send-email';

export const sendFeedbackNotificationEmail = async (
    ...params: SendEmailParams<FeedbackNotificationEmailProps>
) => {
    const [client, feedbackParams, { dryRun = false } = {}] = params;
    const { userEmail, userName } = feedbackParams;

    if (dryRun) {
        const rendered = await render(FeedbackNotificationEmail(feedbackParams));
        console.log(rendered);
        return;
    }

    const fromEmail = process.env.FEEDBACK_FROM_EMAIL || 'feedback@onlook.com';
    const toEmail = process.env.FEEDBACK_TO_EMAIL || 'contact@onlook.com';

    return await client.emails.send({
        from: `Onlook Feedback <${fromEmail}>`,
        to: toEmail,
        subject: `New Feedback from ${userName || userEmail || 'Anonymous User'}`,
        react: FeedbackNotificationEmail(feedbackParams),
    });
};

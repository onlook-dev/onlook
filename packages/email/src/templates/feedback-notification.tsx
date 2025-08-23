import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Tailwind,
    Text,
} from '@react-email/components';

export interface FeedbackNotificationEmailProps {
    message: string;
    userEmail?: string | null;
    userName?: string | null;
    pageUrl?: string | null;
    userAgent?: string | null;
    attachments?: Array<{
        name: string;
        size: number;
        type: string;
        url: string;
        uploadedAt: string;
    }>;
    metadata?: Record<string, any>;
    submittedAt: Date;
}

export const FeedbackNotificationEmail = ({
    message,
    userEmail,
    userName,
    pageUrl,
    userAgent,
    attachments,
    metadata,
    submittedAt,
}: FeedbackNotificationEmailProps) => {
    const previewText = `New feedback: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`;

    return (
        <Html>
            <Head />
            <Tailwind>
                <Body className="mx-auto my-auto bg-white px-2 font-sans">
                    <Preview>{previewText}</Preview>
                    <Container className="mx-auto my-[40px] max-w-[600px] rounded border border-[#eaeaea] border-solid p-[20px]">
                        <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
                            📝 New Feedback Received
                        </Heading>

                        <Section className="bg-[#f9f9f9] rounded p-4 mb-4">
                            <Text className="text-[16px] text-black leading-[24px] font-semibold mb-2">
                                Message:
                            </Text>
                            <Text className="text-[14px] text-black leading-[22px] whitespace-pre-wrap">
                                {message}
                            </Text>
                        </Section>

                        <Hr className="mx-0 my-[20px] w-full border border-[#eaeaea] border-solid" />

                        <Section>
                            <Text className="text-[14px] text-black leading-[20px] font-semibold mb-2">
                                User Details:
                            </Text>
                            <Text className="text-[14px] text-[#666666] leading-[20px] my-1">
                                <strong>Name:</strong> {userName || 'Anonymous'}
                            </Text>
                            <Text className="text-[14px] text-[#666666] leading-[20px] my-1">
                                <strong>Email:</strong> {userEmail || 'Not provided'}
                            </Text>
                            <Text className="text-[14px] text-[#666666] leading-[20px] my-1">
                                <strong>Submitted:</strong> {submittedAt.toLocaleString()}
                            </Text>
                        </Section>

                        {pageUrl && (
                            <Section className="mt-4">
                                <Text className="text-[14px] text-black leading-[20px] font-semibold mb-2">
                                    Page Information:
                                </Text>
                                <Text className="text-[14px] text-[#666666] leading-[20px] my-1">
                                    <strong>URL:</strong>{' '}
                                    <Link href={pageUrl} className="text-blue-600 no-underline">
                                        {pageUrl}
                                    </Link>
                                </Text>
                            </Section>
                        )}

                        {userAgent && (
                            <Section className="mt-4">
                                <Text className="text-[14px] text-black leading-[20px] font-semibold mb-2">
                                    Technical Details:
                                </Text>
                                <Text className="text-[12px] text-[#888888] leading-[18px] font-mono break-all">
                                    {userAgent}
                                </Text>
                            </Section>
                        )}

                        {metadata && Object.keys(metadata).length > 0 && (
                            <Section className="mt-4">
                                <Text className="text-[14px] text-black leading-[20px] font-semibold mb-2">
                                    Additional Data:
                                </Text>
                                <Text className="text-[12px] text-[#666666] leading-[18px] font-mono bg-[#f5f5f5] p-2 rounded">
                                    {JSON.stringify(metadata, null, 2)}
                                </Text>
                            </Section>
                        )}

                        {attachments && attachments.length > 0 && (
                            <Section className="mt-4">
                                <Text className="text-[14px] text-black leading-[20px] font-semibold mb-2">
                                    Attachments ({attachments.length}):
                                </Text>
                                <div className="space-y-2">
                                    {attachments.map((attachment, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-3 p-2 bg-[#f5f5f5] rounded"
                                        >
                                            <div className="flex-1">
                                                <Text className="text-[13px] text-black font-medium leading-[18px] mb-1">
                                                    {attachment.name}
                                                </Text>
                                                <Text className="text-[11px] text-[#666666] leading-[14px]">
                                                    {attachment.type} •{' '}
                                                    {Math.round(attachment.size / 1024)} KB
                                                </Text>
                                            </div>
                                            <Link
                                                href={attachment.url}
                                                className="text-[12px] text-blue-600 font-medium no-underline px-2 py-1 bg-white rounded border border-[#e0e0e0]"
                                            >
                                                Download
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}

                        <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

                        <Text className="text-[#666666] text-[12px] leading-[24px]">
                            This feedback was submitted through the Onlook feedback system.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default FeedbackNotificationEmail;

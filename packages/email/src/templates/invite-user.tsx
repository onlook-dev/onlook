import {
    Body,
    Button,
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

export interface InviteUserEmailProps {
    invitedByEmail: string;
    inviteLink: string;
}

export const InviteUserEmail = ({ invitedByEmail, inviteLink }: InviteUserEmailProps) => {
    const previewText = `Join ${invitedByEmail} on Onlook`;

    return (
        <Html>
            <Head />
            <Tailwind
                config={{
                    theme: {
                        extend: {
                            colors: {
                                background: '#19191d',
                                brand: '#af90ff',
                                foreground: '#fff',
                                border: 'rgb(56, 53, 53)',
                            },
                        },
                    },
                }}
            >
                <Body className="mx-auto my-auto bg-background text-foreground px-2 font-sans">
                    <Preview>{previewText}</Preview>
                    <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-border border-solid p-[20px]">
                        <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-white">
                            Join <strong>{invitedByEmail}</strong> on <strong>Onlook</strong>
                        </Heading>
                        <Text className="text-[14px] text-white leading-[24px]">Hello,</Text>
                        <Text className="text-[14px] text-white leading-[24px]">
                            <strong>{invitedByEmail}</strong> (
                            <Link
                                href={`mailto:${invitedByEmail}`}
                                className="text-brand no-underline"
                            >
                                {invitedByEmail}
                            </Link>
                            ) has invited you to their project on <strong>Onlook</strong>.
                        </Text>
                        <Section className="mt-[32px] mb-[32px] text-center">
                            <Button
                                className="rounded bg-brand px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                                href={inviteLink}
                            >
                                Join
                            </Button>
                        </Section>
                        <Text className="text-[14px] leading-[24px]">
                            or copy and paste this URL into your browser:{' '}
                            <Link href={inviteLink} className="text-brand no-underline">
                                {inviteLink}
                            </Link>
                        </Text>
                        <Hr className="mx-0 my-[26px] w-full border border-border border-solid" />
                        <Text className="text-foreground/50 text-[12px] leading-[24px]">
                            This invitation was intended for{' '}
                            <span className="text-foreground">{invitedByEmail}</span>. If you were
                            not expecting this invitation, you can ignore this email. If you are
                            concerned about your account's safety, please reply to this email to get
                            in touch with us.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

InviteUserEmail.PreviewProps = {
    invitedByEmail: 'kiet@onlook.com',
    inviteLink: 'https://onlook.com',
} as InviteUserEmailProps;

export default InviteUserEmail;

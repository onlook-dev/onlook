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
    inviteeEmail: string;
    invitedByName?: string;
    invitedByEmail: string;
    inviteLink: string;
}

export const InviteUserEmail = ({
    inviteeEmail,
    invitedByName,
    invitedByEmail,
    inviteLink,
}: InviteUserEmailProps) => {
    const previewText = `Join ${invitedByName ?? invitedByEmail} on Onlook`;
    const headingText = `Join ${invitedByName ?? invitedByEmail} on Onlook`;

    return (
        <Html>
            <Head />
            <Tailwind>
                <Body className="mx-auto my-auto bg-white px-2 font-sans">
                    <Preview>{previewText}</Preview>
                    <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
                        <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
                            {headingText}
                        </Heading>
                        <Text className="text-[14px] text-black leading-[24px]">Hello,</Text>
                        <Text className="text-[14px] text-black leading-[24px]">
                            <Link
                                href={`mailto:${invitedByEmail}`}
                                className="text-blue-600 no-underline mr-1"
                            >
                                <strong>{invitedByName ?? invitedByEmail}</strong>
                            </Link>
                            <span>
                                has invited you to their project on <strong>Onlook</strong>.
                            </span>
                        </Text>
                        <Section className="mt-[32px] mb-[32px] text-center">
                            <Button
                                className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                                href={inviteLink}
                            >
                                Join the project
                            </Button>
                        </Section>
                        <Text className="text-[14px] text-black leading-[24px]">
                            or copy and paste this URL into your browser:{' '}
                            <Link href={inviteLink} className="text-blue-600 no-underline">
                                {inviteLink}
                            </Link>
                        </Text>
                        <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />
                        <Text className="text-[#666666] text-[12px] leading-[24px]">
                            This invitation was intended for{' '}
                            <span className="text-black">{inviteeEmail}</span>. If you were not
                            expecting this invitation, you can ignore this email. If you are
                            concerned about your account's safety, please reply to this email to get
                            in touch with us.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default InviteUserEmail;

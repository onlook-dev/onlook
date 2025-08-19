import { Main } from './_components/main';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const id = (await params).id;
    return <Main invitationId={id} />;
}

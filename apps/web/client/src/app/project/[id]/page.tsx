import { Main } from './_components/main';
import { ChatWrapper } from './chat-wrapper';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const projectId = (await params).id;
    if (!projectId) {
        return <div>Invalid project ID</div>;
    }
    return (
        <ChatWrapper>
            <Main projectId={projectId} />
        </ChatWrapper>
    );
}

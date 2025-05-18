'use client';

import { Main } from './_components/main';
import { ChatProvider } from './_hooks/use-chat';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const projectId = (await params).id;
    if (!projectId) {
        return <div>Invalid project ID</div>;
    }
    return (
        <ChatProvider>
            <Main projectId={projectId} />
        </ChatProvider>
    );
}

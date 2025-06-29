'use client';

import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { useEffect, useState } from 'react';
import { useTabActive } from '../_hooks/use-tab-active';

export const useStartProject = () => {
    const editorEngine = useEditorEngine();
    const { tabState } = useTabActive();

    const { data: user } = api.user.get.useQuery();
    const { sendMessages } = useChatContext();
    const { data: project } = api.project.get.useQuery({ projectId: editorEngine.projectId });
    const { data: canvasWithFrames } = api.canvas.getWithFrames.useQuery({ projectId: editorEngine.projectId });
    const { data: conversations } = api.chat.conversation.get.useQuery({ projectId: editorEngine.projectId });
    const [isStartingProject, setIsStartingProject] = useState(false);

    useEffect(() => {
        if (project) {
            editorEngine.sandbox.session.start(project.sandbox.id);
        }
    }, [project]);

    useEffect(() => {
        if (canvasWithFrames) {
            editorEngine.canvas.applyCanvas(canvasWithFrames.userCanvas);
            editorEngine.frames.applyFrames(canvasWithFrames.frames);
        }
    }, [canvasWithFrames]);

    useEffect(() => {
        if (conversations) {
            editorEngine.chat.conversation.applyConversations(conversations);
        }
    }, [conversations]);

    // const resumeCreate = async () => {
    //     const creationData = createManager.pendingCreationData;
    //     if (!creationData) return;

    //     if (editorEngine.projectId !== creationData.project.id) return;

    //     const createContext: ChatMessageContext[] = await editorEngine.chat.context.getCreateContext();
    //     const context = [...createContext, ...creationData.images];

    //     const messages = await editorEngine.chat.getEditMessages(
    //         creationData.prompt,
    //         context,
    //     );

    //     if (!messages) {
    //         console.error('Failed to get creation messages');
    //         return;
    //     }
    //     createManager.pendingCreationData = null;
    //     sendMessages(messages, ChatType.CREATE);
    // };

    useEffect(() => {
        if (tabState === 'reactivated') {
            editorEngine.sandbox.session.reconnect(editorEngine.projectId, user?.id);
        }
    }, [tabState]);

    return { isStartingProject };
}
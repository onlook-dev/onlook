'use client';

import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { type ProjectCreateRequest } from '@onlook/db';
import {
    ChatType,
    CreateRequestContextType,
    MessageContextType,
    ProjectCreateRequestStatus,
    type ImageMessageContext,
    type MessageContext,
    type Project,
} from '@onlook/models';
import { toast } from '@onlook/ui/sonner';
import { useEffect, useState } from 'react';
import { useTabActive } from '../_hooks/use-tab-active';

export const useStartProject = () => {
    const editorEngine = useEditorEngine();
    const [isProjectReady, setIsProjectReady] = useState(false);
    const [isSandboxLoading, setIsSandboxLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { tabState } = useTabActive();
    const apiUtils = api.useUtils();
    const { data: user, isLoading: isUserLoading, error: userError } = api.user.get.useQuery();
    const { data: project, isLoading: isProjectLoading, error: projectError } = api.project.get.useQuery({ projectId: editorEngine.projectId });
    const { data: canvasWithFrames, isLoading: isCanvasLoading, error: canvasError } = api.userCanvas.getWithFrames.useQuery({ projectId: editorEngine.projectId });
    const { data: conversations, isLoading: isConversationsLoading, error: conversationsError } = api.chat.conversation.getAll.useQuery({ projectId: editorEngine.projectId });
    const { data: creationRequest, isLoading: isCreationRequestLoading, error: creationRequestError } = api.project.createRequest.getPendingRequest.useQuery({ projectId: editorEngine.projectId });
    const { sendMessage } = useChatContext();
    const { mutateAsync: updateCreateRequest } = api.project.createRequest.updateStatus.useMutation({
        onSettled: async () => {
            await apiUtils.project.createRequest.getPendingRequest.invalidate({ projectId: editorEngine.projectId });
        },
    });

    useEffect(() => {
        if (project) {
            startSandbox(project);
            editorEngine.screenshot.lastScreenshotAt = project.metadata.updatedPreviewImgAt;
        }
    }, [project]);

    const startSandbox = async (project: Project) => {
        try {
            await editorEngine.sandbox.session.start(project.sandbox.id);
            setIsSandboxLoading(false);
        } catch (error) {
            console.error('Failed to start sandbox', error);
            toast.error('Failed to start sandbox', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

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

    useEffect(() => {
        if (creationRequest && !isSandboxLoading) {
            resumeCreate(creationRequest);
        }
    }, [creationRequest, isSandboxLoading]);

    const resumeCreate = async (creationData: ProjectCreateRequest) => {
        try {
            if (editorEngine.projectId !== creationData.projectId) {
                throw new Error('Project ID mismatch');
            }

            const createContext: MessageContext[] = await editorEngine.chat.context.getCreateContext();
            const imageContexts: ImageMessageContext[] = creationData.context.filter((context) => context.type === CreateRequestContextType.IMAGE).map((context) => ({
                type: MessageContextType.IMAGE,
                content: context.content,
                mimeType: context.mimeType,
                displayName: 'user image',
            }));
            const context: MessageContext[] = [...createContext, ...imageContexts];
            const prompt = creationData.context.filter((context) => context.type === CreateRequestContextType.PROMPT).map((context) => (context.content)).join('\n');

            const message = await editorEngine.chat.addEditMessage(
                prompt,
                context,
            );
            sendMessage(ChatType.CREATE);

            try {
                await updateCreateRequest({
                    projectId: editorEngine.projectId,
                    status: ProjectCreateRequestStatus.COMPLETED,
                });
            } catch (error) {
                console.error('Failed to update create request', error);
                toast.error('Failed to complete create request', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        } catch (error) {
            console.error('Failed to resume create request', error);
            toast.error('Failed to resume create request', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };

    useEffect(() => {
        if (tabState === 'reactivated') {
            editorEngine.sandbox.session.reconnect(editorEngine.projectId, user?.id);
        }
    }, [tabState]);

    useEffect(() => {
        const allQueriesResolved =
            !isUserLoading &&
            !isProjectLoading &&
            !isCanvasLoading &&
            !isConversationsLoading &&
            !isCreationRequestLoading &&
            !isSandboxLoading;

        setIsProjectReady(allQueriesResolved);
    }, [isUserLoading, isProjectLoading, isCanvasLoading, isConversationsLoading, isCreationRequestLoading, isSandboxLoading]);

    useEffect(() => {
        setError(userError?.message ?? projectError?.message ?? canvasError?.message ?? conversationsError?.message ?? creationRequestError?.message ?? null);
    }, [userError, projectError, canvasError, conversationsError, creationRequestError]);

    return { isProjectReady, error };
}
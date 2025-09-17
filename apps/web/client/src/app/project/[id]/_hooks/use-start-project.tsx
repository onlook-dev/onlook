'use client';

import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { type ProjectCreateRequest } from '@onlook/db';
import {
    ChatType,
    CreateRequestContextType,
    MessageContextType,
    ProjectCreateRequestStatus,
    type ImageMessageContext,
    type MessageContext
} from '@onlook/models';
import { toast } from '@onlook/ui/sonner';
import { useEffect, useRef, useState } from 'react';
import { useTabActive } from '../_hooks/use-tab-active';

interface ProjectReadyState {
    canvas: boolean;
    conversations: boolean;
    sandbox: boolean;
}

export const useStartProject = () => {
    const editorEngine = useEditorEngine();
    const sandbox = editorEngine.activeSandbox;
    const [error, setError] = useState<string | null>(null);
    const processedRequestIdRef = useRef<string | null>(null);
    const { tabState } = useTabActive();
    const apiUtils = api.useUtils();
    const { data: user, error: userError } = api.user.get.useQuery();
    const { data: canvasWithFrames, error: canvasError } = api.userCanvas.getWithFrames.useQuery({ projectId: editorEngine.projectId });
    const { data: conversations, error: conversationsError } = api.chat.conversation.getAll.useQuery({ projectId: editorEngine.projectId });
    const { data: creationRequest, error: creationRequestError } = api.project.createRequest.getPendingRequest.useQuery({ projectId: editorEngine.projectId });
    const { mutateAsync: updateCreateRequest } = api.project.createRequest.updateStatus.useMutation({
        onSettled: async () => {
            await apiUtils.project.createRequest.getPendingRequest.invalidate({ projectId: editorEngine.projectId });
        },
    });
    const [projectReadyState, setProjectReadyState] = useState<ProjectReadyState>({
        canvas: false,
        conversations: false,
        sandbox: false,
    });

    const updateProjectReadyState = (state: Partial<ProjectReadyState>) => {
        setProjectReadyState((prev) => ({ ...prev, ...state }));
    };

    useEffect(() => {
        if (!sandbox.session.isConnecting) {
            updateProjectReadyState({ sandbox: true });
        }
    }, [sandbox.session.isConnecting]);

    useEffect(() => {
        if (canvasWithFrames) {
            editorEngine.canvas.applyCanvas(canvasWithFrames.userCanvas);
            editorEngine.frames.applyFrames(canvasWithFrames.frames);
            updateProjectReadyState({ canvas: true });
        }
    }, [canvasWithFrames]);

    useEffect(() => {
        const applyConversations = async () => {
            if (conversations) {
                await editorEngine.chat.conversation.applyConversations(conversations);
                updateProjectReadyState({ conversations: true });
            }
        };
        applyConversations();
    }, [conversations]);

    useEffect(() => {
        const isProjectReady = Object.values(projectReadyState).every((value) => value);
        if (creationRequest && processedRequestIdRef.current !== creationRequest.id && isProjectReady) {
            console.error('Resume create', creationRequest, isProjectReady, processedRequestIdRef.current);
            processedRequestIdRef.current = creationRequest.id;
            resumeCreate(creationRequest);
        }
    }, [creationRequest, projectReadyState]);

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

            await editorEngine.chat.addEditMessage(
                prompt,
                context,
            );

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
            processedRequestIdRef.current = null; // Allow retry on failure
            console.error('Failed to resume create request', error);
            toast.error('Failed to resume create request', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };

    useEffect(() => {
        if (tabState === 'reactivated') {
            editorEngine.activeSandbox.session.reconnect(editorEngine.projectId, user?.id);
        }
    }, [tabState]);

    useEffect(() => {
        setError(userError?.message ?? canvasError?.message ?? conversationsError?.message ?? creationRequestError?.message ?? null);
    }, [userError, canvasError, conversationsError, creationRequestError]);

    return { isProjectReady: Object.values(projectReadyState).every((value) => value), error };
}
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
    type MessageContext,
} from '@onlook/models';
import { toast } from '@onlook/ui/sonner';
import { useEffect, useRef, useState } from 'react';
import { useTabActive } from '../_hooks/use-tab-active';
import { v4 as uuidv4 } from 'uuid';

interface ProjectReadyState {
    canvas: boolean;
    conversations: boolean;
    sandbox: boolean;
}

const QUERY_TIMEOUT_MS = 30000; // 30 second timeout for queries

export const useStartProject = () => {
    const editorEngine = useEditorEngine();
    const sandbox = editorEngine.activeSandbox;
    const [error, setError] = useState<string | null>(null);
    const processedRequestIdRef = useRef<string | null>(null);
    const { tabState } = useTabActive();
    const apiUtils = api.useUtils();
    const { data: user, error: userError } = api.user.get.useQuery(undefined, {
        retry: 3,
        retryDelay: 1000,
    });
    const { data: canvasWithFrames, error: canvasError } = api.userCanvas.getWithFrames.useQuery(
        { projectId: editorEngine.projectId },
        {
            retry: 3,
            retryDelay: 1000,
        }
    );
    const { data: conversations, error: conversationsError } = api.chat.conversation.getAll.useQuery(
        { projectId: editorEngine.projectId },
        {
            retry: 3,
            retryDelay: 1000,
        }
    );
    const { data: creationRequest, error: creationRequestError } = api.project.createRequest.getPendingRequest.useQuery(
        { projectId: editorEngine.projectId },
        {
            retry: 3,
            retryDelay: 1000,
        }
    );
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
    const loadingStartTimeRef = useRef<number>(Date.now());

    const updateProjectReadyState = (state: Partial<ProjectReadyState>) => {
        setProjectReadyState((prev) => ({ ...prev, ...state }));
    };

    // Add timeout safety mechanism
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const isProjectReady = Object.values(projectReadyState).every((value) => value);
            if (!isProjectReady) {
                const pendingStates = Object.entries(projectReadyState)
                    .filter(([_, value]) => !value)
                    .map(([key]) => key);

                console.error('[useStartProject] Loading timeout - pending states:', pendingStates);
                console.error('[useStartProject] Sandbox isConnecting:', sandbox.session.isConnecting);
                console.error('[useStartProject] Errors:', { userError, canvasError, conversationsError, creationRequestError });

                setError(
                    `Project loading timed out after ${QUERY_TIMEOUT_MS / 1000}s. Pending: ${pendingStates.join(', ')}. Please refresh the page.`
                );
            }
        }, QUERY_TIMEOUT_MS);

        return () => clearTimeout(timeoutId);
    }, [projectReadyState, sandbox.session.isConnecting, userError, canvasError, conversationsError, creationRequestError]);

    useEffect(() => {
        if (!sandbox.session.isConnecting) {
            updateProjectReadyState({ sandbox: true });
        }
    }, [sandbox.session.isConnecting]);

    // Add a safety mechanism for sandbox connection
    useEffect(() => {
        if (sandbox.session.isConnecting) {
            const sandboxTimeoutId = setTimeout(() => {
                if (sandbox.session.isConnecting) {
                    console.error('[useStartProject] Sandbox connection timeout');
                    // Force mark sandbox as ready even if still connecting to prevent permanent blocking
                    updateProjectReadyState({ sandbox: true });
                }
            }, 15000); // Give sandbox 15 seconds to connect

            return () => clearTimeout(sandboxTimeoutId);
        }
    }, [sandbox.session.isConnecting]);

    useEffect(() => {
        if (tabState === 'reactivated') {
            sandbox.session.reconnect(editorEngine.projectId, user?.id);
        }
    }, [tabState, sandbox.session]);

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
        void applyConversations();
    }, [editorEngine.chat.conversation, conversations]);

    useEffect(() => {
        const isProjectReady = Object.values(projectReadyState).every((value) => value);
        if (creationRequest && processedRequestIdRef.current !== creationRequest.id && isProjectReady && editorEngine.chat._sendMessageAction) {
            processedRequestIdRef.current = creationRequest.id;
            void resumeCreate(creationRequest);
        }
    }, [creationRequest, projectReadyState, editorEngine.chat._sendMessageAction]);

    const resumeCreate = async (creationData: ProjectCreateRequest) => {
        try {
            if (editorEngine.projectId !== creationData.projectId) {
                throw new Error('Project ID mismatch');
            }

            const createContext: MessageContext[] =
                await editorEngine.chat.context.getCreateContext();
            const imageContexts: ImageMessageContext[] = creationData.context
                .filter((context) => context.type === CreateRequestContextType.IMAGE)
                .map((context) => ({
                    type: MessageContextType.IMAGE,
                    content: context.content,
                    mimeType: context.mimeType,
                    displayName: 'user image',
                    id: uuidv4(),
                }));

            const context: MessageContext[] = [...createContext, ...imageContexts];
            editorEngine.chat.context.addContexts(context);

            const prompt = creationData.context
                .filter((context) => context.type === CreateRequestContextType.PROMPT)
                .map((context) => context.content)
                .join('\n');

            const [conversation] = await editorEngine.chat.conversation.getConversations(
                editorEngine.projectId,
            );

            if (!conversation) {
                throw new Error('No conversation found');
            }

            await editorEngine.chat.conversation.selectConversation(conversation.id);
            await editorEngine.chat.sendMessage(prompt, ChatType.CREATE);

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
        setError(userError?.message ?? canvasError?.message ?? conversationsError?.message ?? creationRequestError?.message ?? null);
    }, [userError, canvasError, conversationsError, creationRequestError]);

    return { isProjectReady: Object.values(projectReadyState).every((value) => value), error };
}
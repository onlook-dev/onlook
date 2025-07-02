import { api } from '@/trpc/client';
import { PublishStatus, type PublishRequest, type PublishState } from '@onlook/models';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePublishSubscriptionOptions {
    onSuccess?: (message: string) => void;
    onError?: (error: string) => void;
}

interface UsePublishSubscriptionReturn {
    state: PublishState | null;
    isPublishing: boolean;
    publish: (type: 'preview' | 'custom', projectId: string, projectPath: string, request: PublishRequest) => void;
    cancel: () => void;
}

/**
 * Custom hook for managing publish subscriptions with real-time progress updates
 * 
 * @example
 * const { state, isPublishing, publish, cancel } = usePublishSubscription({
 *   onSuccess: (message) => toast.success(message),
 *   onError: (error) => toast.error(error)
 * });
 * 
 * // Start publishing
 * publish('preview', projectId, projectPath, {
 *   buildScript: 'npm run build',
 *   urls: ['example.onlook.dev']
 * });
 */
export function usePublishSubscription({
    onSuccess,
    onError
}: UsePublishSubscriptionOptions = {}): UsePublishSubscriptionReturn {
    const [state, setState] = useState<PublishState | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

    const cancel = useCallback(() => {
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
        }
        setIsPublishing(false);
    }, []);

    const publish = useCallback((
        type: 'preview' | 'custom',
        projectId: string,
        projectPath: string,
        request: PublishRequest
    ) => {
        // Cancel any existing subscription
        cancel();

        setIsPublishing(true);
        setState({
            status: PublishStatus.LOADING,
            message: 'Initializing deployment...',
            progress: 0,
            buildLog: null,
            error: null,
        });

        try {
            subscriptionRef.current = api.domain.publish.publish.subscribe(
                {
                    type,
                    projectId,
                    projectPath,
                    request,
                },
                {
                    onData: (newState: PublishState) => {
                        setState(newState);

                        // Handle completion
                        if (newState.status === PublishStatus.PUBLISHED) {
                            setIsPublishing(false);
                            onSuccess?.(newState.message || 'Deployment successful!');
                            // Auto-cleanup after success
                            setTimeout(() => {
                                if (subscriptionRef.current) {
                                    subscriptionRef.current.unsubscribe();
                                    subscriptionRef.current = null;
                                }
                            }, 1000);
                        } else if (newState.status === PublishStatus.ERROR) {
                            setIsPublishing(false);
                            const errorMessage = newState.error || newState.message || 'Deployment failed';
                            onError?.(errorMessage);
                            // Auto-cleanup after error
                            setTimeout(() => {
                                if (subscriptionRef.current) {
                                    subscriptionRef.current.unsubscribe();
                                    subscriptionRef.current = null;
                                }
                            }, 1000);
                        }
                    },
                    onError: (error: Error) => {
                        console.error('Subscription error:', error);
                        setState({
                            status: PublishStatus.ERROR,
                            message: 'Failed to connect to deployment service',
                            error: error.message,
                            progress: 100,
                            buildLog: null,
                        });
                        setIsPublishing(false);
                        onError?.(error.message || 'Connection error');
                        
                        // Cleanup on error
                        if (subscriptionRef.current) {
                            subscriptionRef.current.unsubscribe();
                            subscriptionRef.current = null;
                        }
                    },
                }
            );
        } catch (error) {
            console.error('Failed to start subscription:', error);
            setState({
                status: PublishStatus.ERROR,
                message: 'Failed to start deployment',
                error: error instanceof Error ? error.message : 'Unknown error',
                progress: 100,
                buildLog: null,
            });
            setIsPublishing(false);
            onError?.(error instanceof Error ? error.message : 'Failed to start deployment');
        }
    }, [cancel, onSuccess, onError]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancel();
        };
    }, [cancel]);

    return {
        state,
        isPublishing,
        publish,
        cancel,
    };
}
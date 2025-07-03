'use client';

import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { DeploymentStatus, DeploymentType } from '@onlook/models';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface PublishParams {
    projectId: string;
    type: DeploymentType;
    buildScript: string;
    buildFlags: string;
    envVars: Record<string, string>;
}

interface HostingContextValue {
    // State for each deployment type
    deployments: Record<DeploymentType, any>;
    isDeploying: (type: DeploymentType) => boolean;

    // Operations
    publish: (params: PublishParams) => Promise<{ deploymentId: string } | null>;
    unpublish: (projectId: string, type: DeploymentType) => Promise<{ deploymentId: string } | null>;

    // Utilities
    refetch: (type: DeploymentType) => void;
    refetchAll: () => void;
}

const HostingContext = createContext<HostingContextValue | null>(null);

interface HostingProviderProps {
    children: ReactNode;
}

export const HostingProvider = ({ children }: HostingProviderProps) => {
    const editorEngine = useEditorEngine();
    const [subscriptionStates, setSubscriptionStates] = useState<Record<DeploymentType, boolean>>({
        [DeploymentType.PREVIEW]: false,
        [DeploymentType.CUSTOM]: false,
        [DeploymentType.UNPUBLISH_PREVIEW]: false,
        [DeploymentType.UNPUBLISH_CUSTOM]: false,
    });

    // API hooks for all deployment types
    const previewQuery = api.publish.deployment.getByType.useQuery({
        projectId: editorEngine.projectId,
        type: DeploymentType.PREVIEW,
    }, {
        refetchInterval: subscriptionStates[DeploymentType.PREVIEW] ? 1000 : false,
    });

    const customQuery = api.publish.deployment.getByType.useQuery({
        projectId: editorEngine.projectId,
        type: DeploymentType.CUSTOM,
    }, {
        refetchInterval: subscriptionStates[DeploymentType.CUSTOM] ? 1000 : false,
    });

    const unpublishPreviewQuery = api.publish.deployment.getByType.useQuery({
        projectId: editorEngine.projectId,
        type: DeploymentType.UNPUBLISH_PREVIEW,
    }, {
        refetchInterval: subscriptionStates[DeploymentType.UNPUBLISH_PREVIEW] ? 1000 : false,
    });

    const unpublishCustomQuery = api.publish.deployment.getByType.useQuery({
        projectId: editorEngine.projectId,
        type: DeploymentType.UNPUBLISH_CUSTOM,
    }, {
        refetchInterval: subscriptionStates[DeploymentType.UNPUBLISH_CUSTOM] ? 1000 : false,
    });

    // Mutations
    const { mutateAsync: runPublish } = api.publish.publish.useMutation();
    const { mutateAsync: runUnpublish } = api.publish.unpublish.useMutation();

    // Organize deployments by type
    const deployments = useMemo(() => ({
        [DeploymentType.PREVIEW]: previewQuery.data,
        [DeploymentType.CUSTOM]: customQuery.data,
        [DeploymentType.UNPUBLISH_PREVIEW]: unpublishPreviewQuery.data,
        [DeploymentType.UNPUBLISH_CUSTOM]: unpublishCustomQuery.data,
    }), [previewQuery.data, customQuery.data, unpublishPreviewQuery.data, unpublishCustomQuery.data]);

    // Check if any deployment is in progress
    const isDeploying = (type: DeploymentType): boolean => {
        return deployments[type]?.status === DeploymentStatus.IN_PROGRESS;
    };

    // Stop polling when deployments complete, start polling when in progress
    useEffect(() => {
        Object.entries(deployments).forEach(([type, deployment]) => {
            if (deployment?.status === DeploymentStatus.IN_PROGRESS) {
                setSubscriptionStates(prev => ({
                    ...prev,
                    [type as DeploymentType]: true,
                }));
            } else {
                setSubscriptionStates(prev => ({
                    ...prev,
                    [type as DeploymentType]: false,
                }));
            }
        });
    }, [deployments]);

    // Publish function
    const publish = async (params: PublishParams) => {
        setSubscriptionStates(prev => ({
            ...prev,
            [params.type]: true,
        }));

        const response = await runPublish(params);

        // Refetch the specific deployment
        await refetch(params.type);

        return response;
    };

    // Unpublish function
    const unpublish = async (projectId: string, type: DeploymentType) => {
        setSubscriptionStates(prev => ({
            ...prev,
            [type]: true,
        }));

        const response = await runUnpublish({
            projectId,
            type,
        });

        // Refetch the specific deployment
        await refetch(type);

        return response;
    };

    // Refetch functions
    const refetch = (type: DeploymentType) => {
        switch (type) {
            case DeploymentType.PREVIEW:
                previewQuery.refetch();
                break;
            case DeploymentType.CUSTOM:
                customQuery.refetch();
                break;
            case DeploymentType.UNPUBLISH_PREVIEW:
                unpublishPreviewQuery.refetch();
                break;
            case DeploymentType.UNPUBLISH_CUSTOM:
                unpublishCustomQuery.refetch();
                break;
        }
    };

    const refetchAll = () => {
        previewQuery.refetch();
        customQuery.refetch();
        unpublishPreviewQuery.refetch();
        unpublishCustomQuery.refetch();
    };

    const value: HostingContextValue = {
        deployments,
        isDeploying,
        publish,
        unpublish,
        refetch,
        refetchAll,
    };

    return (
        <HostingContext.Provider value={value}>
            {children}
        </HostingContext.Provider>
    );
};

export const useHostingContext = () => {
    const context = useContext(HostingContext);
    if (!context) {
        throw new Error('useHostingContext must be used within HostingProvider');
    }
    return context;
}; 
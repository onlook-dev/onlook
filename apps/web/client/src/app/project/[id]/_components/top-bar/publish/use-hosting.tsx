'use client';

import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import {
    DeploymentStatus,
    DeploymentType
} from '@onlook/models';
import { useEffect, useState } from 'react';

export function useHosting(type: DeploymentType) {
    const editorEngine = useEditorEngine();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const { data: deployment, refetch } = api.publish.deployment.getByType.useQuery({
        projectId: editorEngine.projectId,
        type,
    }, {
        refetchInterval: isSubscribed ? 3000 : false,
    });
    const { mutateAsync: runPublish } = api.publish.publish.useMutation();
    const { mutateAsync: runUnpublish } = api.publish.unpublish.useMutation();

    const isDeploying = deployment?.status === DeploymentStatus.IN_PROGRESS;

    useEffect(() => {
        if (deployment?.status !== DeploymentStatus.IN_PROGRESS) {
            setIsSubscribed(false);
        }
    }, [deployment?.status]);

    const publish = async ({
        projectId,
        buildScript,
        type,
        buildFlags,
        envVars,
    }: {
        projectId: string;
        type: DeploymentType;
        buildScript: string;
        buildFlags: string;
        envVars: Record<string, string>;
    }) => {
        setIsSubscribed(true);
        const response = await runPublish({
            projectId,
            type,
            buildScript,
            buildFlags,
            envVars,
        });
        return response;
    }

    const unpublish = async (projectId: string) => {
        setIsSubscribed(true);
        const response = await runUnpublish({
            projectId,
            type
        });
        return response;
    }

    return {
        deployment,
        isDeploying,
        refetch,
        publish,
        unpublish,
    };
}

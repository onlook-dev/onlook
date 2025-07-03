'use client';

import { DeploymentType } from '@onlook/models';
import { useHostingContext } from '../../../app/project/[id]/_components/top-bar/publish/hosting-provider';

export function useHostingType(type: DeploymentType) {
    const context = useHostingContext();

    const deployment = context.deployments[type];
    const isDeploying = context.isDeploying(type);

    const publish = async (params: Omit<Parameters<typeof context.publish>[0], 'type'>) => {
        return context.publish({ ...params, type });
    };

    const unpublish = async (projectId: string) => {
        return context.unpublish(projectId, type);
    };

    const refetch = () => {
        context.refetch(type);
    };

    return {
        deployment,
        isDeploying,
        publish,
        unpublish,
        refetch,
    };
} 
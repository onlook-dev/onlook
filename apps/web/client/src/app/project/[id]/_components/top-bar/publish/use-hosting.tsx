import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import {
    DeploymentStatus,
    DeploymentType
} from '@onlook/models';

export function useHosting(type: DeploymentType) {
    const editorEngine = useEditorEngine();
    const { data: deployment, refetch } = api.publish.deployment.getByType.useQuery({
        projectId: editorEngine.projectId,
        type,
    });
    const { mutateAsync: runPublish } = api.publish.publish.useMutation();
    const { mutateAsync: runUnpublish } = api.publish.unpublish.useMutation();

    const isDeploying = deployment?.status === DeploymentStatus.PENDING || deployment?.status === DeploymentStatus.PREPARING || deployment?.status === DeploymentStatus.BUILDING;

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
        const response = await runPublish({
            projectId,
            type,
            buildScript,
            buildFlags,
            envVars,
        });
        return response;
    }

    const unpublish = async (projectId: string, type: DeploymentType) => {
        const response = await runUnpublish({
            projectId,
            type: DeploymentType.UNPUBLISH_ALL,
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

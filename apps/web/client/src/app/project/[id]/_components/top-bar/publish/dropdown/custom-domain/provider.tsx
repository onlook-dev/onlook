import { useEditorEngine } from '@/components/store/editor';
import { useHostingType } from '@/components/store/hosting';
import { useStateManager } from '@/components/store/state';
import { api } from '@/trpc/react';
import { DefaultSettings } from '@onlook/constants';
import { DeploymentType, SettingsTabValue } from '@onlook/models';
import { ProductType } from '@onlook/stripe';
import { toast } from '@onlook/ui/sonner';
import { createContext, useContext } from 'react';

const useCustomDomain = () => {
    const editorEngine = useEditorEngine();
    const stateManager = useStateManager();
    const { data: subscription } = api.subscription.get.useQuery();
    const { data: customDomain } = api.domain.custom.get.useQuery({ projectId: editorEngine.projectId });
    const { deployment, publish: runPublish, isDeploying } = useHostingType(DeploymentType.CUSTOM);

    const product = subscription?.product;
    const isPro = product?.type === ProductType.PRO;

    const openCustomDomain = (): void => {
        editorEngine.state.publishOpen = false;
        stateManager.settingsTab = SettingsTabValue.DOMAIN;
        stateManager.isSettingsModalOpen = true;
    };

    const publish = async () => {
        if (!customDomain) {
            console.error(`No custom domain hosting manager found`);
            return;
        }
        const res = await runPublish({
            projectId: editorEngine.projectId,
            buildScript: DefaultSettings.COMMANDS.build,
            buildFlags: DefaultSettings.EDITOR_SETTINGS.buildFlags,
            envVars: {},
        });
        if (!res) {
            toast.error('Failed to create deployment');
            return;
        }
        toast.success('Created Deployment', {
            description: 'Deployment ID: ' + res.deploymentId,
        });
    };

    const retry = () => {
        if (!customDomain) {
            console.error(`No custom domain hosting manager found`);
            return;
        }
        publish();
    };

    return {
        customDomain,
        deployment,
        publish,
        retry,
        isDeploying,
        isPro,
        openCustomDomain,
    }
}

const CustomDomainContext = createContext<ReturnType<typeof useCustomDomain> | null>(null);

export const CustomDomainProvider = ({ children }: { children: React.ReactNode }) => {
    const value = useCustomDomain();
    return <CustomDomainContext.Provider value={value}>
        {children}
    </CustomDomainContext.Provider>
}

export const useCustomDomainContext = () => {
    const context = useContext(CustomDomainContext);
    if (!context) {
        throw new Error('useCustomDomainContext must be used within a CustomDomainProvider');
    }
    return context;
}
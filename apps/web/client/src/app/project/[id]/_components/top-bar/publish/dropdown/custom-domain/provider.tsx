import { useEditorEngine } from '@/components/store/editor';
import { useHostingType } from '@/components/store/hosting';
import { useStateManager } from '@/components/store/state';
import { api } from '@/trpc/react';
import { DeploymentType, SettingsTabValue } from '@onlook/models';
import { ProductType } from '@onlook/stripe';
import { createContext, useContext, useState } from 'react';

const useCustomDomain = () => {
    const editorEngine = useEditorEngine();
    const stateManager = useStateManager();
    const [isLoading, setIsLoading] = useState(false);
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
        setIsLoading(true);
        try {
            await runPublish({
                projectId: editorEngine.projectId
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
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
        isLoading,
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
import { useEditorEngine } from '@/components/store/editor';
import { useStateManager } from '@/components/store/state';
import { api } from '@/trpc/react';
import { ProductType } from '@onlook/stripe';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { UpgradePrompt } from '../upgrade-prompt';
import { DomainVerificationProvider } from './use-domain-verification';
import { Verification } from './verification';
import { Verified } from './verified';

export const CustomDomain = observer(() => {
    const editorEngine = useEditorEngine();
    const stateManager = useStateManager();

    const { data: subscription } = api.subscription.get.useQuery();
    const product = subscription?.product;
    const { data: customDomain } = api.domain.custom.get.useQuery({ projectId: editorEngine.projectId });

    const renderContent = () => {
        if (product?.type !== ProductType.PRO) {
            return (
                <UpgradePrompt
                    onClick={() => {
                        stateManager.isSettingsModalOpen = false;
                        stateManager.isSubscriptionModalOpen = true;
                    }}
                />
            );
        }
        if (customDomain) {
            return <Verified />;
        }
        return <Verification />;
    };

    return (
        <DomainVerificationProvider>
            <div className="space-y-4">
                <div className="flex items-center justify-start gap-3">
                    <h2 className="text-lg">Custom Domain</h2>
                    {product?.type === ProductType.PRO && (
                        <div className="flex h-5 items-center space-x-1 bg-blue-500/20 dark:bg-blue-500 px-2 rounded-full">
                            <Icons.Sparkles className="h-4 w-4" />
                            <span className="text-xs">Pro</span>
                        </div>
                    )}
                </div>
                {renderContent()}
            </div>
        </DomainVerificationProvider>
    );
});

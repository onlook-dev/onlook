import { useEditorEngine } from '@/components/store/editor';
import { useDomainsManager } from '@/components/store/project';
import { useUserManager } from '@/components/store/user';
import { Icons } from '@onlook/ui/icons/index';
import { observer } from 'mobx-react-lite';
import { UpgradePrompt } from '../upgrade-prompt';
import { Verified } from './verified';
import { Verification } from './verification';
import { PlanKey } from '@onlook/stripe';

export const CustomDomain = observer(() => {
    const editorEngine = useEditorEngine();
    const domainsManager = useDomainsManager();
    const userManager = useUserManager();
    const plan = userManager.subscription.plan;

    const renderContent = () => {
        if (plan !== PlanKey.PRO) {
            return (
                <UpgradePrompt
                    onClick={() => {
                        editorEngine.state.settingsOpen = false;
                        editorEngine.state.plansOpen = true;
                    }}
                />
            );
        }
        const customDomain = domainsManager.domains.custom;
        if (customDomain) {
            return <Verified />;
        }
        return <Verification />;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-start gap-3">
                <h2 className="text-lg">Custom Domain</h2>
                {plan === PlanKey.PRO && (
                    <div className="flex h-5 items-center space-x-1 bg-blue-500/20 dark:bg-blue-500 px-2 rounded-full">
                        <Icons.Sparkles className="h-4 w-4" />
                        <span className="text-xs">Pro</span>
                    </div>
                )}
            </div>
            {renderContent()}
        </div>
    );
});
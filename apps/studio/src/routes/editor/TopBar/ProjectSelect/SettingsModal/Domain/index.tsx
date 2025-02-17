import { useEditorEngine, useUserManager } from '@/components/Context';
import { UsagePlanType } from '@onlook/models/usage';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import BaseDomain from './BaseDomain';
import { UpgradePrompt } from './UpgradePrompt';
import { Verification } from './Verification';

export const DomainTab = observer(
    ({ isOpen, setOpen }: { isOpen: boolean; setOpen: (open: boolean) => void }) => {
        const userManager = useUserManager();
        const editorEngine = useEditorEngine();
        const plan = userManager.subscription.plan;

        useEffect(() => {
            userManager.subscription.getPlanFromServer();
        }, [isOpen]);

        return (
            <div className="space-y-8">
                <BaseDomain />
                <Separator />
                <div className="space-y-4">
                    <div className="flex items-center justify-start gap-3">
                        <h2 className="text-lg font-medium">Custom Domain</h2>
                        {plan === UsagePlanType.PRO && (
                            <div className="flex h-5 items-center space-x-2 bg-blue-500/20 dark:bg-blue-500 px-2 rounded-full">
                                <Icons.Sparkles className="h-4 w-4" />
                                <span className="text-xs">Pro</span>
                            </div>
                        )}
                    </div>
                    {plan === UsagePlanType.PRO ? (
                        <Verification />
                    ) : (
                        <UpgradePrompt
                            onClick={() => {
                                setOpen(false);
                                editorEngine.isPlansOpen = true;
                            }}
                        />
                    )}
                </div>
            </div>
        );
    },
);

export default DomainTab;

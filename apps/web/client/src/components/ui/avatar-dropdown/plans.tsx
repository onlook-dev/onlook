'use client';

import { useUserManager } from '@/components/store/user';
import { PlanType } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Progress } from '@onlook/ui/progress';
import { observer } from 'mobx-react-lite';

export const PlanSection = observer(() => {
    const userManager = useUserManager();
    const plan = userManager.subscription.subscription?.plan;
    const planName = plan?.name;
    const planStatus = 'Trial';
    const type = plan?.type;
    const usage = type === PlanType.FREE ? userManager.subscription.usage.daily : userManager.subscription.usage.monthly;
    const usagePercent = usage.limitCount > 0 ? usage.usageCount / usage.limitCount * 100 : 0;

    const handleGetMoreCredits = () => {
        console.log('Open checkout page');
    };

    return (
        <div className="p-4 w-full text-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div>
                    <div className="text-sm">{planName}</div>
                    <div className="text-muted-foreground">{planStatus}</div>
                </div>
                <div className="text-right">
                    <div>{usage.usageCount} <span className="text-muted-foreground">of</span> {usage.limitCount}</div>
                    <div className="text-muted-foreground">{usage.period} chats used</div>
                </div>
            </div>
            <Progress value={usagePercent} className="w-full" />
            <Button className="w-full flex items-center justify-center gap-2 bg-blue-400 text-white hover:bg-blue-500" onClick={handleGetMoreCredits}>
                <Icons.Sparkles className="mr-1 h-4 w-4" /> Get more Credits
            </Button>
        </div>
    );
});
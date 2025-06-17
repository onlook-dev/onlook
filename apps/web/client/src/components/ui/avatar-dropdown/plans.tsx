'use client';

import { useUserManager } from '@/components/store/user';
import { PLANS } from '@onlook/stripe';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Progress } from '@onlook/ui/progress';
import { observer } from 'mobx-react-lite';

export const PlanSection = observer(() => {
    const userManager = useUserManager();
    const plan = userManager.subscription.plan;
    const planName = PLANS[plan].name;
    const planStatus = 'Trial';
    const dailyUsed = userManager.subscription.usage.daily_requests_count;
    const dailyLimit = userManager.subscription.usage.daily_requests_limit;
    const usagePercent = dailyLimit > 0 ? (dailyUsed / dailyLimit) * 100 : 0;

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
                    <div>{dailyUsed} <span className="text-muted-foreground">of</span> {dailyLimit}</div>
                    <div className="text-muted-foreground">daily chats used</div>
                </div>
            </div>
            <Progress value={usagePercent} className="w-full" />
            <Button className="w-full flex items-center justify-center gap-2 bg-blue-400 text-white hover:bg-blue-500" onClick={handleGetMoreCredits}>
                <Icons.Sparkles className="mr-1 h-4 w-4" /> Get more Credits
            </Button>
        </div>
    );
});
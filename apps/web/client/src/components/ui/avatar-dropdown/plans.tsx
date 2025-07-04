'use client';

import { useStateManager } from '@/components/store/state';
import { api } from '@/trpc/react';
import { FREE_PRODUCT_CONFIG, ProductType, ScheduledSubscriptionAction } from '@onlook/stripe';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Progress } from '@onlook/ui/progress';
import { observer } from 'mobx-react-lite';

export const UsageSection = observer(() => {
    const state = useStateManager();
    const { data: subscription } = api.subscription.get.useQuery();
    const { data: usageData } = api.usage.get.useQuery();

    const product = subscription?.product ?? FREE_PRODUCT_CONFIG;
    const price = product?.type === ProductType.FREE ? 'Trial' : 'Active';
    let usage = product?.type === ProductType.FREE ? usageData?.daily : usageData?.monthly;

    if (!usage) {
        return (
            <div className="p-4 w-full text-sm flex gap-4 items-center">
                <Icons.LoadingSpinner className="w-4 h-4 animate-spin" /> Calculating usage...
            </div>
        );
    }

    const usagePercent = usage.limitCount > 0 ? usage.usageCount / usage.limitCount * 100 : 0;

    const handleGetMoreCredits = () => {
        state.isSubscriptionModalOpen = true;
    };

    return (
        <div className="p-4 w-full text-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div>
                    <div className="text-sm">{product.name}</div>
                    <div className="text-muted-foreground">{price}</div>
                </div>
                <div className="text-right">
                    <div>{usage.usageCount} <span className="text-muted-foreground">of</span> {usage.limitCount}</div>
                    <div className="text-muted-foreground">{usage.period === 'day' ? 'daily' : 'monthly'} chats used</div>
                </div>
            </div>
            {subscription?.scheduledChange?.price && (
                <div className="text-amber text-mini text-balance">
                    Your {subscription.scheduledChange.price.monthlyMessageLimit} messages a month plan starts on {subscription.scheduledChange.scheduledChangeAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
            )}
            {subscription?.scheduledChange?.scheduledAction === ScheduledSubscriptionAction.CANCELLATION && (
                <div className="text-amber text-mini text-balance">
                    Your subscription will end on {subscription.scheduledChange.scheduledChangeAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
            )}
            <Progress value={usagePercent} className="w-full" />
            <Button className="w-full flex items-center justify-center gap-2 bg-blue-400 text-white hover:bg-blue-500" onClick={handleGetMoreCredits}>
                <Icons.Sparkles className="mr-1 h-4 w-4" /> Get more Credits
            </Button>
        </div>
    );
});
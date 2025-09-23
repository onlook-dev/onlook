'use client';

import { useStateManager } from '@/components/store/state';
import { api } from '@/trpc/react';
import { ScheduledSubscriptionAction } from '@onlook/stripe';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { toast } from '@onlook/ui/sonner';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useSubscription } from '../pricing-modal/use-subscription';
import { SubscriptionCancelModal } from './subscription-cancel-modal';

export const SubscriptionTab = observer(() => {
    const stateManager = useStateManager();
    const { subscription, isPro } = useSubscription();
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isManageDropdownOpen, setIsManageDropdownOpen] = useState(false);
    const [isLoadingPortal, setIsLoadingPortal] = useState(false);

    const manageSubscriptionMutation = api.subscription.manageSubscription.useMutation({
        onSuccess: (session) => {
            if (session?.url) {
                window.open(session.url, '_blank');
            }
        },
        onError: (error) => {
            console.error('Failed to create portal session:', error);
            toast.error('Failed to create portal session');
        },
        onSettled: () => {
            setIsLoadingPortal(false);
        }
    });

    const handleUpgradePlan = () => {
        stateManager.isSubscriptionModalOpen = true;
        stateManager.isSettingsModalOpen = false;
        setIsManageDropdownOpen(false);
    };

    const handleCancelSubscription = () => {
        setShowCancelModal(true);
        setIsManageDropdownOpen(false);
    };

    const handleConfirmCancel = async () => {
        // Cancellation logic will be implemented later
        setShowCancelModal(false);
        setIsLoadingPortal(true);
        await manageSubscriptionMutation.mutateAsync();
    };

    const handleManageBilling = async () => {
        if (isPro && subscription) {
            setIsLoadingPortal(true);
            await manageSubscriptionMutation.mutateAsync();
        }
    };

    return (
        <div className="flex flex-col p-8">
            {/* Subscription Section */}
            <div className="space-y-6">
                <div>
                    <h2 className="text-title3 mb-2">Subscription</h2>
                    <p className="text-muted-foreground text-small">
                        Manage your subscription plan and billing
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between py-4">
                        <div className="space-y-1">
                            <p className="text-regularPlus font-medium">Current Plan</p>
                            <p className="text-small text-muted-foreground">
                                {isPro ? (
                                    subscription?.scheduledChange?.scheduledAction === ScheduledSubscriptionAction.CANCELLATION ? (
                                        <>Pro plan (cancelling on {subscription.scheduledChange.scheduledChangeAt.toLocaleDateString()})</>
                                    ) : (
                                        <>Pro plan - {subscription?.price?.monthlyMessageLimit || 'Unlimited'} messages per month</>
                                    )
                                ) : (
                                    'You are currently on the Free plan'
                                )}
                            </p>
                        </div>
                        <DropdownMenu open={isManageDropdownOpen} onOpenChange={setIsManageDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    Manage
                                    <Icons.ChevronDown className="ml-1 h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {!isPro && (
                                    <DropdownMenuItem
                                        onClick={handleUpgradePlan}
                                        className="cursor-pointer"
                                    >
                                        <Icons.Sparkles className="mr-2 h-4 w-4" />
                                        Upgrade plan
                                    </DropdownMenuItem>
                                )}
                                {isPro && subscription?.scheduledChange?.scheduledAction !== ScheduledSubscriptionAction.CANCELLATION && (
                                    <DropdownMenuItem
                                        onClick={handleUpgradePlan}
                                        className="cursor-pointer"
                                    >
                                        <Icons.Sparkles className="mr-2 h-4 w-4" />
                                        Change plan
                                    </DropdownMenuItem>
                                )}
                                {isPro && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            subscription?.scheduledChange?.scheduledAction === ScheduledSubscriptionAction.CANCELLATION ? handleManageBilling() : handleCancelSubscription();
                                        }}
                                        disabled={isLoadingPortal}
                                        className="cursor-pointer text-red-200 hover:text-red-100 group"
                                    >
                                        <Icons.CrossS className="mr-2 h-4 w-4 text-red-200 group-hover:text-red-100" />
                                        {subscription?.scheduledChange?.scheduledAction === ScheduledSubscriptionAction.CANCELLATION ? 'Reactivate subscription' : 'Cancel subscription'}
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <Separator />

                    {/* Payment Section */}
                    <div className="flex items-center justify-between py-4">
                        <div className="space-y-1">
                            <p className="text-regularPlus font-medium">Payment</p>
                            <p className="text-small text-muted-foreground">
                                Manage your payment methods and billing details
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleManageBilling}
                            disabled={isLoadingPortal || !isPro}
                        >
                            {isLoadingPortal ? 'Opening...' : 'Manage'}
                        </Button>
                    </div>
                </div>
            </div>
            <SubscriptionCancelModal
                open={showCancelModal}
                onOpenChange={setShowCancelModal}
                onConfirmCancel={handleConfirmCancel}
            />
        </div>
    );
});

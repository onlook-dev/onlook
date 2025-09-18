'use client';

import { useStateManager } from '@/components/store/state';
import { api } from '@/trpc/react';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@onlook/ui/dialog';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useSubscription } from '../pricing-modal/use-subscription';
import { ProductType, ScheduledSubscriptionAction } from '@onlook/stripe';

const STRIPE_BILLING_PORTAL_URL = 'https://billing.stripe.com/p/login/7sY6oG8u8cS2aUMenO9ws00';

export const SubscriptionTab = observer(() => {
    const stateManager = useStateManager();
    const { data: user } = api.user.get.useQuery();
    const { subscription, isPro } = useSubscription();
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isManageDropdownOpen, setIsManageDropdownOpen] = useState(false);
    const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);

    const handleUpgradePlan = () => {
        stateManager.isSubscriptionModalOpen = true;
        stateManager.isSettingsModalOpen = false;
        setIsManageDropdownOpen(false);
    };

    const handleCancelSubscription = () => {
        setShowCancelModal(true);
        setIsManageDropdownOpen(false);
    };

    const handleConfirmCancel = () => {
        // Cancellation logic will be implemented later
        setShowCancelModal(false);
    };

    const handleManageBilling = () => {
        window.open(STRIPE_BILLING_PORTAL_URL, '_blank');
        setIsPaymentDropdownOpen(false);
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
                                        onClick={handleCancelSubscription}
                                        className="cursor-pointer text-destructive"
                                    >
                                        <Icons.CrossS className="mr-2 h-4 w-4" />
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
                        <DropdownMenu open={isPaymentDropdownOpen} onOpenChange={setIsPaymentDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    Manage
                                    <Icons.ChevronDown className="ml-1 h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem 
                                    onClick={handleManageBilling}
                                    className="cursor-pointer"
                                >
                                    <Icons.CreditCard className="mr-2 h-4 w-4" />
                                    Manage billing
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Cancel Subscription Modal */}
            <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Cancel Subscription</DialogTitle>
                        <DialogDescription className="pt-2">
                            Are you sure you want to cancel your subscription? You'll lose access to all premium features at the end of your current billing period.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowCancelModal(false)}
                        >
                            Keep subscription
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmCancel}
                        >
                            Cancel subscription
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});
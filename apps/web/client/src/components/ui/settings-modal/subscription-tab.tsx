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
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useSubscription } from '../pricing-modal/use-subscription';
import { ProductType, ScheduledSubscriptionAction } from '@onlook/stripe';

export const SubscriptionTab = observer(() => {
    const stateManager = useStateManager();
    const { data: user } = api.user.get.useQuery();
    const { subscription, isPro } = useSubscription();
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isManageDropdownOpen, setIsManageDropdownOpen] = useState(false);
    const [isLoadingPortal, setIsLoadingPortal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteEmail, setDeleteEmail] = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [showFinalDeleteConfirm, setShowFinalDeleteConfirm] = useState(false);

    const manageSubscriptionMutation = api.subscription.manageSubscription.useMutation({
        onSuccess: (session) => {
            if (session?.url) {
                window.open(session.url, '_blank');
            }
        },
        onError: (error) => {
            console.error('Failed to create portal session:', error);
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

    const handleConfirmCancel = () => {
        // Cancellation logic will be implemented later
        setShowCancelModal(false);
    };

    const handleManageBilling = async () => {
        if (isPro && subscription) {
            setIsLoadingPortal(true);
            await manageSubscriptionMutation.mutateAsync();
        }
    };

    const handleDeleteAccount = () => {
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = () => {
        setShowDeleteModal(false);
        setShowFinalDeleteConfirm(true);
    };

    const handleFinalDeleteAccount = () => {
        // Account deletion logic will be implemented later
        console.log('Account deletion requested');
        setShowFinalDeleteConfirm(false);
        // Reset form
        setDeleteEmail('');
        setDeleteConfirmText('');
    };

    const canProceedWithDelete = deleteEmail === user?.email && deleteConfirmText === 'DELETE';

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

                    <Separator />

                    {/* Delete Account Section */}
                    <div className="flex items-center justify-between py-4">
                        <div className="space-y-1">
                            <p className="text-regularPlus font-medium">Delete Account</p>
                            <p className="text-small text-muted-foreground">
                                Permanently delete your account and all associated data
                            </p>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleDeleteAccount}
                            className="text-red-200 hover:text-red-100 border-red-200 hover:border-red-100 hover:bg-red-500/10"
                        >
                            Delete
                        </Button>
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
                    <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowCancelModal(false)}
                            className="order-2 sm:order-1"
                        >
                            Keep Subscription
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleConfirmCancel}
                            className="order-1 sm:order-2 text-red-200 hover:text-red-100 hover:bg-red-500/10 border-red-200 hover:border-red-100"
                        >
                            Cancel Subscription
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Account Confirmation Modal */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Delete account - are you sure?</DialogTitle>
                        <DialogDescription className="pt-2 space-y-2">
                            <p>Deleting your account will:</p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                <li>Permanently delete your account and prevent you from creating new projects.</li>
                                <li>Delete all of your projects from Onlook's servers.</li>
                                <li>You cannot create a new account using the same email address.</li>
                                <li>This will also permanently delete your chat history and other data associated with your account.</li>
                                <li>Deleting an account does not automatically cancel your subscription or entitled set of paid features.</li>
                                <li>This is final and cannot be undone.</li>
                            </ul>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="delete-email">Please type your account email:</Label>
                            <Input
                                id="delete-email"
                                type="email"
                                value={deleteEmail}
                                onChange={(e) => setDeleteEmail(e.target.value)}
                                placeholder={user?.email || ''}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="delete-confirm">To proceed, type "DELETE" in the input field below:</Label>
                            <Input
                                id="delete-confirm"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                                className="w-full"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteModal(false);
                                setDeleteEmail('');
                                setDeleteConfirmText('');
                            }}
                            className="order-2 sm:order-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteConfirm}
                            disabled={!canProceedWithDelete}
                            className="order-1 sm:order-2 bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
                        >
                            {canProceedWithDelete ? 'Delete Account' : 'Locked'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Final Delete Confirmation Modal */}
            <Dialog open={showFinalDeleteConfirm} onOpenChange={setShowFinalDeleteConfirm}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Final confirmation</DialogTitle>
                        <DialogDescription className="pt-2">
                            This is your last chance to cancel. Are you absolutely sure you want to permanently delete your account and all associated data?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowFinalDeleteConfirm(false);
                                setDeleteEmail('');
                                setDeleteConfirmText('');
                            }}
                            className="order-2 sm:order-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleFinalDeleteAccount}
                            className="order-1 sm:order-2 bg-red-600 hover:bg-red-700 text-white"
                        >
                            Yes, Delete My Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});

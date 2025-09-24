'use client';

import { api } from '@/trpc/react';
import { Routes } from '@/utils/constants';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@onlook/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@onlook/ui/dialog';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { toast } from '@onlook/ui/sonner';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export const UserDeleteSection = observer(() => {
    const router = useRouter();
    const { data: user } = api.user.get.useQuery();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteEmail, setDeleteEmail] = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [showFinalDeleteConfirm, setShowFinalDeleteConfirm] = useState(false);
    const { mutateAsync: deleteUser } = api.user.delete.useMutation();

    const handleDeleteAccount = () => {
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = () => {
        setShowDeleteModal(false);
        setShowFinalDeleteConfirm(true);
    };

    const handleFinalDeleteAccount = async () => {
        try {
            await deleteUser();
            await handleDeleteSuccess();
        } catch (error) {
            toast.error('Failed to delete account');
            console.error('Failed to delete account', error);
        }
    };

    const handleDeleteSuccess = async () => {
        toast.success('Account deleted successfully');

        // Reset form
        setShowFinalDeleteConfirm(false);
        setDeleteEmail('');
        setDeleteConfirmText('');

        // Sign out
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push(Routes.LOGIN);
    };

    const canProceedWithDelete = deleteEmail === user?.email && deleteConfirmText === 'DELETE';

    return (
        <>
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

            {/* Delete Account Confirmation Modal */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Delete account - are you sure?</DialogTitle>
                        <DialogDescription asChild className="pt-2">
                            <div className="space-y-2">
                                <p>Deleting your account will:</p>
                                <div className="space-y-1 text-sm">
                                    <div className="flex items-start gap-2">
                                        <span className="mt-0.5">•</span>
                                        <span>Permanently delete your account and prevent you from creating new projects.</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="mt-0.5">•</span>
                                        <span>Delete all of your projects from Onlook's servers.</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="mt-0.5">•</span>
                                        <span>You cannot create a new account using the same email address.</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="mt-0.5">•</span>
                                        <span>This will also permanently delete your chat history and other data associated with your account.</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="mt-0.5">•</span>
                                        <span>Deleting an account does not automatically cancel your subscription or entitled set of paid features.</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="mt-0.5">•</span>
                                        <span>This is final and cannot be undone.</span>
                                    </div>
                                </div>
                            </div>
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
        </>
    );
});
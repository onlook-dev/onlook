'use client';

import { useAuthContext } from '@/app/auth/auth-context';
import { api } from '@/trpc/react';
import { Button } from '@onlook/ui/button';

export function SignIn() {
    const { data: user } = api.user.get.useQuery();
    const { setIsAuthModalOpen } = useAuthContext();

    const handleSignIn = () => {
        setIsAuthModalOpen(true);
    };

    // If user is already signed in, don't show the button
    if (user?.id) {
        return null;
    }

    return (
        <Button
            onClick={handleSignIn}
            variant="outline"
        >
            Sign in
        </Button>
    );
}

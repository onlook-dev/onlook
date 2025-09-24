import { useTranslations } from 'next-intl';

import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';

import { transKeys } from '@/i18n/keys';
import { useAuthContext } from '../auth/auth-context';
import { GithubLoginButton, GoogleLoginButton } from './login-button';

export function AuthModal() {
    const { setIsAuthModalOpen, isAuthModalOpen } = useAuthContext();
    const t = useTranslations();

    return (
        <AlertDialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
            <AlertDialogContent className="!max-w-sm bg-black">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-center text-xl font-normal">
                        {t(transKeys.welcome.login.loginToEdit)}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-balance">
                        {t(transKeys.welcome.login.shareProjects)}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-col space-y-2">
                    <GithubLoginButton className="!bg-black" />
                    <GoogleLoginButton className="!bg-black" />
                </div>
                <AlertDialogFooter className="flex w-full !justify-center">
                    <Button variant={'ghost'} onClick={() => setIsAuthModalOpen(false)}>
                        {t(transKeys.projects.actions.close)}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

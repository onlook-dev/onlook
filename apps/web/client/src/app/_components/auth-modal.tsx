import { transKeys } from '@/i18n/keys';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import { useTranslations } from 'next-intl';
import { useAuthContext } from '../auth/auth-context';
import { LoginButton } from './login-button';
import { SignInMethod } from '@onlook/models/auth';
import { Icons } from '@onlook/ui/icons';

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
                <div className="space-y-2 flex flex-col">
                    <LoginButton
                        className="!bg-black"
                        method={SignInMethod.GITHUB}
                        icon={<Icons.GitHubLogo className="w-4 h-4 mr-2" />}
                        translationKey="github"
                        providerName="GitHub"
                    />
                    <LoginButton
                        className="!bg-black"
                        method={SignInMethod.GOOGLE}
                        icon={<Icons.GoogleLogo viewBox="0 0 24 24" className="w-4 h-4 mr-2" />}
                        translationKey="google"
                        providerName="Google"
                    />
                </div>
                <AlertDialogFooter className="flex !justify-center w-full">
                    <Button variant={'ghost'} onClick={() => setIsAuthModalOpen(false)}>
                        {t(transKeys.projects.actions.close)}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

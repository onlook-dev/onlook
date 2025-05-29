import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { GithubLoginButton } from './login-button';
import { GoogleLoginButton } from './login-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@onlook/ui/dialog';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { useAuthContext } from '../auth/AuthContext';
import { useTranslations } from 'next-intl';

export default function AuthModal() {
    const { setIsAuthModalOpen, isAuthModalOpen } = useAuthContext();
    const t = useTranslations();
    return (
        <AlertDialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
            <AlertDialogContent className="!max-w-sm bg-black">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-center text-xl font-normal">
                        {t('welcome.login.loginToPublish')}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        {t('welcome.login.shareProjects')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 flex flex-col">
                    <GithubLoginButton className="!bg-black" />
                    <GoogleLoginButton className="!bg-black" />
                </div>
                <AlertDialogFooter className="flex !justify-center w-full">
                    <Button variant={'ghost'} onClick={() => setIsAuthModalOpen(false)}>
                        {t('projects.actions.close')}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

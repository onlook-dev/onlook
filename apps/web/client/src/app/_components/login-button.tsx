import { transKeys } from '@/i18n/keys';
import { SignInMethod } from '@onlook/models/auth';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { useTranslations } from 'next-intl';
import { useAuthContext } from '../auth/auth-context';

export const GithubLoginButton = ({
    className,
}: {
    className?: string;
}) => {
    const t = useTranslations();
    const { lastSignInMethod, handleLogin, isPending } = useAuthContext();
    const isLastSignInMethod = lastSignInMethod === SignInMethod.GITHUB;

    return (
        <div className={cn('flex flex-col items-center w-full', className)}>
            <Button
                variant="outline"
                className={`w-full items-center justify-center text-active text-small ${isLastSignInMethod ? 'bg-teal-100 dark:bg-teal-950 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-100 text-small hover:bg-teal-200/50 dark:hover:bg-teal-800 hover:border-teal-500/70 dark:hover:border-teal-500' : 'bg-background-onlook'}`}
                onClick={() => handleLogin(SignInMethod.GITHUB)}
                disabled={isPending}
            >
                {isPending ? (
                    <Icons.LoadingSpinner className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Icons.GitHubLogo className="w-4 h-4 mr-2" />
                )}
                {t(transKeys.welcome.login.github)}
            </Button>
            {isLastSignInMethod && (
                <p className="text-teal-500 text-small mt-1">{t(transKeys.welcome.login.lastUsed)}</p>
            )}
        </div>
    );
};

export const GoogleLoginButton = ({
    className,
}: {
    className?: string;
}) => {
    const t = useTranslations();
    const { lastSignInMethod, handleLogin, isPending } = useAuthContext();
    const isLastSignInMethod = lastSignInMethod === SignInMethod.GOOGLE;

    return (
        <div className={cn('flex flex-col items-center w-full', className)}>
            <Button
                variant="outline"
                className={`w-full items-center justify-center text-active text-small ${isLastSignInMethod ? 'bg-teal-100 dark:bg-teal-950 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-100 text-small hover:bg-teal-200/50 dark:hover:bg-teal-800 hover:border-teal-500/70 dark:hover:border-teal-500' : 'bg-background-onlook'}`}
                onClick={() => handleLogin(SignInMethod.GOOGLE)}
                disabled={isPending}
            >
                {isPending ? (
                    <Icons.LoadingSpinner className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Icons.GoogleLogo viewBox="0 0 24 24" className="w-4 h-4 mr-2" />
                )}
                {t(transKeys.welcome.login.google)}
            </Button>
            {isLastSignInMethod && (
                <p className="text-teal-500 text-small mt-1">{t(transKeys.welcome.login.lastUsed)}</p>
            )}
        </div>
    );
};

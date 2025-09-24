import { useTranslations } from 'next-intl';

import { SignInMethod } from '@onlook/models/auth';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

import { transKeys } from '@/i18n/keys';
import { useAuthContext } from '../auth/auth-context';

export const GithubLoginButton = ({
    className,
    returnUrl,
}: {
    className?: string;
    returnUrl?: string | null;
}) => {
    const t = useTranslations();
    const { lastSignInMethod, handleLogin, signingInMethod } = useAuthContext();
    const isLastSignInMethod = lastSignInMethod === SignInMethod.GITHUB;
    const isSigningIn = signingInMethod === SignInMethod.GITHUB;

    return (
        <div className={cn('flex w-full flex-col items-center', className)}>
            <Button
                variant="outline"
                className={cn(
                    'text-active text-small w-full items-center justify-center',
                    isLastSignInMethod
                        ? 'text-small border-teal-300 bg-teal-100 text-teal-900 hover:border-teal-500/70 hover:bg-teal-200/50 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-100 dark:hover:border-teal-500 dark:hover:bg-teal-800'
                        : 'bg-background-onlook',
                )}
                onClick={() => handleLogin(SignInMethod.GITHUB, returnUrl ?? null)}
                disabled={!!signingInMethod}
            >
                {isSigningIn ? (
                    <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Icons.GitHubLogo className="mr-2 h-4 w-4" />
                )}
                {t(transKeys.welcome.login.github)}
            </Button>
            {isLastSignInMethod && (
                <p className="text-small mt-1 text-teal-500">
                    {t(transKeys.welcome.login.lastUsed)}
                </p>
            )}
        </div>
    );
};

export const GoogleLoginButton = ({
    className,
    returnUrl,
}: {
    className?: string;
    returnUrl?: string | null;
}) => {
    const t = useTranslations();
    const { lastSignInMethod, handleLogin, signingInMethod } = useAuthContext();
    const isLastSignInMethod = lastSignInMethod === SignInMethod.GOOGLE;
    const isSigningIn = signingInMethod === SignInMethod.GOOGLE;

    return (
        <div className={cn('flex w-full flex-col items-center', className)}>
            <Button
                variant="outline"
                className={cn(
                    'text-active text-small w-full items-center justify-center',
                    isLastSignInMethod
                        ? 'text-small border-teal-300 bg-teal-100 text-teal-900 hover:border-teal-500/70 hover:bg-teal-200/50 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-100 dark:hover:border-teal-500 dark:hover:bg-teal-800'
                        : 'bg-background-onlook',
                )}
                onClick={() => handleLogin(SignInMethod.GOOGLE, returnUrl ?? null)}
                disabled={!!signingInMethod}
            >
                {isSigningIn ? (
                    <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Icons.GoogleLogo viewBox="0 0 24 24" className="mr-2 h-4 w-4" />
                )}
                {t(transKeys.welcome.login.google)}
            </Button>
            {isLastSignInMethod && (
                <p className="text-small mt-1 text-teal-500">
                    {t(transKeys.welcome.login.lastUsed)}
                </p>
            )}
        </div>
    );
};

export const DevLoginButton = ({
    className,
    returnUrl,
}: {
    className?: string;
    returnUrl: string | null;
}) => {
    const t = useTranslations();
    const { handleDevLogin, signingInMethod } = useAuthContext();
    const isSigningIn = signingInMethod === SignInMethod.DEV;

    return (
        <Button
            variant="outline"
            className="text-active text-small w-full"
            onClick={() => handleDevLogin(returnUrl)}
            disabled={!!signingInMethod}
        >
            {isSigningIn ? (
                <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                'DEV MODE: Sign in as demo user'
            )}
        </Button>
    );
};

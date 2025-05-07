'use client';

import { Dunes } from '@/components/ui/dunes';
import { SignInMethod } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import localforage from 'localforage';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { login } from './actions';

const LAST_SIGN_IN_METHOD_KEY = 'lastSignInMethod';

export default function LoginPage() {
    const t = useTranslations();
    const [lastSignInMethod, setLastSignInMethod] = useState<SignInMethod | null>(null);
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        localforage.getItem(LAST_SIGN_IN_METHOD_KEY).then((lastSignInMethod: unknown) => {
            setLastSignInMethod(lastSignInMethod as SignInMethod | null);
        });
    }, []);

    const handleLogin = async (method: SignInMethod) => {
        setIsPending(true);
        await login(method);

        localforage.setItem(LAST_SIGN_IN_METHOD_KEY, method);
        setTimeout(() => {
            setIsPending(false);
        }, 5000);
    };

    return (
        <div className="flex h-screen w-screen">
            <div className="flex flex-col justify-between w-full h-full max-w-xl p-16 space-y-8 overflow-auto">
                <div className="flex items-center space-x-2">
                    <Icons.OnlookTextLogo viewBox="0 0 139 17" />
                </div>
                <div className="space-y-8">
                    <div className="space-y-2 uppercase rounded-full p-1 px-2 w-auto inline-block text-micro border-[0.5px] text-blue-400 border-blue-400">
                        <p>{t('welcome.alpha')}</p>
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-title1 leading-tight">
                            {lastSignInMethod ? t('welcome.titleReturn') : t('welcome.title')}
                        </h1>
                        <p className="text-foreground-onlook text-regular">
                            {t('welcome.description')}
                        </p>
                    </div>
                    <div className="space-x-2 flex flex-row">
                        <div className="flex flex-col items-center w-full">
                            <Button
                                variant="outline"
                                className={`w-full text-active text-small ${lastSignInMethod === SignInMethod.GITHUB ? 'bg-teal-100 dark:bg-teal-950 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-100 text-small hover:bg-teal-200/50 dark:hover:bg-teal-800 hover:border-teal-500/70 dark:hover:border-teal-500' : 'bg-background-onlook'}`}
                                onClick={() => handleLogin(SignInMethod.GITHUB)}
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <Icons.Shadow className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Icons.GitHubLogo className="w-4 h-4 mr-2" />
                                )}
                                {t('welcome.login.github')}
                            </Button>
                            {lastSignInMethod === SignInMethod.GITHUB && (
                                <p className="text-teal-500 text-small mt-1">
                                    {t('welcome.login.lastUsed')}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col items-center w-full">
                            <Button
                                variant="outline"
                                className={`w-full text-active text-small ${lastSignInMethod === SignInMethod.GOOGLE ? 'bg-teal-100 dark:bg-teal-950 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-100 text-small hover:bg-teal-200/50 dark:hover:bg-teal-800 hover:border-teal-500/70 dark:hover:border-teal-500' : 'bg-background-onlook'}`}
                                onClick={() => handleLogin(SignInMethod.GOOGLE)}
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <Icons.Shadow className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Icons.GoogleLogo
                                        viewBox="0 0 24 24"
                                        className="w-4 h-4 mr-2"
                                    />
                                )}
                                {t('welcome.login.google')}
                            </Button>
                            {lastSignInMethod === SignInMethod.GOOGLE && (
                                <p className="text-teal-500 text-small mt-1">
                                    {t('welcome.login.lastUsed')}
                                </p>
                            )}
                        </div>
                    </div>
                    <p className="text-small text-foreground-onlook">
                        {t('welcome.terms.agreement')}{' '}
                        <button
                            onClick={() =>
                                window.open('https://onlook.com/privacy-policy', '_blank')
                            }
                            className="text-gray-300 hover:text-gray-50 underline transition-colors duration-200"
                        >
                            {t('welcome.terms.privacy')}
                        </button>{' '}
                        {t('welcome.terms.and')}{' '}
                        <button
                            onClick={() =>
                                window.open('https://onlook.com/terms-of-service', '_blank')
                            }
                            className="text-gray-300 hover:text-gray-50 underline transition-colors duration-200"
                        >
                            {t('welcome.terms.tos')}
                        </button>
                    </p>
                </div>
                <div className="flex flex-row space-x-1 text-small text-gray-600">
                    <p>{t('welcome.version', { version: '1.0.0' })}</p>
                </div>
            </div>
            <Dunes />
        </div>
    );
}

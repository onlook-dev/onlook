'use client';

import { Dunes } from '@/components/ui/dunes';
import { transKeys } from '@/i18n/keys';
import { Routes } from '@/utils/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GithubLoginButton, GoogleLoginButton } from '../_components/login-button';
import { useAuthContext } from '../auth/auth-context';

export default function LoginPage() {
    const isDev = process.env.NODE_ENV === 'development';
    const t = useTranslations();
    const { handleDevLogin } = useAuthContext();

    return (
        <div className="flex h-screen w-screen">
            <div className="flex flex-col justify-between w-full h-full max-w-xl p-16 space-y-8 overflow-auto">
                <div className="flex items-center space-x-2">
                    <Link href={Routes.HOME} className="hover:opacity-80 transition-opacity">
                        <Icons.OnlookTextLogo viewBox="0 0 139 17" />
                    </Link>
                </div>
                <div className="space-y-8">
                    <div className="space-y-2 uppercase rounded-full p-1 px-2 w-auto inline-block text-micro border-[0.5px] text-blue-400 border-blue-400">
                        <p>Beta</p>
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-title1 leading-tight">
                            {t(transKeys.welcome.title)}
                        </h1>
                        <p className="text-foreground-onlook text-regular">
                            {t(transKeys.welcome.description)}
                        </p>
                    </div>
                    <div className="space-x-2 flex flex-row">
                        <GithubLoginButton />
                        <GoogleLoginButton />
                    </div>
                    {isDev && (
                        <Button variant="outline" className="w-full text-active text-small" onClick={handleDevLogin}>
                            DEV MODE: Sign in as demo user
                        </Button>
                    )}
                    <p className="text-small text-foreground-onlook">
                        {t(transKeys.welcome.terms.agreement)}{' '}
                        <button
                            onClick={() =>
                                window.open('https://onlook.com/privacy-policy', '_blank')
                            }
                            className="text-gray-300 hover:text-gray-50 underline transition-colors duration-200"
                        >
                            {t(transKeys.welcome.terms.privacy)}
                        </button>{' '}
                        {t(transKeys.welcome.terms.and)}{' '}
                        <button
                            onClick={() =>
                                window.open('https://onlook.com/terms-of-service', '_blank')
                            }
                            className="text-gray-300 hover:text-gray-50 underline transition-colors duration-200"
                        >
                            {t(transKeys.welcome.terms.tos)}
                        </button>
                    </p>
                </div>
                <div className="flex flex-row space-x-1 text-small text-gray-600">
                    <p>{t(transKeys.welcome.version, { version: '1.0.0' })}</p>
                </div>
            </div>
            <Dunes />
        </div>
    );
}

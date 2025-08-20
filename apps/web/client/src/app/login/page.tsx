'use client';

import { useGetBackground } from '@/hooks/use-get-background';
import { transKeys } from '@/i18n/keys';
import { LocalForageKeys, Routes } from '@/utils/constants';
import { Icons } from '@onlook/ui/icons';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DevLoginButton, GithubLoginButton, GoogleLoginButton } from '../_components/login-button';

export default function LoginPage() {
    const isDev = process.env.NODE_ENV === 'development';
    const t = useTranslations();
    const backgroundUrl = useGetBackground('login');
    const returnUrl = useSearchParams().get(LocalForageKeys.RETURN_URL);

    return (
        <div className="flex h-screen w-screen" >
            <div className="flex flex-col justify-between w-full h-full max-w-xl p-16 space-y-8 overflow-auto">
                <div className="flex items-center space-x-2">
                    <Link href={Routes.HOME} className="hover:opacity-80 transition-opacity">
                        <Icons.OnlookTextLogo viewBox="0 0 139 17" />
                    </Link>
                </div>
                <div className="space-y-8">
                    <div className="space-y-4">
                        <h1 className="text-title1 leading-tight">
                            {t(transKeys.welcome.title)}
                        </h1>
                        <p className="text-foreground-onlook text-regular">
                            {t(transKeys.welcome.description)}
                        </p>
                    </div>
                    <div className="space-x-2 flex flex-row">
                        <GithubLoginButton returnUrl={returnUrl} />
                        <GoogleLoginButton returnUrl={returnUrl} />
                    </div>
                    {isDev && <DevLoginButton returnUrl={returnUrl} />}
                    <p className="text-small text-foreground-onlook">
                        {t(transKeys.welcome.terms.agreement)}{' '}
                        <Link
                            href="https://onlook.com/privacy-policy"
                            target="_blank"
                            className="text-gray-300 hover:text-gray-50 underline transition-colors duration-200"
                        >
                            {t(transKeys.welcome.terms.privacy)}
                        </Link>
                        {' '}
                        {t(transKeys.welcome.terms.and)}{' '}
                        <Link
                            href="https://onlook.com/terms-of-service"
                            target="_blank"
                            className="text-gray-300 hover:text-gray-50 underline transition-colors duration-200"
                        >
                            {t(transKeys.welcome.terms.tos)}
                        </Link>
                    </p>
                </div>
                <div className="flex flex-row space-x-1 text-small text-gray-600">
                    <p>{t(transKeys.welcome.version, { version: '1.0.0' })}</p>
                </div>
            </div>
            <div className="hidden w-full lg:block md:block m-6">
                <Image
                    className="w-full h-full object-cover rounded-xl hidden dark:flex"
                    src={backgroundUrl}
                    alt="Onlook dunes dark"
                    width={1000}
                    height={1000}
                />
            </div>
        </div>
    );
}

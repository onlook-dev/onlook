'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Icons } from '@onlook/ui/icons';

import { useGetBackground } from '@/hooks/use-get-background';
import { transKeys } from '@/i18n/keys';
import { LocalForageKeys, Routes } from '@/utils/constants';
import { DevLoginButton, GithubLoginButton, GoogleLoginButton } from '../_components/login-button';

export default function LoginPage() {
    const isDev = process.env.NODE_ENV === 'development';
    const t = useTranslations();
    const backgroundUrl = useGetBackground('login');
    const returnUrl = useSearchParams().get(LocalForageKeys.RETURN_URL);

    return (
        <div className="flex h-screen w-screen justify-center">
            <div className="flex h-full w-full max-w-xl flex-col justify-between space-y-8 overflow-auto p-16">
                <div className="flex items-center space-x-2">
                    <Link href={Routes.HOME} className="transition-opacity hover:opacity-80">
                        <Icons.OnlookTextLogo viewBox="0 0 139 17" />
                    </Link>
                </div>
                <div className="space-y-8">
                    <div className="space-y-4">
                        <h1 className="text-title1 leading-tight">{t(transKeys.welcome.title)}</h1>
                        <p className="text-foreground-onlook text-regular">
                            {t(transKeys.welcome.description)}
                        </p>
                    </div>
                    <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
                        <GithubLoginButton returnUrl={returnUrl} />
                        <GoogleLoginButton returnUrl={returnUrl} />
                    </div>
                    {isDev && <DevLoginButton returnUrl={returnUrl} />}
                    <p className="text-small text-foreground-onlook">
                        {t(transKeys.welcome.terms.agreement)}{' '}
                        <Link
                            href="https://onlook.com/privacy-policy"
                            target="_blank"
                            className="text-gray-300 underline transition-colors duration-200 hover:text-gray-50"
                        >
                            {t(transKeys.welcome.terms.privacy)}
                        </Link>{' '}
                        {t(transKeys.welcome.terms.and)}{' '}
                        <Link
                            href="https://onlook.com/terms-of-service"
                            target="_blank"
                            className="text-gray-300 underline transition-colors duration-200 hover:text-gray-50"
                        >
                            {t(transKeys.welcome.terms.tos)}
                        </Link>
                    </p>
                </div>
                <div className="text-small flex flex-row space-x-1 text-gray-600">
                    <p>{t(transKeys.welcome.version, { version: '1.0.0' })}</p>
                </div>
            </div>
            <div className="m-6 hidden w-full md:block">
                <Image
                    className="h-full w-full rounded-xl object-cover"
                    src={backgroundUrl}
                    alt="Onlook dunes dark"
                    width={1000}
                    height={1000}
                />
            </div>
        </div>
    );
}

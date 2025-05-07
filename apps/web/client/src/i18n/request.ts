import { Language } from '@onlook/constants';
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export default getRequestConfig(async () => {
    const locale = await getLanguage();
    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default,
    };
});

export async function getLanguage(): Promise<Language> {
    const cookieStore = await cookies();
    const locale = cookieStore.get('locale');

    if (locale) {
        return locale.value as Language;
    } else {
        return detectLanguage();
    }
}

async function detectLanguage(): Promise<Language> {
    const headersList = await headers();
    const acceptLanguage = headersList.get('accept-language') || '';

    // Try to find a matching language from header preferences
    for (const lang of acceptLanguage.split(',')) {
        // Get base language code (e.g., 'en' from 'en-US')
        const langCode = lang.split('-')[0];

        if (Object.values(Language).includes(langCode as Language)) {
            return langCode as Language;
        }
    }
    return Language.English;
}

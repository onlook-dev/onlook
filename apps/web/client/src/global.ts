import type { Language } from '@onlook/constants';

import type messages from '../messages/en.json';

declare module 'next-intl' {
    interface AppConfig {
        Locale: Language;
        Messages: typeof messages;
    }
}

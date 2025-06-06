import { Language } from '@onlook/constants';
import messages from './i18n/messages/en.json';

declare module 'next-intl' {
    interface AppConfig {
        Locale: Language;
        Messages: typeof messages;
    }
}

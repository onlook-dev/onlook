import { Language } from '@onlook/constants';
import messages from '../messages/en.json';

declare module 'next-intl' {
    interface AppConfig {
        Locale: Language;
        Messages: typeof messages;
    }
}

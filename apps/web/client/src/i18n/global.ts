import { Language } from '@onlook/constants';
import messages from '../../messages/en';

declare module 'next-intl' {
  interface AppConfig {
    Locale: `${Language}`;
    Messages: typeof messages;
  }
}

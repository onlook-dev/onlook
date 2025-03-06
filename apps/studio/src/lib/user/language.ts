import i18n from '@/i18n';
import { Language } from '@onlook/models/constants';

export class LanguageManager {
    restore() {
        const savedLanguage = localStorage.getItem('app-language');
        if (savedLanguage) {
            i18n.changeLanguage(savedLanguage);
        }
    }

    update(language: Language) {
        i18n.changeLanguage(language);
        localStorage.setItem('app-language', language);
    }
}

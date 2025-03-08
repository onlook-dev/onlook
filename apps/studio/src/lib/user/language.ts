import i18n from '@/i18n';
import { Language } from '@onlook/models/constants';

export class LanguageManager {
    restore() {
        const savedLanguage = localStorage.getItem('app-language');
        if (savedLanguage) {
            i18n.changeLanguage(savedLanguage);
        } else {
            this.detectBrowserLanguage();
        }
    }

    update(language: Language) {
        i18n.changeLanguage(language);
        localStorage.setItem('app-language', language);
    }

    private detectBrowserLanguage() {
        const browserLanguages = navigator.languages || [navigator.language];

        // Try to find a matching language from browser preferences
        for (const browserLang of browserLanguages) {
            const langCode = browserLang.split('-')[0]; // Get base language code (e.g., 'en' from 'en-US')

            if (langCode === Language.English) {
                this.update(Language.English);
                return;
            } else if (langCode === Language.Japanese) {
                this.update(Language.Japanese);
                return;
            } else if (langCode === Language.Chinese) {
                this.update(Language.Chinese);
                return;
            }
        }

        // Default to English if no match found
        this.update(Language.English);
    }
}

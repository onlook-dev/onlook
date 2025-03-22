import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en/translation.json';
import jaTranslation from './locales/ja/translation.json';
import krTranslation from './locales/kr/translation.json';
import zhTranslation from './locales/zh/translation.json';

const resources = {
    en: {
        translation: enTranslation,
    },
    ja: {
        translation: jaTranslation,
    },
    zh: {
        translation: zhTranslation,
    },
    kr: {
        translation: krTranslation,
    },
};

i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;

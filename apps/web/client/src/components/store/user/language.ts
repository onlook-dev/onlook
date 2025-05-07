import { Language } from '@onlook/constants';
import localforage from 'localforage';

export class LanguageManager {
    constructor() {}

    update(language: Language) {
        localforage.setItem('app-language', language);
    }
}

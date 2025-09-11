import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../static/locales/en/translation.json';
import de from '../static/locales/de/translation.json';

void i18n
.use(LanguageDetector)
.use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en
      },
      de: {
        translation: de
      }
    },
    fallbackLng: 'de',
    debug: false,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    }
  });


export default i18n;

export interface ILanguage {
  key: string;
  name: string;
}
export const availableLanguages: ILanguage[] = [
  {
    key: 'de',
    name: 'Deutsch'
  },
  {
    key: 'en',
    name: 'English'
  }
];
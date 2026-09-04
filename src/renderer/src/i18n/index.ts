import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'
import en from './locales/en.json'
import zh from './locales/zh.json'
import { parseStoredLanguage, type SupportedLanguage } from './language'

dayjs.extend(isoWeek)

export function updateDayjsLocale(lng: string): void {
  if (lng.startsWith('zh')) {
    dayjs.locale('zh-cn')
  } else {
    dayjs.locale('en')
  }
}

const resources = {
  en: {
    translation: en
  },
  zh: {
    translation: zh
  }
}

// Use Chinese for Chinese locales and English for all other locales.
const getSystemLanguage = (): SupportedLanguage => {
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('zh')) return 'zh'
  return 'en'
}

const defaultLang =
  parseStoredLanguage(localStorage.getItem('gitfeed-language')) ?? getSystemLanguage()

updateDayjsLocale(defaultLang)

void i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  })

i18n.on('languageChanged', (lng) => {
  updateDayjsLocale(lng)
})

export default i18n

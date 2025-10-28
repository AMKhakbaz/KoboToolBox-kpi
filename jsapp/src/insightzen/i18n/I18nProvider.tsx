import React, { createContext, useContext, useMemo, useState } from 'react'

import type { InsightZenLocale } from './translations'
import { translations } from './translations'

interface InsightZenI18nContextValue {
  locale: InsightZenLocale
  direction: 'rtl' | 'ltr'
  t: (key: string) => string
  setLocale: (locale: InsightZenLocale) => void
}

const InsightZenI18nContext = createContext<InsightZenI18nContextValue | undefined>(undefined)

export function InsightZenI18nProvider({
  children,
  initialLocale = 'fa',
}: {
  children: React.ReactNode
  initialLocale?: InsightZenLocale
}) {
  const [locale, setLocale] = useState<InsightZenLocale>(initialLocale)

  const value = useMemo<InsightZenI18nContextValue>(() => {
    const t = (key: string) => {
      const localeStrings = translations[locale]
      const fallback = translations.en
      return localeStrings[key] ?? fallback[key] ?? key
    }
    return {
      locale,
      direction: locale === 'fa' ? 'rtl' : 'ltr',
      t,
      setLocale,
    }
  }, [locale])

  return <InsightZenI18nContext.Provider value={value}>{children}</InsightZenI18nContext.Provider>
}

export function useInsightZenI18n() {
  const context = useContext(InsightZenI18nContext)
  if (!context) {
    throw new Error('useInsightZenI18n must be used within InsightZenI18nProvider')
  }
  return context
}

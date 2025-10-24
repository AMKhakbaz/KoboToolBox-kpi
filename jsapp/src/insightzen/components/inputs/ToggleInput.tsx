import React from 'react'

import { useInsightZenI18n } from '../../i18n/I18nProvider'
import styles from '../layout/InsightZenLayout.module.scss'

interface ToggleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function ToggleInput({ label, id, checked, onChange, ...inputProps }: ToggleInputProps) {
  const { t } = useInsightZenI18n()
  const inputId = id ?? `insightzen-toggle-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <label className={styles.toggle} htmlFor={inputId}>
      <input id={inputId} type='checkbox' checked={checked} onChange={onChange} {...inputProps} />
      <span>{checked ? t('inputs.toggle.on') : t('inputs.toggle.off')}</span>
      <span>{label}</span>
    </label>
  )
}

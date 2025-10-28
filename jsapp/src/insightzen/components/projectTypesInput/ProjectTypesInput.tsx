import React, { useState } from 'react'

import { useInsightZenI18n } from '../../i18n/I18nProvider'
import styles from '../layout/InsightZenLayout.module.scss'

interface ProjectTypesInputProps {
  label: string
  values: string[]
  onChange: (values: string[]) => void
}

export function ProjectTypesInput({ label, values, onChange }: ProjectTypesInputProps) {
  const { t } = useInsightZenI18n()
  const [draftValue, setDraftValue] = useState('')

  const normalizedValues = Array.from(new Set(values.map((value) => value.trim()))).filter(Boolean)

  const addValue = () => {
    const trimmed = draftValue.trim()
    if (!trimmed) return
    if (!normalizedValues.some((value) => value.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...normalizedValues, trimmed])
    }
    setDraftValue('')
  }

  const removeValue = (value: string) => {
    onChange(normalizedValues.filter((item) => item !== value))
  }

  return (
    <div className={styles.formRow}>
      <span className={styles.formLabel}>{label}</span>
      <div className={styles.badgeGroup}>
        {normalizedValues.map((value) => (
          <span key={value} className={styles.badge}>
            {value}
            <button
              type='button'
              className={styles.actionButton}
              onClick={() => removeValue(value)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className={styles.filtersRow}>
        <input
          className={styles.textInput}
          value={draftValue}
          placeholder={t('inputs.multi.add')}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addValue()
            }
          }}
        />
        <button type='button' className={styles.actionButton} onClick={addValue}>
          +
        </button>
      </div>
    </div>
  )
}

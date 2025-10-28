import React from 'react'

import styles from '../layout/InsightZenLayout.module.scss'

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  description?: string
}

export function TextInput({ label, description, id, ...inputProps }: TextInputProps) {
  const inputId = id ?? `insightzen-text-input-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <label className={styles.formRow} htmlFor={inputId}>
      <span className={styles.formLabel}>{label}</span>
      <input id={inputId} className={styles.textInput} {...inputProps} />
      {description && <span className={styles.headerSubtitle}>{description}</span>}
    </label>
  )
}

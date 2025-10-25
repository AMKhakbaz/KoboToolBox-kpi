import React from 'react'

import styles from '../layout/InsightZenLayout.module.scss'

interface SelectOption<T extends string | number> {
  label: string
  value: T
}

interface SelectInputProps<T extends string | number> extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: SelectOption<T>[]
  placeholder?: string
}

export function SelectInput<T extends string | number>({
  label,
  options,
  id,
  placeholder,
  ...selectProps
}: SelectInputProps<T>) {
  const inputId = id ?? `insightzen-select-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <label className={styles.formRow} htmlFor={inputId}>
      <span className={styles.formLabel}>{label}</span>
      <select id={inputId} className={styles.selectInput} {...selectProps}>
        {placeholder && <option value=''>{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

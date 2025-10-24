import React from 'react'

import { SelectInput } from '../../components/inputs/SelectInput'
import { TextInput } from '../../components/inputs/TextInput'
import { ToggleInput } from '../../components/inputs/ToggleInput'
import { ProjectTypesInput } from '../../components/projectTypesInput/ProjectTypesInput'
import { useInsightZenI18n } from '../../i18n/I18nProvider'

import styles from './DimensionsBuilder.module.scss'

export interface QuotaDimensionValue {
  value: string
  label?: string
}

export interface QuotaDimension {
  key: string
  label?: string
  type?: string
  values?: QuotaDimensionValue[]
  required?: boolean
}

interface DimensionsBuilderProps {
  value: QuotaDimension[]
  onChange: (next: QuotaDimension[]) => void
  disabled?: boolean
}

const TYPE_OPTIONS: Array<{ labelKey: string; value: string }> = [
  { labelKey: 'quotas.dimensions.type.categorical', value: 'categorical' },
  { labelKey: 'quotas.dimensions.type.numeric', value: 'numeric' },
]

export function DimensionsBuilder({ value, onChange, disabled }: DimensionsBuilderProps) {
  const { t } = useInsightZenI18n()

  const handleUpdate = (index: number, updates: Partial<QuotaDimension>) => {
    const next = value.map((dimension, position) =>
      position === index
        ? {
            ...dimension,
            ...updates,
          }
        : dimension,
    )
    onChange(next)
  }

  const handleRemove = (index: number) => {
    const next = value.filter((_, position) => position !== index)
    onChange(next)
  }

  const handleAdd = () => {
    onChange([
      ...value,
      {
        key: '',
        label: '',
        type: 'categorical',
        values: [],
        required: true,
      },
    ])
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('quotas.dimensions.title')}</h3>
        <button type='button' onClick={handleAdd} disabled={disabled} className={styles.addButton}>
          {t('quotas.dimensions.add')}
        </button>
      </div>
      <div className={styles.list}>
        {value.length === 0 ? (
          <p className={styles.emptyText}>{t('quotas.dimensions.empty')}</p>
        ) : (
          value.map((dimension, index) => {
            const values = dimension.values?.map((item) => item.value) ?? []
            return (
              <div key={`dimension-${index}`} className={styles.dimensionCard}>
                <div className={styles.dimensionGrid}>
                  <TextInput
                    label={t('quotas.dimensions.key')}
                    value={dimension.key}
                    onChange={(event) => handleUpdate(index, { key: event.target.value })}
                    placeholder={t('quotas.dimensions.keyPlaceholder')}
                    disabled={disabled}
                  />
                  <TextInput
                    label={t('quotas.dimensions.label')}
                    value={dimension.label ?? ''}
                    onChange={(event) => handleUpdate(index, { label: event.target.value })}
                    placeholder={t('quotas.dimensions.labelPlaceholder')}
                    disabled={disabled}
                  />
                  <SelectInput
                    label={t('quotas.dimensions.type')}
                    value={dimension.type ?? 'categorical'}
                    onChange={(event) => handleUpdate(index, { type: event.target.value })}
                    options={TYPE_OPTIONS.map((option) => ({
                      label: t(option.labelKey),
                      value: option.value,
                    }))}
                    disabled={disabled}
                  />
                  <ToggleInput
                    label={t('quotas.dimensions.required')}
                    checked={dimension.required ?? false}
                    onChange={(event) => handleUpdate(index, { required: event.target.checked })}
                    disabled={disabled}
                  />
                </div>
                <div className={styles.valuesSection}>
                  <ProjectTypesInput
                    values={values}
                    onChange={(nextValues) =>
                      handleUpdate(index, {
                        values: nextValues.map((item) => ({ value: item })),
                      })
                    }
                    placeholder={t('quotas.dimensions.valuesPlaceholder')}
                    disabled={disabled}
                  />
                  <small className={styles.helperText}>{t('quotas.dimensions.valuesHelper')}</small>
                </div>
                <div className={styles.cardActions}>
                  <button
                    type='button'
                    onClick={() => handleRemove(index)}
                    disabled={disabled}
                    className={styles.removeButton}
                  >
                    {t('quotas.dimensions.remove')}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

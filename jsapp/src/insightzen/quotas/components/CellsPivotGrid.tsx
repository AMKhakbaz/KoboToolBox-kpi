import React from 'react'

import type { InsightZenQuotaCell } from '../../api/types'
import { useInsightZenI18n } from '../../i18n/I18nProvider'

import styles from './CellsPivotGrid.module.scss'

interface CellsPivotGridProps {
  cells: InsightZenQuotaCell[]
}

export function CellsPivotGrid({ cells }: CellsPivotGridProps) {
  const { t } = useInsightZenI18n()

  if (!cells.length) {
    return <p className={styles.emptyText}>{t('quotas.cells.empty')}</p>
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            <th className={styles.headerCell}>{t('quotas.cells.label')}</th>
            <th className={styles.headerCell}>{t('quotas.cells.selector')}</th>
            <th className={styles.headerCell}>{t('quotas.cells.target')}</th>
            <th className={styles.headerCell}>{t('quotas.cells.softCap')}</th>
            <th className={styles.headerCell}>{t('quotas.cells.weight')}</th>
            <th className={styles.headerCell}>{t('quotas.cells.achieved')}</th>
            <th className={styles.headerCell}>{t('quotas.cells.inProgress')}</th>
            <th className={styles.headerCell}>{t('quotas.cells.remaining')}</th>
          </tr>
        </thead>
        <tbody>
          {cells.map((cell) => (
            <tr key={cell.id} className={styles.bodyRow}>
              <td className={styles.cell}>{cell.label || t('quotas.cells.untitled')}</td>
              <td className={styles.cell}>
                <code className={styles.selectorCode}>{JSON.stringify(cell.selector)}</code>
              </td>
              <td className={styles.cell}>{cell.target}</td>
              <td className={styles.cell}>{cell.soft_cap ?? '—'}</td>
              <td className={styles.cell}>{cell.weight.toFixed(2)}</td>
              <td className={styles.cell}>{cell.achieved}</td>
              <td className={styles.cell}>{cell.in_progress}</td>
              <td className={styles.cell}>{cell.remaining ?? '∞'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

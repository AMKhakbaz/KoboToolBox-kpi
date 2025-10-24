import React, { useEffect, useMemo, useState } from 'react'

import {
  exportCollectionPerformanceXlsx,
  useCollectionBarQuery,
  useCollectionOptionsQuery,
  useCollectionPieQuery,
  useCollectionSummaryQuery,
  useCollectionTableQuery,
  useCollectionTopQuery,
} from '../../../api/collectionPerformanceApi'
import type {
  InsightZenCollectionBarParams,
  InsightZenCollectionFilters,
  InsightZenCollectionTableFilters,
} from '../../../api/types'
import { ProjectLookupSelect } from '../../../components/inputs/LookupSelect'
import { SelectInput } from '../../../components/inputs/SelectInput'
import layoutStyles from '../../../components/layout/InsightZenLayout.module.scss'
import { useInsightZenI18n } from '../../../i18n/I18nProvider'
import styles from './CollectionPerformancePage.module.scss'

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function defaultDateRange(): { from: string; to: string } {
  const today = new Date()
  const to = isoDate(today)
  const start = new Date(today)
  start.setDate(start.getDate() - 6)
  return { from: isoDate(start), to }
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) {
    return '—'
  }
  const clamped = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(clamped / 60)
  const remaining = clamped % 60
  return `${minutes}:${remaining.toString().padStart(2, '0')}`
}

const PAGE_SIZES = [20, 50, 100]

export function CollectionPerformancePage() {
  const { t, direction } = useInsightZenI18n()
  const [projectId, setProjectId] = useState<number | ''>('')
  const [{ from, to }, setDateRange] = useState(defaultDateRange)
  const [selectedInterviewers, setSelectedInterviewers] = useState<number[]>([])
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>([])
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [metric, setMetric] = useState<'completes' | 'attempts' | 'sr'>('completes')
  const [groupBy, setGroupBy] = useState<'interviewer' | 'day'>('interviewer')
  const [tablePage, setTablePage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    if (from > to) {
      setDateRange((prev) => ({ ...prev, to: from }))
    }
  }, [from, to])

  const filters: InsightZenCollectionFilters | null = useMemo(() => {
    if (typeof projectId !== 'number') {
      return null
    }
    const base: InsightZenCollectionFilters = { project: projectId }
    if (from) base.from = from
    if (to) base.to = to
    if (selectedInterviewers.length) base.interviewer = selectedInterviewers
    if (selectedOutcomes.length) base.outcomes = selectedOutcomes
    if (selectedTeams.length) base.team = selectedTeams
    return base
  }, [projectId, from, to, selectedInterviewers, selectedOutcomes, selectedTeams])

  useEffect(() => {
    setTablePage(1)
  }, [filters, pageSize])

  const summaryQuery = useCollectionSummaryQuery(filters, { enabled: Boolean(filters) })
  const barParams: InsightZenCollectionBarParams | null = filters
    ? { ...filters, metric, group_by: groupBy }
    : null
  const barQuery = useCollectionBarQuery(barParams, { enabled: Boolean(barParams) })
  const pieQuery = useCollectionPieQuery(filters ? { ...filters, metric } : null, {
    enabled: Boolean(filters),
  })
  const topQuery = useCollectionTopQuery(filters ? { ...filters, sort: metric, limit: 5 } : null, {
    enabled: Boolean(filters),
  })
  const tableParams: InsightZenCollectionTableFilters | null = filters
    ? { ...filters, page: tablePage, page_size: pageSize }
    : null
  const tableQuery = useCollectionTableQuery(tableParams, { enabled: Boolean(tableParams) })
  const optionsQuery = useCollectionOptionsQuery(filters, { enabled: Boolean(filters) })

  useEffect(() => {
    if (!optionsQuery.data) {
      return
    }
    setSelectedInterviewers((current) =>
      current.filter((value) => optionsQuery.data?.interviewers.some((option) => option.id === value)),
    )
    setSelectedOutcomes((current) =>
      current.filter((value) => optionsQuery.data?.outcome_codes.includes(value)),
    )
    setSelectedTeams((current) => current.filter((value) => optionsQuery.data?.teams.includes(value)))
  }, [optionsQuery.data])

  const maxBarValue = useMemo(() => {
    if (!barQuery.data || !barQuery.data.length) {
      return 0
    }
    return Math.max(...barQuery.data.map((item) => item.value || 0)) || 0
  }, [barQuery.data])

  const tableCount = tableQuery.data?.count ?? 0
  const totalPages = tableCount && pageSize ? Math.max(1, Math.ceil(tableCount / pageSize)) : 1

  useEffect(() => {
    if (tablePage > totalPages) {
      setTablePage(totalPages)
    }
  }, [tablePage, totalPages])

  const handleExport = async () => {
    if (!filters) return
    await exportCollectionPerformanceXlsx(filters)
  }

  const onMultiSelectChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
    parser: (value: string) => number | string,
  ): Array<string | number> => {
    const values = Array.from(event.target.selectedOptions).map((option) => parser(option.value))
    return values
  }

  return (
    <div className={styles.pageRoot} dir={direction}>
      <div className={styles.filtersCard}>
        <div className={styles.filtersGrid}>
          <ProjectLookupSelect
            label={t('collectionPerformance.filters.project')}
            value={projectId}
            onChange={(value) => {
              setProjectId(value === '' ? '' : Number(value))
              setSelectedInterviewers([])
              setSelectedOutcomes([])
              setSelectedTeams([])
            }}
            placeholder={t('collectionPerformance.filters.project')}
            searchPlaceholder={t('collectionPerformance.filters.project')}
            loadMoreLabel={t('collectionPerformance.table.next')}
            selectedLabel={undefined}
          />
          <label className={layoutStyles.formRow}>
            <span className={layoutStyles.formLabel}>{t('collectionPerformance.filters.from')}</span>
            <input
              type='date'
              className={layoutStyles.dateInput}
              value={from}
              onChange={(event) => setDateRange((prev) => ({ ...prev, from: event.target.value }))}
            />
          </label>
          <label className={layoutStyles.formRow}>
            <span className={layoutStyles.formLabel}>{t('collectionPerformance.filters.to')}</span>
            <input
              type='date'
              className={layoutStyles.dateInput}
              value={to}
              onChange={(event) => setDateRange((prev) => ({ ...prev, to: event.target.value }))}
            />
          </label>
          <label className={layoutStyles.formRow}>
            <span className={layoutStyles.formLabel}>{t('collectionPerformance.filters.interviewers')}</span>
            <select
              multiple
              className={`${layoutStyles.multiSelect} ${styles.multiSelect}`}
              value={selectedInterviewers.map(String)}
              onChange={(event) =>
                setSelectedInterviewers(
                  onMultiSelectChange(event, (value) => Number(value)) as number[],
                )
              }
              disabled={!optionsQuery.data || optionsQuery.data.interviewers.length === 0}
            >
              {optionsQuery.data?.interviewers.map((interviewer) => (
                <option key={interviewer.id} value={interviewer.id}>
                  {interviewer.label}
                </option>
              ))}
            </select>
          </label>
          <label className={layoutStyles.formRow}>
            <span className={layoutStyles.formLabel}>{t('collectionPerformance.filters.outcomes')}</span>
            <select
              multiple
              className={`${layoutStyles.multiSelect} ${styles.multiSelect}`}
              value={selectedOutcomes}
              onChange={(event) =>
                setSelectedOutcomes(
                  onMultiSelectChange(event, (value) => value) as string[],
                )
              }
              disabled={!optionsQuery.data || optionsQuery.data.outcome_codes.length === 0}
            >
              {optionsQuery.data?.outcome_codes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          <label className={layoutStyles.formRow}>
            <span className={layoutStyles.formLabel}>{t('collectionPerformance.filters.teams')}</span>
            <select
              multiple
              className={`${layoutStyles.multiSelect} ${styles.multiSelect}`}
              value={selectedTeams}
              onChange={(event) =>
                setSelectedTeams(onMultiSelectChange(event, (value) => value) as string[])
              }
              disabled={!optionsQuery.data || optionsQuery.data.teams.length === 0}
            >
              {optionsQuery.data?.teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.controlsRow}>
          <SelectInput
            label={t('collectionPerformance.filters.metric')}
            value={metric}
            onChange={(event) => setMetric(event.target.value as 'completes' | 'attempts' | 'sr')}
            options={[
              { label: t('collectionPerformance.filters.metric.completes'), value: 'completes' },
              { label: t('collectionPerformance.filters.metric.attempts'), value: 'attempts' },
              { label: t('collectionPerformance.filters.metric.sr'), value: 'sr' },
            ]}
          />
          <SelectInput
            label={t('collectionPerformance.filters.groupBy')}
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value as 'interviewer' | 'day')}
            options={[
              { label: t('collectionPerformance.filters.group.interviewer'), value: 'interviewer' },
              { label: t('collectionPerformance.filters.group.day'), value: 'day' },
            ]}
          />
          <SelectInput
            label={t('collectionPerformance.table.pageSize')}
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            options={PAGE_SIZES.map((size) => ({ label: String(size), value: size }))}
          />
        </div>
        <div className={styles.actionsRow}>
          <button
            type='button'
            className={styles.exportButton}
            onClick={handleExport}
            disabled={!filters}
          >
            {t('collectionPerformance.actions.export')}
          </button>
        </div>
        {!filters && <div className={styles.emptyState}>{t('collectionPerformance.instructions')}</div>}
      </div>

      {filters && (
        <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>{t('collectionPerformance.kpi.attempts')}</span>
              <span className={styles.kpiValue}>{summaryQuery.data?.totals.attempts ?? '—'}</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>{t('collectionPerformance.kpi.completes')}</span>
              <span className={styles.kpiValue}>{summaryQuery.data?.totals.completes ?? '—'}</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>{t('collectionPerformance.kpi.successRate')}</span>
              <span className={styles.kpiValue}>
                {summaryQuery.data
                  ? `${Math.round(summaryQuery.data.totals.success_rate * 100)}%`
                  : '—'}
              </span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>{t('collectionPerformance.kpi.avgDuration')}</span>
              <span className={styles.kpiValue}>
                {summaryQuery.data?.totals.avg_duration_sec ?? '—'}
              </span>
            </div>
          </div>

          <div className={styles.chartGrid}>
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>{t('collectionPerformance.bar.title')}</h3>
              {!barQuery.data?.length && <div className={styles.emptyState}>{t('collectionPerformance.chart.empty')}</div>}
              {barQuery.data && barQuery.data.length > 0 && (
                <div className={styles.barChart}>
                  {barQuery.data.map((item) => {
                    const height = maxBarValue ? Math.max(6, (item.value / maxBarValue) * 160) : 6
                    return (
                      <div className={styles.bar} key={item.label}>
                        <div className={styles.barColumn} style={{ height }} />
                        <div className={styles.barLabel}>{item.label}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>{t('collectionPerformance.pie.title')}</h3>
              {!pieQuery.data?.length && <div className={styles.emptyState}>{t('collectionPerformance.chart.empty')}</div>}
              {pieQuery.data && pieQuery.data.length > 0 && (
                <div className={styles.pieList}>
                  {pieQuery.data.map((item) => (
                    <div key={item.label} className={styles.pieItem}>
                      <div className={styles.pieHeader}>
                        <span>{item.label}</span>
                        <span>{Math.round((item.share || 0) * 100)}%</span>
                      </div>
                      <div className={styles.pieBar}>
                        <div className={styles.pieFill} style={{ width: `${Math.round((item.share || 0) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>{t('collectionPerformance.top.title')}</h3>
              {!topQuery.data?.length && <div className={styles.emptyState}>{t('collectionPerformance.chart.empty')}</div>}
              {topQuery.data && topQuery.data.length > 0 && (
                <table className={styles.topTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('collectionPerformance.table.headers.interviewer')}</th>
                      <th>{t('collectionPerformance.kpi.completes')}</th>
                      <th>{t('collectionPerformance.kpi.attempts')}</th>
                      <th>{t('collectionPerformance.kpi.successRate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topQuery.data.map((row) => (
                      <tr key={`${row.rank}-${row.label}`}>
                        <td>{row.rank}</td>
                        <td>{row.label}</td>
                        <td>{row.completes}</td>
                        <td>{row.attempts}</td>
                        <td>{`${Math.round(row.sr * 100)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className={styles.dataTableContainer}>
            <h3 className={styles.chartTitle}>{t('collectionPerformance.table.title')}</h3>
            {!tableQuery.data?.results.length && (
              <div className={styles.emptyState}>{t('collectionPerformance.table.empty')}</div>
            )}
            {tableQuery.data && tableQuery.data.results.length > 0 && (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>{t('collectionPerformance.table.headers.date')}</th>
                    <th>{t('collectionPerformance.table.headers.interviewer')}</th>
                    <th>{t('collectionPerformance.table.headers.team')}</th>
                    <th>{t('collectionPerformance.table.headers.phone')}</th>
                    <th>{t('collectionPerformance.table.headers.outcome')}</th>
                    <th>{t('collectionPerformance.table.headers.start')}</th>
                    <th>{t('collectionPerformance.table.headers.end')}</th>
                    <th>{t('collectionPerformance.table.headers.duration')}</th>
                    <th>{t('collectionPerformance.table.headers.attempts')}</th>
                    <th>{t('collectionPerformance.table.headers.cell')}</th>
                    <th>{t('collectionPerformance.table.headers.gender')}</th>
                    <th>{t('collectionPerformance.table.headers.province')}</th>
                    <th>{t('collectionPerformance.table.headers.age')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tableQuery.data.results.map((row, index) => (
                    <tr key={`${row.project_id}-${row.start_form}-${index}`}>
                      <td>{row.date ?? '—'}</td>
                      <td>{row.interviewer ?? '—'}</td>
                      <td>{row.team || '—'}</td>
                      <td>{row.phone_number}</td>
                      <td>{row.outcome_code ?? '—'}</td>
                      <td>{row.start_form ?? '—'}</td>
                      <td>{row.end_form ?? '—'}</td>
                      <td>{formatDuration(row.duration_sec)}</td>
                      <td>{row.call_attempts ?? '—'}</td>
                      <td>{row.cell_label ?? '—'}</td>
                      <td>{row.gender ?? '—'}</td>
                      <td>{row.province_code ?? '—'}</td>
                      <td>{row.age_band ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className={styles.tableFooter}>
              <span className={styles.statusText}>
                {t('collectionPerformance.table.totalLabel')}: {tableCount}
              </span>
              <div className={styles.paginationControls}>
                <button
                  type='button'
                  className={styles.paginationButton}
                  onClick={() => setTablePage((value) => Math.max(1, value - 1))}
                  disabled={tablePage <= 1}
                >
                  {t('collectionPerformance.table.prev')}
                </button>
                <span className={styles.statusText}>
                  {t('collectionPerformance.table.pageLabel')} {tablePage} {t('collectionPerformance.table.ofLabel')} {totalPages}
                </span>
                <button
                  type='button'
                  className={styles.paginationButton}
                  onClick={() => setTablePage((value) => Math.min(totalPages, value + 1))}
                  disabled={tablePage >= totalPages}
                >
                  {t('collectionPerformance.table.next')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

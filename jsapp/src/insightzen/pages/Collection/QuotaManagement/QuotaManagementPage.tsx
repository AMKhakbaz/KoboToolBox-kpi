// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react'

import alertify from 'alertifyjs'

import type {
  InsightZenQuotaCell,
  InsightZenQuotaFilters,
  InsightZenQuotaOverflowPolicy,
  InsightZenQuotaScheme,
  InsightZenQuotaSchemePayload,
  InsightZenQuotaStatus,
} from '../../../api/types'
import {
  useArchiveQuotaSchemeMutation,
  useBulkUpsertQuotaCellsMutation,
  useCreateQuotaSchemeMutation,
  usePublishQuotaSchemeMutation,
  useQuotaSchemeCellsQuery,
  useQuotaSchemeStatsQuery,
  useQuotaSchemesQuery,
} from '../../../api/quotasApi'
import { ProjectLookupSelect } from '../../../components/inputs/LookupSelect'
import { SelectInput } from '../../../components/inputs/SelectInput'
import { TextInput } from '../../../components/inputs/TextInput'
import { ToggleInput } from '../../../components/inputs/ToggleInput'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useInsightZenI18n } from '../../../i18n/I18nProvider'
import {
  DimensionsBuilder,
  type QuotaDimension,
} from '../../../quotas/components/DimensionsBuilder'
import { CellsPivotGrid } from '../../../quotas/components/CellsPivotGrid'
import styles from './QuotaManagementPage.module.scss'

type SchemeStatusFilter = '' | InsightZenQuotaStatus
type CellCompletionFilter = 'all' | 'complete' | 'incomplete'

interface NewSchemeState {
  name: string
  overflow_policy: InsightZenQuotaOverflowPolicy
  priority: string
  is_default: boolean
  dimensions: QuotaDimension[]
}

interface SelectorRow {
  key: string
  value: string
}

interface NewCellState {
  label: string
  target: string
  softCap: string
  weight: string
  selectorRows: SelectorRow[]
}

const STATUS_OPTIONS: Array<{ value: SchemeStatusFilter; labelKey: string }> = [
  { value: '', labelKey: 'quotas.filters.status.all' },
  { value: 'draft', labelKey: 'quotas.filters.status.draft' },
  { value: 'published', labelKey: 'quotas.filters.status.published' },
  { value: 'archived', labelKey: 'quotas.filters.status.archived' },
]

const COMPLETION_OPTIONS: Array<{ value: CellCompletionFilter; labelKey: string }> = [
  { value: 'all', labelKey: 'quotas.cells.filter.all' },
  { value: 'complete', labelKey: 'quotas.cells.filter.complete' },
  { value: 'incomplete', labelKey: 'quotas.cells.filter.incomplete' },
]

const POLICY_OPTIONS: Array<{ value: InsightZenQuotaOverflowPolicy; labelKey: string }> = [
  { value: 'strict', labelKey: 'quotas.policy.strict' },
  { value: 'soft', labelKey: 'quotas.policy.soft' },
  { value: 'weighted', labelKey: 'quotas.policy.weighted' },
]

const INITIAL_SCHEME: NewSchemeState = {
  name: '',
  overflow_policy: 'strict',
  priority: '0',
  is_default: false,
  dimensions: [],
}

const INITIAL_CELL: NewCellState = {
  label: '',
  target: '',
  softCap: '',
  weight: '1',
  selectorRows: [{ key: '', value: '' }],
}

export function QuotaManagementPage() {
  const { t } = useInsightZenI18n()
  const [projectId, setProjectId] = useState<number | ''>('')
  const [statusFilter, setStatusFilter] = useState<SchemeStatusFilter>('')
  const [search, setSearch] = useState('')
  const [selectedSchemeId, setSelectedSchemeId] = useState<number | null>(null)
  const [completionFilter, setCompletionFilter] = useState<CellCompletionFilter>('all')
  const [cellSearch, setCellSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newScheme, setNewScheme] = useState<NewSchemeState>(INITIAL_SCHEME)
  const [newCell, setNewCell] = useState<NewCellState>(INITIAL_CELL)

  const debouncedSearch = useDebouncedValue(search, 300)
  const debouncedCellSearch = useDebouncedValue(cellSearch, 300)

  const schemeFilters = useMemo<InsightZenQuotaFilters>(
    () => ({
      project: projectId === '' ? undefined : projectId,
      status: statusFilter || undefined,
      q: debouncedSearch || undefined,
      page_size: 100,
    }),
    [projectId, statusFilter, debouncedSearch],
  )

  const schemesQuery = useQuotaSchemesQuery(schemeFilters, { enabled: projectId !== '' })

  const schemes = schemesQuery.data?.results ?? []

  useEffect(() => {
    if (!schemes.length) {
      setSelectedSchemeId(null)
      return
    }
    if (selectedSchemeId === null || !schemes.some((scheme) => scheme.id === selectedSchemeId)) {
      setSelectedSchemeId(schemes[0].id)
    }
  }, [schemes, selectedSchemeId])

  const cellFilters = useMemo(() => {
    const completeParam = completionFilter === 'complete' ? 'true' : completionFilter === 'incomplete' ? 'false' : undefined
    return {
      complete: completeParam,
      q: debouncedCellSearch || undefined,
    }
  }, [completionFilter, debouncedCellSearch])

  const cellsQuery = useQuotaSchemeCellsQuery(selectedSchemeId, cellFilters, {
    enabled: selectedSchemeId !== null,
  })

  const statsQuery = useQuotaSchemeStatsQuery(selectedSchemeId, selectedSchemeId !== null)

  const createMutation = useCreateQuotaSchemeMutation()
  const publishMutation = usePublishQuotaSchemeMutation(selectedSchemeId ?? -1)
  const archiveMutation = useArchiveQuotaSchemeMutation(selectedSchemeId ?? -1)
  const bulkUpsertMutation = useBulkUpsertQuotaCellsMutation(selectedSchemeId ?? -1)

  const selectedScheme = schemes.find((scheme) => scheme.id === selectedSchemeId) ?? null

  const resetSchemeForm = () => {
    setNewScheme(INITIAL_SCHEME)
  }

  const handleCreateScheme = async () => {
    if (projectId === '') {
      alertify.error(t('quotas.notifications.projectRequired'))
      return
    }
    if (!newScheme.name.trim()) {
      alertify.error(t('quotas.notifications.nameRequired'))
      return
    }
    const payload: InsightZenQuotaSchemePayload = {
      project: projectId,
      name: newScheme.name.trim(),
      overflow_policy: newScheme.overflow_policy,
      priority: Number.isNaN(Number(newScheme.priority)) ? 0 : Number(newScheme.priority),
      is_default: newScheme.is_default,
      dimensions: newScheme.dimensions.map((dimension) => ({
        key: dimension.key,
        label: dimension.label,
        type: dimension.type ?? 'categorical',
        required: dimension.required ?? false,
        values: (dimension.values ?? []).map((value) => ({ value: value.value, label: value.label })),
      })),
    }

    try {
      await createMutation.mutateAsync(payload)
      alertify.success(t('quotas.notifications.createSuccess'))
      setIsCreateOpen(false)
      resetSchemeForm()
    } catch (error) {
      alertify.error(t('quotas.notifications.createError'))
    }
  }

  const handlePublishScheme = async () => {
    if (selectedSchemeId === null) {
      return
    }
    try {
      await publishMutation.mutateAsync({ is_default: selectedScheme?.is_default })
      alertify.success(t('quotas.notifications.publishSuccess'))
    } catch (error) {
      alertify.error(t('quotas.notifications.publishError'))
    }
  }

  const handleArchiveScheme = async () => {
    if (selectedSchemeId === null) {
      return
    }
    try {
      await archiveMutation.mutateAsync()
      alertify.success(t('quotas.notifications.archiveSuccess'))
    } catch (error) {
      alertify.error(t('quotas.notifications.archiveError'))
    }
  }

  const handleAddSelectorRow = () => {
    setNewCell((current) => ({
      ...current,
      selectorRows: [...current.selectorRows, { key: '', value: '' }],
    }))
  }

  const handleUpdateSelectorRow = (index: number, updates: Partial<SelectorRow>) => {
    setNewCell((current) => ({
      ...current,
      selectorRows: current.selectorRows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              ...updates,
            }
          : row,
      ),
    }))
  }

  const handleRemoveSelectorRow = (index: number) => {
    setNewCell((current) => ({
      ...current,
      selectorRows: current.selectorRows.filter((_, rowIndex) => rowIndex !== index),
    }))
  }

  const resetCellForm = () => {
    setNewCell(INITIAL_CELL)
  }

  const handleAddCell = async () => {
    if (selectedSchemeId === null) {
      return
    }
    const targetValue = Number(newCell.target)
    if (Number.isNaN(targetValue) || targetValue <= 0) {
      alertify.error(t('quotas.notifications.targetRequired'))
      return
    }
    const selectorEntries = newCell.selectorRows
      .map((row) => row)
      .filter((row) => row.key.trim() && row.value.trim())
    if (!selectorEntries.length) {
      alertify.error(t('quotas.notifications.selectorRequired'))
      return
    }
    const selector = selectorEntries.reduce<Record<string, string>>((acc, row) => {
      acc[row.key.trim()] = row.value.trim()
      return acc
    }, {})
    const softCapNumber = newCell.softCap ? Number(newCell.softCap) : undefined
    if (softCapNumber !== undefined && Number.isNaN(softCapNumber)) {
      alertify.error(t('quotas.notifications.softCapInvalid'))
      return
    }
    const weightNumber = newCell.weight ? Number(newCell.weight) : 1
    if (Number.isNaN(weightNumber) || weightNumber <= 0) {
      alertify.error(t('quotas.notifications.weightInvalid'))
      return
    }
    const payload = [
      {
        selector,
        label: newCell.label.trim() || undefined,
        target: targetValue,
        soft_cap: softCapNumber,
        weight: weightNumber,
      },
    ]
    try {
      await bulkUpsertMutation.mutateAsync(payload)
      alertify.success(t('quotas.notifications.cellsSuccess'))
      resetCellForm()
    } catch (error) {
      alertify.error(t('quotas.notifications.cellsError'))
    }
  }

  const renderSchemeList = () => {
    if (projectId === '') {
      return <p className={styles.placeholder}>{t('quotas.placeholder.project')}</p>
    }
    if (schemesQuery.isLoading) {
      return <p className={styles.placeholder}>{t('quotas.loading')}</p>
    }
    if (schemesQuery.isError) {
      return <p className={styles.placeholder}>{t('quotas.loadError')}</p>
    }
    if (!schemes.length) {
      return <p className={styles.placeholder}>{t('quotas.schemes.empty')}</p>
    }
    return (
      <div className={styles.schemesList}>
        {schemes.map((scheme) => {
          const isActive = scheme.id === selectedSchemeId
          return (
            <button
              key={scheme.id}
              type='button'
              className={`${styles.schemeItem} ${isActive ? styles.schemeItemActive : ''}`}
              onClick={() => setSelectedSchemeId(scheme.id)}
            >
              <p className={styles.schemeName}>{scheme.name}</p>
              <div className={styles.schemeMeta}>
                <span className={styles.badge}>{getStatusLabel(scheme, t)}</span>
                <span className={styles.badge}>
                  {`${t('quotas.scheme.versionLabel')} ${scheme.version}`}
                </span>
                {scheme.is_default ? <span className={styles.badge}>{t('quotas.scheme.default')}</span> : null}
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  const renderStats = () => {
    if (!selectedScheme) {
      return null
    }
    if (statsQuery.isLoading) {
      return <p className={styles.placeholder}>{t('quotas.stats.loading')}</p>
    }
    if (statsQuery.isError || !statsQuery.data) {
      return <p className={styles.placeholder}>{t('quotas.stats.error')}</p>
    }
    return (
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>{t('quotas.stats.target')}</span>
          <span className={styles.statValue}>{statsQuery.data.target_total}</span>
        </div>
        <div className={styles.statCard}>
          <span>{t('quotas.stats.achieved')}</span>
          <span className={styles.statValue}>{statsQuery.data.achieved_total}</span>
        </div>
        <div className={styles.statCard}>
          <span>{t('quotas.stats.inProgress')}</span>
          <span className={styles.statValue}>{statsQuery.data.in_progress_total}</span>
        </div>
        <div className={styles.statCard}>
          <span>{t('quotas.stats.remaining')}</span>
          <span className={styles.statValue}>{statsQuery.data.remaining_total}</span>
        </div>
      </div>
    )
  }

  const renderCells = () => {
    if (!selectedScheme) {
      return <p className={styles.placeholder}>{t('quotas.placeholder.scheme')}</p>
    }
    if (cellsQuery.isLoading) {
      return <p className={styles.placeholder}>{t('quotas.cells.loading')}</p>
    }
    if (cellsQuery.isError) {
      return <p className={styles.placeholder}>{t('quotas.cells.error')}</p>
    }
    const cells = cellsQuery.data ?? []
    return <CellsPivotGrid cells={cells as InsightZenQuotaCell[]} />
  }

  return (
    <div className={styles.pageRoot}>
      <aside className={styles.sidebarCard}>
        <ProjectLookupSelect
          label={t('quotas.filters.project')}
          placeholder={t('quotas.filters.projectPlaceholder')}
          searchPlaceholder={t('quotas.filters.projectSearch')}
          value={projectId}
          onChange={(next) => {
            setProjectId(next)
            setSelectedSchemeId(null)
          }}
        />
        <SelectInput
          label={t('quotas.filters.status.label')}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as SchemeStatusFilter)}
          options={STATUS_OPTIONS.map((option) => ({
            value: option.value,
            label: t(option.labelKey),
          }))}
        />
        <TextInput
          label={t('quotas.filters.search')}
          placeholder={t('quotas.filters.searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div>
          <button
            type='button'
            className={styles.buttonPrimary}
            onClick={() => setIsCreateOpen((value) => !value)}
            disabled={projectId === ''}
          >
            {isCreateOpen ? t('quotas.create.close') : t('quotas.create.open')}
          </button>
        </div>

        {isCreateOpen ? (
          <div className={styles.createForm}>
            <TextInput
              label={t('quotas.form.name')}
              value={newScheme.name}
              onChange={(event) => setNewScheme((current) => ({ ...current, name: event.target.value }))}
              placeholder={t('quotas.form.namePlaceholder')}
            />
            <SelectInput
              label={t('quotas.form.overflowPolicy')}
              value={newScheme.overflow_policy}
              onChange={(event) =>
                setNewScheme((current) => ({
                  ...current,
                  overflow_policy: event.target.value as InsightZenQuotaOverflowPolicy,
                }))
              }
              options={POLICY_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
            />
            <TextInput
              label={t('quotas.form.priority')}
              value={newScheme.priority}
              onChange={(event) => setNewScheme((current) => ({ ...current, priority: event.target.value }))}
            />
            <ToggleInput
              label={t('quotas.form.isDefault')}
              checked={newScheme.is_default}
              onChange={(event) => setNewScheme((current) => ({ ...current, is_default: event.target.checked }))}
            />
            <DimensionsBuilder
              value={newScheme.dimensions}
              onChange={(next) => setNewScheme((current) => ({ ...current, dimensions: next }))}
            />
            <div className={styles.actionsRow}>
              <button
                type='button'
                className={styles.buttonSecondary}
                onClick={() => {
                  resetSchemeForm()
                  setIsCreateOpen(false)
                }}
              >
                {t('quotas.form.cancel')}
              </button>
              <button
                type='button'
                className={styles.buttonPrimary}
                onClick={handleCreateScheme}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? t('quotas.form.saving') : t('quotas.form.save')}
              </button>
            </div>
          </div>
        ) : null}

        {renderSchemeList()}
      </aside>

      <section className={styles.detailsPanel}>
        {selectedScheme ? (
          <>
            <header className={styles.panelHeader}>
              <div>
                <h2 className={styles.schemeTitle}>{selectedScheme.name}</h2>
                <p className={styles.schemeSummary}>
                  {[
                    `${t('quotas.scheme.statusLabel')} ${getStatusLabel(selectedScheme, t)}`,
                    `${t('quotas.scheme.versionLabel')} ${selectedScheme.version}`,
                    `${t('quotas.scheme.priorityLabel')} ${selectedScheme.priority}`,
                  ].join(' • ')}
                </p>
              </div>
              <div className={styles.panelActions}>
                {selectedScheme.status !== 'published' ? (
                  <button
                    type='button'
                    className={styles.buttonPrimary}
                    onClick={handlePublishScheme}
                    disabled={publishMutation.isPending}
                  >
                    {publishMutation.isPending ? t('quotas.actions.publishing') : t('quotas.actions.publish')}
                  </button>
                ) : null}
                <button
                  type='button'
                  className={styles.buttonDanger}
                  onClick={handleArchiveScheme}
                  disabled={archiveMutation.isPending}
                >
                  {archiveMutation.isPending ? t('quotas.actions.archiving') : t('quotas.actions.archive')}
                </button>
              </div>
            </header>

            {renderStats()}

            <div>
              <div className={styles.filtersRow}>
                <SelectInput
                  label={t('quotas.cells.filter.label')}
                  value={completionFilter}
                  onChange={(event) => setCompletionFilter(event.target.value as CellCompletionFilter)}
                  options={COMPLETION_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
                />
                <TextInput
                  label={t('quotas.cells.search')}
                  placeholder={t('quotas.cells.searchPlaceholder')}
                  value={cellSearch}
                  onChange={(event) => setCellSearch(event.target.value)}
                />
              </div>
              {renderCells()}
            </div>

            <div>
              <h3 className={styles.sectionTitle}>{t('quotas.cells.addTitle')}</h3>
              <div className={styles.cellForm}>
                <TextInput
                  label={t('quotas.cells.label')}
                  value={newCell.label}
                  onChange={(event) => setNewCell((current) => ({ ...current, label: event.target.value }))}
                />
                <TextInput
                  label={t('quotas.cells.target')}
                  value={newCell.target}
                  onChange={(event) => setNewCell((current) => ({ ...current, target: event.target.value }))}
                />
                <TextInput
                  label={t('quotas.cells.softCap')}
                  value={newCell.softCap}
                  onChange={(event) => setNewCell((current) => ({ ...current, softCap: event.target.value }))}
                />
                <TextInput
                  label={t('quotas.cells.weight')}
                  value={newCell.weight}
                  onChange={(event) => setNewCell((current) => ({ ...current, weight: event.target.value }))}
                />
              </div>
              <div className={styles.selectorGrid}>
                {newCell.selectorRows.map((row, index) => (
                  <div key={`selector-${index}`} className={styles.selectorRow}>
                    <TextInput
                      label={t('quotas.cells.selectorKey')}
                      value={row.key}
                      onChange={(event) => handleUpdateSelectorRow(index, { key: event.target.value })}
                    />
                    <TextInput
                      label={t('quotas.cells.selectorValue')}
                      value={row.value}
                      onChange={(event) => handleUpdateSelectorRow(index, { value: event.target.value })}
                    />
                    <div className={styles.selectorActions}>
                      <button
                        type='button'
                        className={styles.inlineButton}
                        onClick={() => handleRemoveSelectorRow(index)}
                        disabled={newCell.selectorRows.length === 1}
                      >
                        {t('quotas.cells.selectorRemove')}
                      </button>
                    </div>
                  </div>
                ))}
                <button type='button' className={styles.inlineButton} onClick={handleAddSelectorRow}>
                  {t('quotas.cells.selectorAdd')}
                </button>
              </div>
              <div className={styles.actionsRow}>
                <button type='button' className={styles.buttonSecondary} onClick={resetCellForm}>
                  {t('quotas.cells.reset')}
                </button>
                <button
                  type='button'
                  className={styles.buttonPrimary}
                  onClick={handleAddCell}
                  disabled={bulkUpsertMutation.isPending}
                >
                  {bulkUpsertMutation.isPending ? t('quotas.cells.saving') : t('quotas.cells.save')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.placeholder}>{t('quotas.placeholder.scheme')}</div>
        )}
      </section>
    </div>
  )
}

function getStatusLabel(scheme: InsightZenQuotaScheme, t: (key: string, options?: Record<string, unknown>) => string) {
  switch (scheme.status) {
    case 'draft':
      return t('quotas.status.draft')
    case 'published':
      return t('quotas.status.published')
    case 'archived':
      return t('quotas.status.archived')
    default:
      return scheme.status
  }
}

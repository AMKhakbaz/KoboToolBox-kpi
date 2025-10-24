import React, { useEffect, useMemo, useState } from 'react'

import alertify from 'alertifyjs'

import { DialerTable } from '../../../components/telephone/DialerTable'
import { ProjectLookupSelect } from '../../../components/inputs/LookupSelect'
import { SelectInput } from '../../../components/inputs/SelectInput'
import { TextInput } from '../../../components/inputs/TextInput'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useInsightZenI18n } from '../../../i18n/I18nProvider'
import {
  useCancelAssignmentMutation,
  useCompleteAssignmentMutation,
  useExpireAssignmentMutation,
  useFailAssignmentMutation,
  useInsightZenAssignmentsQuery,
  useRequestNextAssignmentMutation,
  useStartInterviewMutation,
} from '../../../api/assignmentsApi'
import type {
  InsightZenAssignment,
  InsightZenAssignmentFilters,
  InsightZenAssignmentStatus,
} from '../../../api/types'
import styles from './TelephoneInterviewerPage.module.scss'

interface PageFilters extends InsightZenAssignmentFilters {
  page: number
  page_size: number
}

const STATUS_OPTIONS: Array<{ labelKey: string; value: 'all' | InsightZenAssignmentStatus }> = [
  { labelKey: 'all', value: 'all' },
  { labelKey: 'reserved', value: 'reserved' },
  { labelKey: 'completed', value: 'completed' },
  { labelKey: 'failed', value: 'failed' },
  { labelKey: 'expired', value: 'expired' },
  { labelKey: 'cancelled', value: 'cancelled' },
]

const PAGE_SIZES = [20, 50, 100] as const

export function TelephoneInterviewerPage() {
  const { t } = useInsightZenI18n()
  const [projectId, setProjectId] = useState<number | ''>('')
  const [statusFilter, setStatusFilter] = useState<'all' | InsightZenAssignmentStatus>('all')
  const [interviewerFilter, setInterviewerFilter] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<typeof PAGE_SIZES[number]>(20)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null)

  const debouncedSearch = useDebouncedValue(search, 350)

  const filters: PageFilters = useMemo(
    () => ({
      project: projectId === '' ? undefined : projectId,
      status: statusFilter === 'all' ? undefined : statusFilter,
      interviewer: interviewerFilter === '' ? undefined : interviewerFilter,
      q: debouncedSearch || undefined,
      page,
      page_size: pageSize,
    }),
    [projectId, statusFilter, interviewerFilter, debouncedSearch, page, pageSize],
  )

  useEffect(() => {
    setPage(1)
  }, [projectId, statusFilter, interviewerFilter, debouncedSearch, pageSize])

  const assignmentsQuery = useInsightZenAssignmentsQuery(filters, { enabled: projectId !== '' })

  const assignments = assignmentsQuery.data?.results ?? []
  const totalCount = assignmentsQuery.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  useEffect(() => {
    if (!assignments.length) {
      setSelectedAssignmentId(null)
      return
    }
    if (selectedAssignmentId === null || !assignments.some((item) => item.id === selectedAssignmentId)) {
      setSelectedAssignmentId(assignments[0].id)
    }
  }, [assignments, selectedAssignmentId])

  const interviewerOptions = useMemo(() => {
    const map = new Map<number, string>()
    assignments.forEach((assignment) => {
      map.set(assignment.interviewer, assignment.interviewer_full_name || assignment.interviewer_username)
    })
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
  }, [assignments])

  const requestNextMutation = useRequestNextAssignmentMutation()
  const startInterviewMutation = useStartInterviewMutation()
  const completeAssignmentMutation = useCompleteAssignmentMutation()
  const failAssignmentMutation = useFailAssignmentMutation()
  const expireAssignmentMutation = useExpireAssignmentMutation()
  const cancelAssignmentMutation = useCancelAssignmentMutation()

  const busyAssignments = useMemo(() => {
    const set = new Set<number>()
    const mutations = [
      startInterviewMutation,
      completeAssignmentMutation,
      failAssignmentMutation,
      expireAssignmentMutation,
      cancelAssignmentMutation,
    ]
    mutations.forEach((mutation) => {
      const id = (mutation.variables as { id?: number } | undefined)?.id
      if (mutation.isPending && id !== undefined) {
        set.add(id)
      }
    })
    return set
  }, [
    startInterviewMutation.isPending,
    startInterviewMutation.variables,
    completeAssignmentMutation.isPending,
    completeAssignmentMutation.variables,
    failAssignmentMutation.isPending,
    failAssignmentMutation.variables,
    expireAssignmentMutation.isPending,
    expireAssignmentMutation.variables,
    cancelAssignmentMutation.isPending,
    cancelAssignmentMutation.variables,
  ])

  const handleSelect = (assignment: InsightZenAssignment) => {
    setSelectedAssignmentId(assignment.id)
  }

  const handleActionError = (error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error)
    const detail = (error as { responseJSON?: { detail?: string; non_field_errors?: string[] } })
      ?.responseJSON
    if (detail?.detail) {
      alertify.error(detail.detail)
      return
    }
    if (detail?.non_field_errors && detail.non_field_errors.length > 0) {
      alertify.error(detail.non_field_errors.join('\n'))
      return
    }
    const message = error instanceof Error ? error.message : t('telephone.errors.generic')
    alertify.error(message)
  }

  const triggerStartInterview = async (assignment: InsightZenAssignment) => {
    try {
      await startInterviewMutation.mutateAsync({ id: assignment.id })
      alertify.success(t('telephone.success.started'))
    } catch (error) {
      handleActionError(error)
    }
  }

  const triggerCompleteAssignment = async (assignment: InsightZenAssignment) => {
    try {
      await completeAssignmentMutation.mutateAsync({ id: assignment.id, payload: { outcome_code: 'COMP' } })
      alertify.success(t('telephone.success.completed'))
    } catch (error) {
      handleActionError(error)
    }
  }

  const triggerFailAssignment = async (assignment: InsightZenAssignment) => {
    try {
      const reason = window.prompt(t('telephone.prompts.failReason')) ?? undefined
      await failAssignmentMutation.mutateAsync({
        id: assignment.id,
        payload: { outcome_code: 'FAIL', reason: reason || undefined },
      })
      alertify.success(t('telephone.success.failed'))
    } catch (error) {
      handleActionError(error)
    }
  }

  const triggerExpireAssignment = async (assignment: InsightZenAssignment) => {
    try {
      await expireAssignmentMutation.mutateAsync({ id: assignment.id })
      alertify.success(t('telephone.success.expired'))
    } catch (error) {
      handleActionError(error)
    }
  }

  const triggerCancelAssignment = async (assignment: InsightZenAssignment) => {
    try {
      await cancelAssignmentMutation.mutateAsync({ id: assignment.id })
      alertify.success(t('telephone.success.cancelled'))
    } catch (error) {
      handleActionError(error)
    }
  }

  const handleRequestNext = async () => {
    if (projectId === '') {
      return
    }
    try {
      const assignment = await requestNextMutation.mutateAsync({ project: projectId })
      alertify.success(t('telephone.success.next'))
      setSelectedAssignmentId(assignment.id)
    } catch (error) {
      handleActionError(error)
    }
  }

  const selectedAssignment = assignments.find((item) => item.id === selectedAssignmentId) ?? null

  return (
    <div className={styles.layout}>
      <div className={styles.filters}>
        <ProjectLookupSelect
          label={t('telephone.filters.project')}
          value={projectId}
          onChange={(value) => setProjectId(value as number | '')}
          placeholder={t('telephone.filters.projectPlaceholder')}
          searchPlaceholder={t('telephone.filters.projectSearch')}
          loadMoreLabel={t('telephone.actions.loadMore')}
        />
        <SelectInput
          label={t('telephone.filters.status')}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          options={STATUS_OPTIONS.map((option) => ({
            value: option.value,
            label: t(`telephone.status.${option.labelKey}`),
          }))}
        />
        <SelectInput
          label={t('telephone.filters.interviewer')}
          value={interviewerFilter === '' ? '' : String(interviewerFilter)}
          onChange={(event) => {
            const value = event.target.value
            setInterviewerFilter(value === '' ? '' : Number(value))
          }}
          placeholder={t('telephone.filters.interviewerPlaceholder')}
          options={interviewerOptions.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
        <TextInput
          label={t('telephone.filters.search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('telephone.filters.searchPlaceholder')}
        />
      </div>

      <div className={styles.actionsRow}>
        <div className={styles.badgeGroup}>
          <span className={styles.badge}>
            {t('telephone.summary.count', { count: totalCount })}
          </span>
          {selectedAssignment && (
            <span className={styles.badge}>{t('telephone.summary.selected', { id: selectedAssignment.id })}</span>
          )}
        </div>
        <button
          type='button'
          className={styles.requestButton}
          disabled={projectId === '' || requestNextMutation.isPending}
          onClick={handleRequestNext}
        >
          {requestNextMutation.isPending
            ? t('telephone.actions.requesting')
            : t('telephone.actions.requestNext')}
        </button>
      </div>

      <DialerTable
        assignments={assignments}
        isLoading={assignmentsQuery.isLoading || assignmentsQuery.isFetching}
        selectedAssignmentId={selectedAssignmentId}
        disabledAssignments={busyAssignments}
        onSelect={handleSelect}
        onStartInterview={triggerStartInterview}
        onCompleteAssignment={triggerCompleteAssignment}
        onFailAssignment={triggerFailAssignment}
        onExpireAssignment={triggerExpireAssignment}
        onCancelAssignment={triggerCancelAssignment}
        t={t}
      />

      <div className={styles.actionsRow}>
        <div className={styles.badgeGroup}>
          <span className={styles.badge}>
            {t('telephone.pagination.page', { page, total: totalPages })}
          </span>
        </div>
        <div className={styles.assignmentActions}>
          <button
            type='button'
            className={styles.actionButton}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1}
          >
            {t('telephone.pagination.prev')}
          </button>
          <button
            type='button'
            className={styles.actionButton}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page >= totalPages}
          >
            {t('telephone.pagination.next')}
          </button>
          <SelectInput
            label={t('telephone.pagination.pageSize')}
            value={String(pageSize)}
            onChange={(event) => setPageSize(Number(event.target.value) as typeof PAGE_SIZES[number])}
            options={PAGE_SIZES.map((size) => ({ value: String(size), label: `${size}` }))}
          />
        </div>
      </div>

      {selectedAssignment && (
        <div className={styles.detailCard}>
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t('telephone.details.phone')}</span>
              <span>{selectedAssignment.sample_phone_number}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t('telephone.details.interviewer')}</span>
              <span>{selectedAssignment.interviewer_full_name}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t('telephone.details.status')}</span>
              <span>{translateStatus(selectedAssignment.status, t)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t('telephone.details.reserved')}</span>
              <span>{new Date(selectedAssignment.reserved_at).toLocaleString()}</span>
            </div>
            {selectedAssignment.completed_at && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>{t('telephone.details.completed')}</span>
                <span>{new Date(selectedAssignment.completed_at).toLocaleString()}</span>
              </div>
            )}
          </div>
          {selectedAssignment.sample_attributes &&
            Object.keys(selectedAssignment.sample_attributes).length > 0 && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>{t('telephone.details.attributes')}</span>
              <div className={styles.badgeGroup}>
                {Object.entries(selectedAssignment.sample_attributes).map(([key, value]) => (
                  <span key={key} className={styles.badge}>
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function translateStatus(status: InsightZenAssignmentStatus, t: (key: string) => string) {
  return {
    reserved: t('telephone.status.reserved'),
    completed: t('telephone.status.completed'),
    failed: t('telephone.status.failed'),
    expired: t('telephone.status.expired'),
    cancelled: t('telephone.status.cancelled'),
  }[status]
}

import React from 'react'

import cx from 'classnames'

import type { InsightZenAssignment } from '../../api/types'
import { translateAssignmentStatus } from '../../api/assignmentsApi'
import styles from '../../pages/Collection/TelephoneInterviewer/TelephoneInterviewerPage.module.scss'

interface DialerTableProps {
  assignments: InsightZenAssignment[]
  isLoading: boolean
  selectedAssignmentId: number | null
  disabledAssignments: ReadonlySet<number>
  onSelect: (assignment: InsightZenAssignment) => void
  onStartInterview: (assignment: InsightZenAssignment) => void
  onCompleteAssignment: (assignment: InsightZenAssignment) => void
  onFailAssignment: (assignment: InsightZenAssignment) => void
  onExpireAssignment: (assignment: InsightZenAssignment) => void
  onCancelAssignment: (assignment: InsightZenAssignment) => void
  t: (key: string) => string
}

function renderStatusBadge(
  assignment: InsightZenAssignment,
  t: (key: string) => string,
): React.ReactNode {
  const label = translateAssignmentStatus(assignment.status, t)
  return (
    <span className={styles.statusBadge} data-variant={assignment.status}>
      {label}
    </span>
  )
}

export function DialerTable({
  assignments,
  isLoading,
  selectedAssignmentId,
  disabledAssignments,
  onSelect,
  onStartInterview,
  onCompleteAssignment,
  onFailAssignment,
  onExpireAssignment,
  onCancelAssignment,
  t,
}: DialerTableProps) {
  return (
    <div className={styles.tableWrapper} role='region' aria-live='polite'>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope='col'>{t('telephone.table.phone')}</th>
            <th scope='col'>{t('telephone.table.interviewer')}</th>
            <th scope='col'>{t('telephone.table.status')}</th>
            <th scope='col'>{t('telephone.table.reserved')}</th>
            <th scope='col'>{t('telephone.table.expires')}</th>
            <th scope='col'>{t('telephone.table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={6}>{t('telephone.loading')}</td>
            </tr>
          ) : assignments.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <div className={styles.emptyState}>{t('telephone.empty')}</div>
              </td>
            </tr>
          ) : (
            assignments.map((assignment) => {
              const isSelected = assignment.id === selectedAssignmentId
              const isDisabled = disabledAssignments.has(assignment.id)
              const canStart =
                assignment.status === 'reserved' && assignment.interview?.status === 'not_started'
              const canComplete = assignment.status === 'reserved'
              const canFail = assignment.status === 'reserved'
              const canExpire = assignment.status === 'reserved'
              const canCancel = assignment.status === 'reserved'

              return (
                <tr
                  key={assignment.id}
                  className={cx({ [styles.rowSelected]: isSelected })}
                  onClick={() => onSelect(assignment)}
                  role='button'
                  tabIndex={0}
                  aria-selected={isSelected}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelect(assignment)
                    }
                  }}
                >
                  <td>{assignment.sample_phone_number}</td>
                  <td>
                    <div className={styles.detailItem}>
                      <span>{assignment.interviewer_full_name}</span>
                      <span className={styles.detailLabel}>{assignment.interviewer_username}</span>
                    </div>
                  </td>
                  <td>{renderStatusBadge(assignment, t)}</td>
                  <td>{new Date(assignment.reserved_at).toLocaleString()}</td>
                  <td>{new Date(assignment.expires_at).toLocaleString()}</td>
                  <td>
                    <div className={styles.assignmentActions}>
                      <button
                        type='button'
                        className={styles.actionButton}
                        disabled={!canStart || isDisabled}
                        onClick={(event) => {
                          event.stopPropagation()
                          onStartInterview(assignment)
                        }}
                      >
                        {t('telephone.actions.start')}
                      </button>
                      <button
                        type='button'
                        className={styles.actionButton}
                        disabled={!canComplete || isDisabled}
                        onClick={(event) => {
                          event.stopPropagation()
                          onCompleteAssignment(assignment)
                        }}
                      >
                        {t('telephone.actions.complete')}
                      </button>
                      <button
                        type='button'
                        className={styles.actionButton}
                        disabled={!canFail || isDisabled}
                        onClick={(event) => {
                          event.stopPropagation()
                          onFailAssignment(assignment)
                        }}
                      >
                        {t('telephone.actions.fail')}
                      </button>
                      <button
                        type='button'
                        className={styles.actionButton}
                        disabled={!canExpire || isDisabled}
                        onClick={(event) => {
                          event.stopPropagation()
                          onExpireAssignment(assignment)
                        }}
                      >
                        {t('telephone.actions.expire')}
                      </button>
                      <button
                        type='button'
                        className={styles.actionButton}
                        disabled={!canCancel || isDisabled}
                        onClick={(event) => {
                          event.stopPropagation()
                          onCancelAssignment(assignment)
                        }}
                      >
                        {t('telephone.actions.cancel')}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

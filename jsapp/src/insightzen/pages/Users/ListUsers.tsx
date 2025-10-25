// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react'

import alertify from 'alertifyjs'
import cx from 'classnames'

import {
  exportInsightZenUsers,
  useCreateInsightZenUserMutation,
  useDeactivateInsightZenUserMutation,
  useInsightZenUserQuery,
  useInsightZenUsersQuery,
  useReactivateInsightZenUserMutation,
  useUpdateInsightZenUserMutation,
} from '../../api/usersApi'
import type {
  InsightZenFilters,
  InsightZenMembership,
  InsightZenRole,
  InsightZenUser,
  InsightZenUserPayload,
} from '../../api/types'
import { PermissionTree, type PermissionTreeValue } from '../../components/permissionTree/PermissionTree'
import { SelectInput } from '../../components/inputs/SelectInput'
import { TextInput } from '../../components/inputs/TextInput'
import { ToggleInput } from '../../components/inputs/ToggleInput'
import { ProjectLookupSelect } from '../../components/inputs/LookupSelect'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useInsightZenI18n } from '../../i18n/I18nProvider'
import styles from '../../components/layout/InsightZenLayout.module.scss'

const DEFAULT_COLUMNS = ['avatar', 'name', 'username', 'email', 'phone', 'status', 'roles', 'projects'] as const

type UserColumn = (typeof DEFAULT_COLUMNS)[number]

interface EditUserState {
  id?: number
  username: string
  first_name: string
  last_name: string
  email: string
  phone: string
  preferred_locale: 'fa' | 'en'
  timezone: string
  is_active: boolean
  is_staff: boolean
  password?: string
  memberships: MembershipFormState[]
}

interface MembershipFormState {
  id?: number
  project: number | ''
  projectLabel: string
  role: InsightZenRole
  title: string
  panel_permissions: PermissionTreeValue
}

const ROLE_OPTIONS: Array<{ labelKey: string; value: InsightZenRole }> = [
  { labelKey: 'admin', value: 'admin' },
  { labelKey: 'manager', value: 'manager' },
  { labelKey: 'supervisor', value: 'supervisor' },
  { labelKey: 'agent', value: 'agent' },
  { labelKey: 'viewer', value: 'viewer' },
]

export function ListUsersPage() {
  const { t } = useInsightZenI18n()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [projectFilter, setProjectFilter] = useState<number | ''>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedColumns, setSelectedColumns] = useState<UserColumn[]>([...DEFAULT_COLUMNS])
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false)
  const [drawerState, setDrawerState] = useState<null | { mode: 'create' | 'edit'; userId?: number }>(null)

  const debouncedSearch = useDebouncedValue(search)

  const filters: InsightZenFilters = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      is_active:
        statusFilter === 'all' ? undefined : statusFilter === 'active' ? true : false,
      role: roleFilter || undefined,
      project_id: projectFilter === '' ? undefined : projectFilter,
      page,
      page_size: pageSize,
    }),
    [debouncedSearch, statusFilter, roleFilter, projectFilter, page, pageSize],
  )

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, roleFilter, projectFilter, pageSize])

  const usersQuery = useInsightZenUsersQuery(filters)

  const deactivateUserMutation = useDeactivateInsightZenUserMutation()
  const reactivateUserMutation = useReactivateInsightZenUserMutation()

  const totalCount = usersQuery.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const columnLabels: Record<UserColumn, string> = {
    avatar: t('users.table.avatar'),
    name: t('users.table.name'),
    username: t('users.table.username'),
    email: t('users.table.email'),
    phone: t('users.table.phone'),
    status: t('users.table.status'),
    roles: t('users.table.roles'),
    projects: t('users.table.projects'),
  }

  const renderCell = (column: UserColumn, user: InsightZenUser) => {
    switch (column) {
      case 'avatar': {
        const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.trim()
        const fallback = user.username.charAt(0).toUpperCase()
        return <span className={styles.badge}>{(initials || fallback).toUpperCase()}</span>
      }
      case 'name':
        return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.username
      case 'username':
        return user.username
      case 'email':
        return user.email
      case 'phone':
        return user.phone
      case 'status':
        return user.is_active ? t('users.status.active') : t('users.status.inactive')
      case 'roles': {
        const roles = Array.from(new Set(user.memberships_brief.map((membership) => membership.role)))
        return (
          <div className={styles.badgeGroup}>
            {roles.map((role) => (
              <span key={role} className={styles.badge}>
                {role}
              </span>
            ))}
          </div>
        )
      }
      case 'projects': {
        return (
          <div className={styles.badgeGroup}>
            {user.memberships_brief.map((membership) => (
              <span key={membership.id} className={styles.badge}>
                {membership.project_code}
              </span>
            ))}
          </div>
        )
      }
      default:
        return null
    }
  }

  const handleToggleColumn = (column: UserColumn) => {
    setSelectedColumns((current) => {
      if (current.includes(column)) {
        const updated = current.filter((item) => item !== column)
        return updated.length ? updated : current
      }
      return [...current, column]
    })
  }

  const users = usersQuery.data?.results ?? []

  const handleDeactivate = async (user: InsightZenUser) => {
    try {
      if (user.is_active) {
        await deactivateUserMutation.mutateAsync(user.id)
        alertify.success(t('users.deactivateSuccess'))
      } else {
        await reactivateUserMutation.mutateAsync(user.id)
        alertify.success(t('users.activateSuccess'))
      }
      await usersQuery.refetch()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
      alertify.error(t('users.activationError'))
    }
  }

  const openCreateDrawer = () => setDrawerState({ mode: 'create' })
  const openEditDrawer = (userId: number) => setDrawerState({ mode: 'edit', userId })
  const closeDrawer = () => setDrawerState(null)

  const handleExport = async (format: 'csv' | 'xlsx') => {
    const params: InsightZenFilters & { columns?: string[]; format: 'csv' | 'xlsx' } = {
      ...filters,
      format,
      columns: selectedColumns,
    }
    await exportInsightZenUsers(params)
  }

  return (
    <>
      <div className={styles.filtersRow}>
        <div className={styles.formRow}>
          <span className={styles.formLabel}>{t('users.search.placeholder')}</span>
          <input
            className={styles.textInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('users.search.placeholder')}
          />
        </div>
        <SelectInput
          label={t('users.filters.status')}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
          options={[
            { label: t('users.filters.all'), value: 'all' },
            { label: t('users.filters.active'), value: 'active' },
            { label: t('users.filters.inactive'), value: 'inactive' },
          ]}
        />
        <SelectInput
          label={t('users.filters.role')}
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          options={[
            { label: t('users.filters.all'), value: '' },
            ...ROLE_OPTIONS.map((option) => ({
              label: option.labelKey,
              value: option.value,
            })),
          ]}
        />
        <ProjectLookupSelect
          label={t('users.filters.project')}
          value={projectFilter}
          onChange={(value) => setProjectFilter(value)}
          placeholder={t('users.filters.all')}
          searchPlaceholder={t('inputs.lookup.search')}
          loadMoreLabel={t('inputs.lookup.loadMore')}
        />
        <button type='button' className={styles.actionButton} onClick={openCreateDrawer}>
          {t('users.add')}
        </button>
        <div className={styles.filtersRow}>
          <button
            type='button'
            className={styles.actionButton}
            onClick={() => setIsColumnPickerOpen((value) => !value)}
          >
            {t('users.columns')}
          </button>
          {isColumnPickerOpen && (
            <div className={styles.permissionTree}>
              {DEFAULT_COLUMNS.map((column) => (
                <label key={column} className={styles.permissionCheckbox}>
                  <input
                    type='checkbox'
                    checked={selectedColumns.includes(column)}
                    onChange={() => handleToggleColumn(column)}
                  />
                  <span>{columnLabels[column]}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className={styles.filtersRow}>
          <button type='button' className={styles.actionButton} onClick={() => handleExport('csv')}>
            {t('users.export.csv')}
          </button>
          <button type='button' className={styles.actionButton} onClick={() => handleExport('xlsx')}>
            {t('users.export.xlsx')}
          </button>
        </div>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {selectedColumns.map((column) => (
                <th key={column}>{columnLabels[column]}</th>
              ))}
              <th className={styles.actionsColumn}>{t('users.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                {selectedColumns.map((column) => (
                  <td key={column}>{renderCell(column, user)}</td>
                ))}
                <td className={cx(styles.actionsColumn, styles.badgeGroup)}>
                  <button type='button' className={styles.actionButton} onClick={() => openEditDrawer(user.id)}>
                    {t('users.edit')}
                  </button>
                  <button type='button' className={styles.actionButton} onClick={() => handleDeactivate(user)}>
                    {user.is_active ? t('users.deactivate') : t('users.activate')}
                  </button>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={selectedColumns.length + 1}>
                  <div className={styles.emptyState}>
                    <h3>{t('users.empty.title')}</h3>
                    <p>{t('users.empty.description')}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className={styles.pagination}>
        <div>
          {totalCount} / {t('table.pagination.pageSize')} {pageSize}
        </div>
        <div className={styles.paginationControls}>
          <button
            type='button'
            className={styles.paginationButton}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1}
          >
            {t('table.pagination.previous')}
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type='button'
            className={styles.paginationButton}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page >= totalPages}
          >
            {t('table.pagination.next')}
          </button>
          <select
            className={styles.selectInput}
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
          >
            {[20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
      {drawerState && (
        <EditUserDrawer drawerState={drawerState} onClose={closeDrawer} onSuccess={closeDrawer} />
      )}
    </>
  )
}

interface EditUserDrawerProps {
  drawerState: { mode: 'create' | 'edit'; userId?: number }
  onClose: () => void
  onSuccess: () => void
}

function EditUserDrawer({ drawerState, onClose, onSuccess }: EditUserDrawerProps) {
  const { t } = useInsightZenI18n()
  const isCreateMode = drawerState.mode === 'create'
  const { data: existingUser } = useInsightZenUserQuery(drawerState.userId ?? 0, drawerState.mode === 'edit')
  const [activeTab, setActiveTab] = useState<'profile' | 'memberships'>('profile')
  const [formState, setFormState] = useState<EditUserState>(() =>
    mapUserToFormState(existingUser, isCreateMode),
  )
  const createMutation = useCreateInsightZenUserMutation()
  const updateMutation = useUpdateInsightZenUserMutation(existingUser?.id ?? 0)
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (existingUser) {
      setFormState(mapUserToFormState(existingUser, isCreateMode))
    }
  }, [existingUser, isCreateMode])

  const handleMembershipChange = (index: number, updatedMembership: Partial<MembershipFormState>) => {
    setFormState((current) => {
      const nextMemberships = [...current.memberships]
      nextMemberships[index] = { ...nextMemberships[index], ...updatedMembership }
      return { ...current, memberships: nextMemberships }
    })
  }

  const addMembership = () => {
    setFormState((current) => ({
      ...current,
      memberships: [
        ...current.memberships,
        {
          project: '',
          projectLabel: '',
          role: 'viewer',
          title: '',
          panel_permissions: {},
        },
      ],
    }))
  }

  const removeMembership = (index: number) => {
    setFormState((current) => ({
      ...current,
      memberships: current.memberships.filter((_, membershipIndex) => membershipIndex !== index),
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = mapFormStateToPayload(formState)
    if (isCreateMode) {
      await createMutation.mutateAsync(payload)
    } else if (existingUser?.id) {
      await updateMutation.mutateAsync(payload)
    }
    onSuccess()
    onClose()
  }

  return (
    <div className={styles.drawerOverlay}>
      <div className={styles.drawer}>
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className={styles.tabList} role='tablist'>
            <button
              type='button'
              className={cx(styles.tabButton, {
                [styles.tabButtonActive]: activeTab === 'profile',
              })}
              onClick={() => setActiveTab('profile')}
            >
              {t('users.form.profile')}
            </button>
            <button
              type='button'
              className={cx(styles.tabButton, {
                [styles.tabButtonActive]: activeTab === 'memberships',
              })}
              onClick={() => setActiveTab('memberships')}
            >
              {t('users.form.memberships')}
            </button>
          </div>
          {activeTab === 'profile' ? (
            <div className={styles.formGrid}>
              <TextInput
                label={t('users.form.username')}
                value={formState.username}
                onChange={(event) => setFormState((current) => ({ ...current, username: event.target.value }))}
                required
              />
              <TextInput
                label={t('users.form.first_name')}
                value={formState.first_name}
                onChange={(event) => setFormState((current) => ({ ...current, first_name: event.target.value }))}
              />
              <TextInput
                label={t('users.form.last_name')}
                value={formState.last_name}
                onChange={(event) => setFormState((current) => ({ ...current, last_name: event.target.value }))}
              />
              <TextInput
                type='email'
                label={t('users.form.email')}
                value={formState.email}
                onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
              />
              <TextInput
                label={t('users.form.phone')}
                value={formState.phone}
                onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
              />
              <SelectInput
                label={t('users.form.locale')}
                value={formState.preferred_locale}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    preferred_locale: event.target.value as 'fa' | 'en',
                  }))
                }
                options={[
                  { label: t('layout.language.fa'), value: 'fa' },
                  { label: t('layout.language.en'), value: 'en' },
                ]}
              />
              <TextInput
                label={t('users.form.timezone')}
                value={formState.timezone}
                onChange={(event) => setFormState((current) => ({ ...current, timezone: event.target.value }))}
              />
              {isCreateMode && (
                <TextInput
                  type='password'
                  label={t('users.form.password')}
                  value={formState.password ?? ''}
                  onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))}
                />
              )}
              <ToggleInput
                label={t('users.form.is_active')}
                checked={formState.is_active}
                onChange={(event) => setFormState((current) => ({ ...current, is_active: event.target.checked }))}
              />
              <ToggleInput
                label={t('users.form.is_staff')}
                checked={formState.is_staff}
                onChange={(event) => setFormState((current) => ({ ...current, is_staff: event.target.checked }))}
              />
            </div>
          ) : (
            <div className={styles.membershipList}>
              {!formState.memberships.length && (
                <div className={styles.emptyState}>{t('users.form.memberships.empty')}</div>
              )}
              {formState.memberships.map((membership, index) => (
                <div key={index} className={styles.membershipCard}>
                  <ProjectLookupSelect
                    label={t('users.form.memberships.project')}
                    value={membership.project}
                    selectedLabel={membership.projectLabel}
                    onChange={(value, option) =>
                      handleMembershipChange(index, {
                        project: value,
                        projectLabel: option?.label ?? '',
                      })
                    }
                    placeholder={t('inputs.select.placeholder')}
                    searchPlaceholder={t('inputs.lookup.search')}
                    loadMoreLabel={t('inputs.lookup.loadMore')}
                  />
                  <SelectInput
                    label={t('users.form.memberships.role')}
                    value={membership.role}
                    onChange={(event) =>
                      handleMembershipChange(index, {
                        role: event.target.value as InsightZenRole,
                      })
                    }
                    options={ROLE_OPTIONS.map((option) => ({
                      label: option.labelKey,
                      value: option.value,
                    }))}
                  />
                  <TextInput
                    label={t('users.form.memberships.title')}
                    value={membership.title}
                    onChange={(event) =>
                      handleMembershipChange(index, { title: event.target.value })
                    }
                  />
                  <PermissionTree
                    value={membership.panel_permissions}
                    onChange={(nextValue) =>
                      handleMembershipChange(index, { panel_permissions: nextValue })
                    }
                  />
                  <div className={styles.membershipActions}>
                    <button
                      type='button'
                      className={styles.actionButton}
                      onClick={() => removeMembership(index)}
                    >
                      {t('users.form.memberships.remove')}
                    </button>
                  </div>
                </div>
              ))}
              <button type='button' className={styles.actionButton} onClick={addMembership}>
                {t('users.form.memberships.add')}
              </button>
            </div>
          )}
          <div className={styles.filtersRow}>
            <button type='button' className={styles.actionButton} onClick={onClose}>
              {t('users.form.cancel')}
            </button>
            <button type='submit' className={styles.actionButton} disabled={isSubmitting}>
              {t('users.form.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function mapUserToFormState(user: InsightZenUser | undefined, isCreateMode: boolean): EditUserState {
  if (!user || isCreateMode) {
    return {
      username: user?.username ?? '',
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      preferred_locale: user?.preferred_locale ?? 'fa',
      timezone: user?.timezone ?? 'Asia/Tehran',
      is_active: user?.is_active ?? true,
      is_staff: user?.is_staff ?? false,
      memberships: user?.memberships_detail?.map(mapMembershipToFormState) ?? [],
    }
  }
  return {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone,
    preferred_locale: user.preferred_locale,
    timezone: user.timezone,
    is_active: user.is_active,
    is_staff: user.is_staff,
    memberships: user.memberships_detail.map(mapMembershipToFormState),
  }
}

function mapMembershipToFormState(membership: InsightZenMembership): MembershipFormState {
  return {
    id: membership.id,
    project: membership.project,
    projectLabel: membership.project_name,
    role: membership.role,
    title: membership.title,
    panel_permissions: membership.panel_permissions as PermissionTreeValue,
  }
}

function mapFormStateToPayload(formState: EditUserState): InsightZenUserPayload {
  return {
    username: formState.username,
    first_name: formState.first_name,
    last_name: formState.last_name,
    email: formState.email,
    phone: formState.phone,
    preferred_locale: formState.preferred_locale,
    timezone: formState.timezone,
    is_active: formState.is_active,
    is_staff: formState.is_staff,
    password: formState.password,
    memberships: formState.memberships
      .filter((membership) => membership.project)
      .map((membership) => ({
        id: membership.id,
        project: Number(membership.project),
        role: membership.role,
        title: membership.title,
        panel_permissions: membership.panel_permissions,
      })),
  }
}

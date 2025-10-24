import React, { useEffect, useMemo, useState } from 'react'

import alertify from 'alertifyjs'
import cx from 'classnames'

import {
  exportInsightZenProjects,
  syncProjectMemberships,
  useArchiveInsightZenProjectMutation,
  useCreateInsightZenProjectMutation,
  useInsightZenProjectQuery,
  useInsightZenProjectsQuery,
  useUpdateInsightZenProjectMutation,
} from '../../api/projectsApi'
import { useInsightZenUsersQuery } from '../../api/usersApi'
import type {
  InsightZenFilters,
  InsightZenMembership,
  InsightZenProject,
  InsightZenRole,
} from '../../api/types'
import { PermissionTree, type PermissionTreeValue } from '../../components/permissionTree/PermissionTree'
import { ProjectTypesInput } from '../../components/projectTypesInput/ProjectTypesInput'
import { SelectInput } from '../../components/inputs/SelectInput'
import { TextInput } from '../../components/inputs/TextInput'
import { UserLookupSelect } from '../../components/inputs/LookupSelect'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useInsightZenI18n } from '../../i18n/I18nProvider'
import styles from '../../components/layout/InsightZenLayout.module.scss'

const PROJECT_COLUMNS = ['code', 'name', 'owner', 'types', 'status', 'dates', 'members'] as const

type ProjectColumn = (typeof PROJECT_COLUMNS)[number]

interface ProjectFormState {
  id?: number
  code: string
  name: string
  description: string
  owner: number | ''
  ownerLabel: string
  types: string[]
  status: 'active' | 'paused' | 'archived'
  start_date: string | ''
  end_date: string | ''
  memberships: ProjectMembershipFormState[]
}

interface ProjectMembershipFormState {
  id?: number
  user: number | ''
  userLabel: string
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

export function ListProjectsPage() {
  const { t } = useInsightZenI18n()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [ownerFilter, setOwnerFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedColumns, setSelectedColumns] = useState<ProjectColumn[]>([...PROJECT_COLUMNS])
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false)
  const [drawerState, setDrawerState] = useState<null | { mode: 'create' | 'edit'; projectId?: number }>(null)

  const debouncedSearch = useDebouncedValue(search)

  const filters: InsightZenFilters = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      status: statusFilter || undefined,
      owner_id: ownerFilter ? Number(ownerFilter) : undefined,
      type: typeFilter || undefined,
      page,
      page_size: pageSize,
    }),
    [debouncedSearch, statusFilter, ownerFilter, typeFilter, page, pageSize],
  )

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, ownerFilter, typeFilter, pageSize])

  const projectsQuery = useInsightZenProjectsQuery(filters)
  const ownerQueryFilters = useMemo<InsightZenFilters>(() => ({ is_active: true, page_size: 100 }), [])
  const usersQuery = useInsightZenUsersQuery(ownerQueryFilters)

  const archiveMutation = useArchiveInsightZenProjectMutation()

  const totalCount = projectsQuery.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const columnLabels: Record<ProjectColumn, string> = {
    code: t('projects.table.code'),
    name: t('projects.table.name'),
    owner: t('projects.table.owner'),
    types: t('projects.table.types'),
    status: t('projects.table.status'),
    dates: t('projects.table.dates'),
    members: t('projects.table.members'),
  }

  const toggleColumn = (column: ProjectColumn) => {
    setSelectedColumns((current) => {
      if (current.includes(column)) {
        const next = current.filter((item) => item !== column)
        return next.length ? next : current
      }
      return [...current, column]
    })
  }

  const projects = projectsQuery.data?.results ?? []

  const renderCell = (column: ProjectColumn, project: InsightZenProject) => {
    switch (column) {
      case 'code':
        return project.code
      case 'name':
        return project.name
      case 'owner':
        return project.owner_username
      case 'types':
        return (
          <div className={styles.badgeGroup}>
            {project.types.map((type) => (
              <span key={type} className={styles.badge}>
                {type}
              </span>
            ))}
          </div>
        )
      case 'status':
        return project.status
      case 'dates': {
        const start = project.start_date ?? '—'
        const end = project.end_date ?? '—'
        return `${start} → ${end}`
      }
      case 'members':
        return project.membership_count
      default:
        return null
    }
  }

  const openCreateDrawer = () => setDrawerState({ mode: 'create' })
  const openEditDrawer = (projectId: number) => setDrawerState({ mode: 'edit', projectId })
  const closeDrawer = () => setDrawerState(null)

  const handleArchive = async (project: InsightZenProject) => {
    await archiveMutation.mutateAsync(project.id)
    await projectsQuery.refetch()
  }

  const handleExport = async (format: 'csv' | 'xlsx') => {
    const params: InsightZenFilters & { columns?: string[]; format: 'csv' | 'xlsx' } = {
      ...filters,
      format,
      columns: selectedColumns,
    }
    await exportInsightZenProjects(params)
  }

  return (
    <>
      <div className={styles.filtersRow}>
        <div className={styles.formRow}>
          <span className={styles.formLabel}>{t('projects.search.placeholder')}</span>
          <input
            className={styles.textInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('projects.search.placeholder')}
          />
        </div>
        <SelectInput
          label={t('projects.filters.status')}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          options={[
            { label: t('users.filters.all'), value: '' },
            { label: 'active', value: 'active' },
            { label: 'paused', value: 'paused' },
            { label: 'archived', value: 'archived' },
          ]}
        />
        <UserLookupSelect
          label={t('projects.filters.owner')}
          value={ownerFilter}
          onChange={(value) => setOwnerFilter(value)}
          placeholder={t('users.filters.all')}
          searchPlaceholder={t('inputs.lookup.search')}
          loadMoreLabel={t('inputs.lookup.loadMore')}
          filters={{ is_active: true }}
        />
        <div className={styles.formRow}>
          <span className={styles.formLabel}>{t('projects.filters.type')}</span>
          <input
            className={styles.textInput}
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            placeholder={t('projects.filters.type')}
          />
        </div>
        <button type='button' className={styles.actionButton} onClick={openCreateDrawer}>
          {t('projects.add')}
        </button>
        <div className={styles.filtersRow}>
          <button
            type='button'
            className={styles.actionButton}
            onClick={() => setIsColumnPickerOpen((value) => !value)}
          >
            {t('projects.columns')}
          </button>
          {isColumnPickerOpen && (
            <div className={styles.permissionTree}>
              {PROJECT_COLUMNS.map((column) => (
                <label key={column} className={styles.permissionCheckbox}>
                  <input
                    type='checkbox'
                    checked={selectedColumns.includes(column)}
                    onChange={() => toggleColumn(column)}
                  />
                  <span>{columnLabels[column]}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className={styles.filtersRow}>
          <button type='button' className={styles.actionButton} onClick={() => handleExport('csv')}>
            {t('projects.export.csv')}
          </button>
          <button type='button' className={styles.actionButton} onClick={() => handleExport('xlsx')}>
            {t('projects.export.xlsx')}
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
              <th className={styles.actionsColumn}>{t('projects.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                {selectedColumns.map((column) => (
                  <td key={column}>{renderCell(column, project)}</td>
                ))}
                <td className={cx(styles.actionsColumn, styles.badgeGroup)}>
                  <button type='button' className={styles.actionButton} onClick={() => openEditDrawer(project.id)}>
                    {t('projects.edit')}
                  </button>
                  <button type='button' className={styles.actionButton} onClick={() => handleArchive(project)}>
                    {t('projects.archive')}
                  </button>
                </td>
              </tr>
            ))}
            {!projects.length && (
              <tr>
                <td colSpan={selectedColumns.length + 1}>
                  <div className={styles.emptyState}>
                    <h3>{t('projects.empty.title')}</h3>
                    <p>{t('projects.empty.description')}</p>
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
        <EditProjectDrawer
          drawerState={drawerState}
          onClose={closeDrawer}
          onSuccess={() => {
            closeDrawer()
            projectsQuery.refetch()
          }}
        />
      )}
    </>
  )
}

interface EditProjectDrawerProps {
  drawerState: { mode: 'create' | 'edit'; projectId?: number }
  onClose: () => void
  onSuccess: () => void
}

function EditProjectDrawer({ drawerState, onClose, onSuccess }: EditProjectDrawerProps) {
  const { t } = useInsightZenI18n()
  const isCreateMode = drawerState.mode === 'create'
  const { data: existingProject } = useInsightZenProjectQuery(drawerState.projectId ?? 0, drawerState.mode === 'edit')
  const [formState, setFormState] = useState<ProjectFormState>(() =>
    mapProjectToFormState(existingProject, isCreateMode),
  )
  const createMutation = useCreateInsightZenProjectMutation()
  const updateMutation = useUpdateInsightZenProjectMutation(existingProject?.id ?? 0)
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (existingProject) {
      setFormState(mapProjectToFormState(existingProject, isCreateMode))
    }
  }, [existingProject, isCreateMode])

  const handleMembershipChange = (index: number, updated: Partial<ProjectMembershipFormState>) => {
    setFormState((current) => {
      const memberships = [...current.memberships]
      memberships[index] = { ...memberships[index], ...updated }
      return { ...current, memberships }
    })
  }

  const addMembership = () => {
    setFormState((current) => ({
      ...current,
      memberships: [
        ...current.memberships,
        { user: '', userLabel: '', role: 'viewer', title: '', panel_permissions: {} },
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
    const payload = mapProjectFormToPayload(formState)
    let projectId = existingProject?.id

    try {
      if (isCreateMode) {
        const created = await createMutation.mutateAsync(payload)
        projectId = created.id
      } else if (projectId) {
        await updateMutation.mutateAsync(payload)
      }

      if (projectId) {
        await persistProjectMemberships(projectId, formState.memberships)
      }

      alertify.success(t('projects.form.saveSuccess'))
      onSuccess()
      onClose()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
      alertify.error(t('projects.form.saveError'))
    }
  }

  return (
    <div className={styles.drawerOverlay}>
      <div className={styles.drawer}>
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <TextInput
            label={t('projects.form.code')}
            value={formState.code}
            onChange={(event) => setFormState((current) => ({ ...current, code: event.target.value }))}
            required
          />
          <TextInput
            label={t('projects.form.name')}
            value={formState.name}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <TextInput
            label={t('projects.form.description')}
            value={formState.description}
            onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
          />
          <UserLookupSelect
            label={t('projects.form.owner')}
            value={formState.owner}
            selectedLabel={formState.ownerLabel}
            onChange={(value, option) =>
              setFormState((current) => ({
                ...current,
                owner: value,
                ownerLabel: option?.label ?? '',
              }))
            }
            placeholder={t('inputs.select.placeholder')}
            searchPlaceholder={t('inputs.lookup.search')}
            loadMoreLabel={t('inputs.lookup.loadMore')}
            filters={{ is_active: true }}
          />
          <ProjectTypesInput
            label={t('projects.form.types')}
            values={formState.types}
            onChange={(values) => setFormState((current) => ({ ...current, types: values }))}
          />
          <SelectInput
            label={t('projects.form.status')}
            value={formState.status}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                status: event.target.value as ProjectFormState['status'],
              }))
            }
            options={[
              { label: 'active', value: 'active' },
              { label: 'paused', value: 'paused' },
              { label: 'archived', value: 'archived' },
            ]}
          />
          <div className={styles.formRow}>
            <span className={styles.formLabel}>{t('projects.form.start_date')}</span>
            <input
              type='date'
              className={styles.dateInput}
              value={formState.start_date}
              onChange={(event) => setFormState((current) => ({ ...current, start_date: event.target.value }))}
            />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>{t('projects.form.end_date')}</span>
            <input
              type='date'
              className={styles.dateInput}
              value={formState.end_date}
              onChange={(event) => setFormState((current) => ({ ...current, end_date: event.target.value }))}
            />
          </div>
          <div className={styles.membershipList}>
            <h3>{t('projects.form.members')}</h3>
            {!formState.memberships.length && (
              <div className={styles.emptyState}>{t('users.form.memberships.empty')}</div>
            )}
            {formState.memberships.map((membership, index) => (
              <div key={index} className={styles.membershipCard}>
                <UserLookupSelect
                  label={t('users.table.name')}
                  value={membership.user}
                  selectedLabel={membership.userLabel}
                  onChange={(value, option) =>
                    handleMembershipChange(index, {
                      user: value,
                      userLabel: option?.label ?? '',
                    })
                  }
                  placeholder={t('inputs.select.placeholder')}
                  searchPlaceholder={t('inputs.lookup.search')}
                  loadMoreLabel={t('inputs.lookup.loadMore')}
                  filters={{ is_active: true }}
                />
                <SelectInput
                  label={t('users.form.memberships.role')}
                  value={membership.role}
                  onChange={(event) =>
                    handleMembershipChange(index, {
                      role: event.target.value as InsightZenRole,
                    })
                  }
                  options={ROLE_OPTIONS.map((option) => ({ label: option.labelKey, value: option.value }))}
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
                  <button type='button' className={styles.actionButton} onClick={() => removeMembership(index)}>
                    {t('users.form.memberships.remove')}
                  </button>
                </div>
              </div>
            ))}
            <button type='button' className={styles.actionButton} onClick={addMembership}>
              {t('projects.form.add_member')}
            </button>
          </div>
          <div className={styles.filtersRow}>
            <button type='button' className={styles.actionButton} onClick={onClose}>
              {t('projects.form.cancel')}
            </button>
            <button type='submit' className={styles.actionButton} disabled={isSubmitting}>
              {t('projects.form.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function mapProjectToFormState(project: InsightZenProject | undefined, isCreateMode: boolean): ProjectFormState {
  if (!project || isCreateMode) {
    return {
      code: project?.code ?? '',
      name: project?.name ?? '',
      description: project?.description ?? '',
      owner: project?.owner ?? '',
      ownerLabel: project?.owner_username ?? '',
      types: project?.types ?? [],
      status: project?.status ?? 'active',
      start_date: project?.start_date ?? '',
      end_date: project?.end_date ?? '',
      memberships: project?.memberships.map(mapProjectMembershipToFormState) ?? [],
    }
  }
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    description: project.description,
    owner: project.owner,
    ownerLabel: project.owner_username,
    types: project.types,
    status: project.status,
    start_date: project.start_date ?? '',
    end_date: project.end_date ?? '',
    memberships: project.memberships.map(mapProjectMembershipToFormState),
  }
}

function mapProjectMembershipToFormState(membership: InsightZenMembership): ProjectMembershipFormState {
  return {
    id: membership.id,
    user: membership.user,
    userLabel: membership.user_full_name || membership.user_username,
    role: membership.role,
    title: membership.title,
    panel_permissions: membership.panel_permissions as PermissionTreeValue,
  }
}

function mapProjectFormToPayload(formState: ProjectFormState) {
  return {
    code: formState.code,
    name: formState.name,
    description: formState.description,
    owner: formState.owner ? Number(formState.owner) : undefined,
    types: formState.types,
    status: formState.status,
    start_date: formState.start_date || null,
    end_date: formState.end_date || null,
  }
}

async function persistProjectMemberships(
  projectId: number,
  memberships: ProjectMembershipFormState[],
) {
  const payload = memberships
    .filter((membership) => membership.user)
    .map((membership) => ({
      id: membership.id,
      user: Number(membership.user),
      role: membership.role,
      title: membership.title,
      panel_permissions: membership.panel_permissions,
    }))

  return syncProjectMemberships(projectId, payload)
}

import React, { useMemo, useState } from 'react'

import { useInsightZenUserLookup } from '../../api/usersApi'
import { useInsightZenProjectLookup } from '../../api/projectsApi'
import type { InsightZenFilters, InsightZenProject, InsightZenUser } from '../../api/types'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import styles from '../layout/InsightZenLayout.module.scss'

interface BaseLookupProps {
  label: string
  value: number | ''
  onChange: (value: number | '') => void
  placeholder?: string
  selectedLabel?: string
  searchPlaceholder: string
  loadMoreLabel: string
  filters?: Partial<InsightZenFilters>
  disabled?: boolean
}

interface LookupOption {
  id: number
  label: string
}

function formatUserLabel(user: InsightZenUser): string {
  const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  return fullName ? `${fullName} (${user.username})` : user.username
}

function formatProjectLabel(project: InsightZenProject): string {
  return project.name
}

function ensureSelectedOption(
  options: LookupOption[],
  value: number | '',
  selectedLabel?: string,
): LookupOption[] {
  if (!value || options.some((option) => option.id === value)) {
    return options
  }
  if (selectedLabel) {
    return [...options, { id: value, label: selectedLabel }]
  }
  return options
}

function renderLookup(
  props: BaseLookupProps,
  options: LookupOption[],
  searchValue: string,
  setSearchValue: (value: string) => void,
  hasNextPage: boolean,
  onLoadMore: () => void,
  isLoadingMore: boolean,
) {
  const { label, value, onChange, placeholder, searchPlaceholder, loadMoreLabel, disabled } = props
  return (
    <div className={styles.lookupContainer}>
      <label className={styles.formRow}>
        <span className={styles.formLabel}>{label}</span>
        <input
          type='search'
          className={styles.lookupSearchInput}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder={searchPlaceholder}
          disabled={disabled}
        />
        <select
          className={styles.selectInput}
          value={value === '' ? '' : String(value)}
          onChange={(event) => onChange(event.target.value ? Number(event.target.value) : '')}
          disabled={disabled}
        >
          <option value=''>{placeholder ?? ''}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {hasNextPage && (
        <button
          type='button'
          className={styles.loadMoreButton}
          onClick={onLoadMore}
          disabled={disabled || isLoadingMore}
        >
          {loadMoreLabel}
        </button>
      )}
    </div>
  )
}

export function UserLookupSelect(props: BaseLookupProps) {
  const { value, selectedLabel, filters, disabled } = props
  const [searchValue, setSearchValue] = useState('')
  const debouncedSearch = useDebouncedValue(searchValue, 400)
  const lookup = useInsightZenUserLookup(debouncedSearch, { filters, enabled: !disabled })

  const options = useMemo(() => {
    const pages = lookup.data?.pages ?? []
    const unique = new Map<number, string>()
    pages.forEach((page) => {
      page.results.forEach((user) => {
        unique.set(user.id, formatUserLabel(user))
      })
    })
    const normalized = Array.from(unique.entries()).map(([id, label]) => ({ id, label }))
    return ensureSelectedOption(normalized, value, selectedLabel)
  }, [lookup.data, value, selectedLabel])

  return renderLookup(
    props,
    options,
    searchValue,
    setSearchValue,
    Boolean(lookup.hasNextPage),
    () => lookup.fetchNextPage(),
    lookup.isFetchingNextPage,
  )
}

export function ProjectLookupSelect(props: BaseLookupProps) {
  const { value, selectedLabel, filters, disabled } = props
  const [searchValue, setSearchValue] = useState('')
  const debouncedSearch = useDebouncedValue(searchValue, 400)
  const lookup = useInsightZenProjectLookup(debouncedSearch, { filters, enabled: !disabled })

  const options = useMemo(() => {
    const pages = lookup.data?.pages ?? []
    const unique = new Map<number, string>()
    pages.forEach((page) => {
      page.results.forEach((project) => {
        unique.set(project.id, formatProjectLabel(project))
      })
    })
    const normalized = Array.from(unique.entries()).map(([id, label]) => ({ id, label }))
    return ensureSelectedOption(normalized, value, selectedLabel)
  }, [lookup.data, value, selectedLabel])

  return renderLookup(
    props,
    options,
    searchValue,
    setSearchValue,
    Boolean(lookup.hasNextPage),
    () => lookup.fetchNextPage(),
    lookup.isFetchingNextPage,
  )
}

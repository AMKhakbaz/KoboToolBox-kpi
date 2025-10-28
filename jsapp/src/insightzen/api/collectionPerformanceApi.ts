// @ts-nocheck
import { useQuery } from '@tanstack/react-query'

import { fetchGet } from '#/api'
import type { PaginatedResponse } from '#/dataInterface'

import { insightZenQueryKeys } from './queryKeys'
import type {
  InsightZenCollectionBarEntry,
  InsightZenCollectionBarParams,
  InsightZenCollectionFilters,
  InsightZenCollectionOptions,
  InsightZenCollectionPieEntry,
  InsightZenCollectionSummary,
  InsightZenCollectionTableFilters,
  InsightZenCollectionTableRow,
  InsightZenCollectionTopEntry,
} from './types'

const COLLECTION_BASE_URL = '/api/insightzen/performance/collection'

function appendList(search: URLSearchParams, key: string, values?: Array<string | number>) {
  if (!values) return
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value))
    }
  }
}

function buildFilters(params: InsightZenCollectionFilters | InsightZenCollectionTableFilters) {
  const search = new URLSearchParams()
  search.set('project', String(params.project))
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  appendList(
    search,
    'interviewer',
    Array.isArray(params.interviewer) ? params.interviewer : undefined,
  )
  appendList(search, 'outcomes', Array.isArray(params.outcomes) ? params.outcomes : undefined)
  appendList(search, 'team', Array.isArray(params.team) ? params.team : undefined)
  if ('page' in params && params.page !== undefined) search.set('page', String(params.page))
  if ('page_size' in params && params.page_size !== undefined) {
    search.set('page_size', String(params.page_size))
  }
  return search
}

export async function fetchCollectionSummary(
  params: InsightZenCollectionFilters,
): Promise<InsightZenCollectionSummary> {
  const search = buildFilters(params)
  const url = `${COLLECTION_BASE_URL}/summary/?${search.toString()}`
  return fetchGet<InsightZenCollectionSummary>(url)
}

export async function fetchCollectionBar(
  params: InsightZenCollectionBarParams,
): Promise<InsightZenCollectionBarEntry[]> {
  const search = buildFilters(params)
  if (params.group_by) search.set('group_by', params.group_by)
  if (params.metric) search.set('metric', params.metric)
  if (params.limit !== undefined) search.set('limit', String(params.limit))
  const url = `${COLLECTION_BASE_URL}/bar/?${search.toString()}`
  return fetchGet<InsightZenCollectionBarEntry[]>(url)
}

export async function fetchCollectionPie(
  params: InsightZenCollectionFilters & { metric?: 'completes' | 'attempts' | 'sr' },
): Promise<InsightZenCollectionPieEntry[]> {
  const search = buildFilters(params)
  if (params.metric) search.set('metric', params.metric)
  const url = `${COLLECTION_BASE_URL}/pie/?${search.toString()}`
  return fetchGet<InsightZenCollectionPieEntry[]>(url)
}

export async function fetchCollectionTop(
  params: InsightZenCollectionFilters & { sort?: 'completes' | 'attempts' | 'sr'; limit?: number },
): Promise<InsightZenCollectionTopEntry[]> {
  const search = buildFilters(params)
  if (params.sort) search.set('sort', params.sort)
  if (params.limit !== undefined) search.set('limit', String(params.limit))
  const url = `${COLLECTION_BASE_URL}/top/?${search.toString()}`
  return fetchGet<InsightZenCollectionTopEntry[]>(url)
}

export async function fetchCollectionTable(
  params: InsightZenCollectionTableFilters,
): Promise<PaginatedResponse<InsightZenCollectionTableRow>> {
  const search = buildFilters(params)
  const url = `${COLLECTION_BASE_URL}/table/?${search.toString()}`
  return fetchGet<PaginatedResponse<InsightZenCollectionTableRow>>(url)
}

export async function fetchCollectionOptions(
  params: InsightZenCollectionFilters,
): Promise<InsightZenCollectionOptions> {
  const search = buildFilters(params)
  const url = `${COLLECTION_BASE_URL}/options/?${search.toString()}`
  return fetchGet<InsightZenCollectionOptions>(url)
}

export function useCollectionSummaryQuery(
  params: InsightZenCollectionFilters | null,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: insightZenQueryKeys.collectionPerformance.summary(params ?? {}),
    queryFn: () => fetchCollectionSummary(params as InsightZenCollectionFilters),
    enabled: Boolean(params && (options.enabled ?? true)),
  })
}

export function useCollectionBarQuery(
  params: InsightZenCollectionBarParams | null,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: insightZenQueryKeys.collectionPerformance.bar(params ?? {}),
    queryFn: () => fetchCollectionBar(params as InsightZenCollectionBarParams),
    enabled: Boolean(params && (options.enabled ?? true)),
  })
}

export function useCollectionPieQuery(
  params: (InsightZenCollectionFilters & { metric?: 'completes' | 'attempts' | 'sr' }) | null,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: insightZenQueryKeys.collectionPerformance.pie(params ?? {}),
    queryFn: () => fetchCollectionPie(params as InsightZenCollectionFilters & { metric?: 'completes' | 'attempts' | 'sr' }),
    enabled: Boolean(params && (options.enabled ?? true)),
  })
}

export function useCollectionTopQuery(
  params: (InsightZenCollectionFilters & { sort?: 'completes' | 'attempts' | 'sr'; limit?: number }) | null,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: insightZenQueryKeys.collectionPerformance.top(params ?? {}),
    queryFn: () => fetchCollectionTop(params as InsightZenCollectionFilters & { sort?: 'completes' | 'attempts' | 'sr'; limit?: number }),
    enabled: Boolean(params && (options.enabled ?? true)),
  })
}

export function useCollectionTableQuery(
  params: InsightZenCollectionTableFilters | null,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: insightZenQueryKeys.collectionPerformance.table(params ?? {}),
    queryFn: () => fetchCollectionTable(params as InsightZenCollectionTableFilters),
    keepPreviousData: true,
    enabled: Boolean(params && (options.enabled ?? true)),
  })
}

export function useCollectionOptionsQuery(
  params: InsightZenCollectionFilters | null,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: insightZenQueryKeys.collectionPerformance.options(params ?? {}),
    queryFn: () => fetchCollectionOptions(params as InsightZenCollectionFilters),
    enabled: Boolean(params && (options.enabled ?? true)),
  })
}

export async function exportCollectionPerformanceXlsx(params: InsightZenCollectionFilters): Promise<void> {
  const search = buildFilters(params)
  const url = `${COLLECTION_BASE_URL}/export/xlsx/?${search.toString()}`
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: '*/*' },
  })
  if (!response.ok) {
    throw new Error('Failed to export collection performance report')
  }
  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = 'collection-performance.xlsx'
  anchor.click()
  window.URL.revokeObjectURL(downloadUrl)
}

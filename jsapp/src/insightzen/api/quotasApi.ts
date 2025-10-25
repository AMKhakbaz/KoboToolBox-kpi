// @ts-nocheck
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchGet, fetchPatch, fetchPost } from '#/api'
import type { Json } from '#/components/common/common.interfaces'
import type { PaginatedResponse } from '#/dataInterface'

import { insightZenQueryKeys } from './queryKeys'
import type {
  InsightZenQuotaCell,
  InsightZenQuotaCellFilters,
  InsightZenQuotaCellPayload,
  InsightZenQuotaFilters,
  InsightZenQuotaScheme,
  InsightZenQuotaSchemePayload,
  InsightZenQuotaStats,
} from './types'

const QUOTA_SCHEMES_BASE_URL = '/api/insightzen/quotas/schemes'

type QuotaSchemesResponse = PaginatedResponse<InsightZenQuotaScheme>

function buildSchemesQuery(params: InsightZenQuotaFilters): string {
  const query = new URLSearchParams()
  if (params.project !== undefined) query.set('project', String(params.project))
  if (params.status) query.set('status', params.status)
  if (params.q) query.set('q', params.q)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.page_size !== undefined) query.set('page_size', String(params.page_size))
  return query.toString()
}

function buildCellQuery(params: InsightZenQuotaCellFilters): string {
  const query = new URLSearchParams()
  if (params.complete) query.set('complete', params.complete)
  if (params.q) query.set('q', params.q)
  return query.toString()
}

export async function fetchQuotaSchemes(
  params: InsightZenQuotaFilters = {},
): Promise<QuotaSchemesResponse> {
  const query = buildSchemesQuery(params)
  const url = query ? `${QUOTA_SCHEMES_BASE_URL}/?${query}` : `${QUOTA_SCHEMES_BASE_URL}/`
  return fetchGet<QuotaSchemesResponse>(url)
}

export async function fetchQuotaScheme(id: number): Promise<InsightZenQuotaScheme> {
  return fetchGet<InsightZenQuotaScheme>(`${QUOTA_SCHEMES_BASE_URL}/${id}/`)
}

export async function createQuotaScheme(
  payload: InsightZenQuotaSchemePayload,
): Promise<InsightZenQuotaScheme> {
  return fetchPost<InsightZenQuotaScheme>(QUOTA_SCHEMES_BASE_URL, payload as Json)
}

export async function updateQuotaScheme(
  id: number,
  payload: Partial<InsightZenQuotaSchemePayload>,
): Promise<InsightZenQuotaScheme> {
  return fetchPatch<InsightZenQuotaScheme>(`${QUOTA_SCHEMES_BASE_URL}/${id}/`, payload as Json)
}

export async function publishQuotaScheme(
  id: number,
  payload: { is_default?: boolean } = {},
): Promise<InsightZenQuotaScheme> {
  return fetchPost<InsightZenQuotaScheme>(
    `${QUOTA_SCHEMES_BASE_URL}/${id}/publish/`,
    payload as Json,
  )
}

export async function archiveQuotaScheme(id: number): Promise<InsightZenQuotaScheme> {
  return fetchPost<InsightZenQuotaScheme>(`${QUOTA_SCHEMES_BASE_URL}/${id}/archive/`, {} as Json)
}

export async function fetchQuotaSchemeCells(
  schemeId: number,
  params: InsightZenQuotaCellFilters = {},
): Promise<InsightZenQuotaCell[]> {
  const query = buildCellQuery(params)
  const url = query
    ? `${QUOTA_SCHEMES_BASE_URL}/${schemeId}/cells/?${query}`
    : `${QUOTA_SCHEMES_BASE_URL}/${schemeId}/cells/`
  return fetchGet<InsightZenQuotaCell[]>(url)
}

export async function bulkUpsertQuotaCells(
  schemeId: number,
  payload: InsightZenQuotaCellPayload[],
): Promise<InsightZenQuotaCell[]> {
  return fetchPost<InsightZenQuotaCell[]>(
    `${QUOTA_SCHEMES_BASE_URL}/${schemeId}/cells/bulk_upsert/`,
    { cells: payload } as Json,
  )
}

export async function updateQuotaCell(
  schemeId: number,
  cellId: number,
  payload: Partial<InsightZenQuotaCellPayload>,
): Promise<InsightZenQuotaCell> {
  return fetchPatch<InsightZenQuotaCell>(
    `${QUOTA_SCHEMES_BASE_URL}/${schemeId}/cells/${cellId}/`,
    payload as Json,
  )
}

export async function fetchQuotaSchemeStats(schemeId: number): Promise<InsightZenQuotaStats> {
  return fetchGet<InsightZenQuotaStats>(`${QUOTA_SCHEMES_BASE_URL}/${schemeId}/stats/`)
}

export function useQuotaSchemesQuery(params: InsightZenQuotaFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: insightZenQueryKeys.quotas.schemes.list(params),
    queryFn: () => fetchQuotaSchemes(params),
    keepPreviousData: true,
    enabled: options.enabled ?? true,
  })
}

export function useQuotaSchemeQuery(id: number, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: insightZenQueryKeys.quotas.schemes.detail(id),
    queryFn: () => fetchQuotaScheme(id),
    enabled: options.enabled ?? true,
  })
}

export function useQuotaSchemeCellsQuery(
  schemeId: number | null,
  params: InsightZenQuotaCellFilters,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: insightZenQueryKeys.quotas.cells(schemeId ?? -1, params),
    queryFn: () => fetchQuotaSchemeCells(schemeId as number, params),
    enabled: (options.enabled ?? true) && schemeId !== null,
  })
}

export function useQuotaSchemeStatsQuery(schemeId: number | null, enabled = false) {
  return useQuery({
    queryKey: insightZenQueryKeys.quotas.stats(schemeId ?? -1),
    queryFn: () => fetchQuotaSchemeStats(schemeId as number),
    enabled: enabled && schemeId !== null,
  })
}

export function useCreateQuotaSchemeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: InsightZenQuotaSchemePayload) => createQuotaScheme(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.quotas.schemes.all })
    },
  })
}

export function useUpdateQuotaSchemeMutation(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<InsightZenQuotaSchemePayload>) => updateQuotaScheme(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.quotas.schemes.all })
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.quotas.schemes.detail(id) })
    },
  })
}

export function usePublishQuotaSchemeMutation(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { is_default?: boolean }) => publishQuotaScheme(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.quotas.schemes.all })
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.quotas.schemes.detail(id) })
    },
  })
}

export function useArchiveQuotaSchemeMutation(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => archiveQuotaScheme(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.quotas.schemes.all })
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.quotas.schemes.detail(id) })
    },
  })
}

export function useBulkUpsertQuotaCellsMutation(schemeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: InsightZenQuotaCellPayload[]) => bulkUpsertQuotaCells(schemeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['insightzen', 'quotas', 'schemes', schemeId, 'cells'],
        exact: false,
      })
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.quotas.stats(schemeId) })
    },
  })
}

export function useUpdateQuotaCellMutation(schemeId: number, cellId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<InsightZenQuotaCellPayload>) =>
      updateQuotaCell(schemeId, cellId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['insightzen', 'quotas', 'schemes', schemeId, 'cells'],
        exact: false,
      })
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.quotas.stats(schemeId) })
    },
  })
}

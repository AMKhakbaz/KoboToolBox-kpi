// @ts-nocheck
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchDelete, fetchGet, fetchPatch, fetchPost } from '#/api'
import type { Json } from '#/components/common/common.interfaces'
import type { PaginatedResponse } from '#/dataInterface'
import { ROOT_URL } from '#/constants'

import { insightZenQueryKeys } from './queryKeys'
import type {
  InsightZenFilters,
  InsightZenUser,
  InsightZenUserPayload,
} from './types'

const USERS_BASE_URL = '/api/insightzen/users'

type UsersResponse = PaginatedResponse<InsightZenUser>

function buildQuery(params: InsightZenFilters): string {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.is_active !== undefined) query.set('is_active', String(params.is_active))
  if (params.role) query.set('role', params.role)
  if (params.project_id !== undefined) query.set('project_id', String(params.project_id))
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.page_size !== undefined) query.set('page_size', String(params.page_size))
  return query.toString()
}

function extractPageFromUrl(url: string | null): number | undefined {
  if (!url) return undefined
  try {
    const parsed = new URL(url, ROOT_URL)
    const page = parsed.searchParams.get('page')
    return page ? Number(page) : undefined
  } catch (error) {
    return undefined
  }
}

export async function fetchInsightZenUsers(params: InsightZenFilters = {}): Promise<UsersResponse> {
  const query = buildQuery(params)
  const path = query ? `${USERS_BASE_URL}?${query}` : USERS_BASE_URL
  return fetchGet<UsersResponse>(path)
}

export async function fetchInsightZenUser(id: number): Promise<InsightZenUser> {
  return fetchGet<InsightZenUser>(`${USERS_BASE_URL}/${id}/`)
}

export async function createInsightZenUser(payload: InsightZenUserPayload): Promise<InsightZenUser> {
  return fetchPost<InsightZenUser>(USERS_BASE_URL, payload as Json)
}

export async function updateInsightZenUser(
  id: number,
  payload: Partial<InsightZenUserPayload>,
): Promise<InsightZenUser> {
  return fetchPatch<InsightZenUser>(`${USERS_BASE_URL}/${id}/`, payload as Json)
}

export async function deactivateInsightZenUser(id: number): Promise<void> {
  await fetchDelete(`${USERS_BASE_URL}/${id}/`)
}

export async function reactivateInsightZenUser(id: number): Promise<InsightZenUser> {
  return fetchPatch<InsightZenUser>(`${USERS_BASE_URL}/${id}/`, { is_active: true } as Json)
}

export async function exportInsightZenUsers(
  params: InsightZenFilters & { columns?: string[]; format?: 'csv' | 'xlsx' },
): Promise<void> {
  const query = buildQuery(params)
  const extra = new URLSearchParams()
  if (params.columns && params.columns.length) {
    extra.set('columns', params.columns.join(','))
  }
  if (params.format) {
    extra.set('format', params.format)
  }
  const queryString = [query, extra.toString()].filter(Boolean).join('&')
  const url = `${ROOT_URL}${USERS_BASE_URL}/export/${queryString ? `?${queryString}` : ''}`
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { Accept: '*/*' },
  })
  if (!response.ok) {
    throw new Error('Failed to export users')
  }
  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = params.format === 'xlsx' ? 'insightzen-users.xlsx' : 'insightzen-users.csv'
  anchor.click()
  window.URL.revokeObjectURL(downloadUrl)
}

export function useInsightZenUsersQuery(params: InsightZenFilters) {
  return useQuery({
    queryKey: insightZenQueryKeys.users.list(params),
    queryFn: () => fetchInsightZenUsers(params),
    keepPreviousData: true,
  })
}

export function useInsightZenUserQuery(id: number, enabled = true) {
  return useQuery({
    queryKey: insightZenQueryKeys.users.detail(id),
    queryFn: () => fetchInsightZenUser(id),
    enabled,
  })
}

export function useInsightZenUserLookup(
  search: string,
  options: { filters?: Partial<InsightZenFilters>; enabled?: boolean } = {},
) {
  const baseFilters = options.filters ?? {}
  const pageSize = baseFilters.page_size ?? 25
  const lookupFilters: InsightZenFilters = {
    ...baseFilters,
    q: search || undefined,
    page_size: pageSize,
  }

  return useInfiniteQuery({
    queryKey: insightZenQueryKeys.users.lookup(lookupFilters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchInsightZenUsers({ ...lookupFilters, page: pageParam }),
    getNextPageParam: (lastPage) => extractPageFromUrl(lastPage.next),
    enabled: options.enabled ?? true,
  })
}

export function useCreateInsightZenUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: InsightZenUserPayload) => createInsightZenUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.users.all })
    },
  })
}

export function useUpdateInsightZenUserMutation(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<InsightZenUserPayload>) => updateInsightZenUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.users.all })
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.users.detail(id) })
    },
  })
}

export function useDeactivateInsightZenUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deactivateInsightZenUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.users.all })
    },
  })
}

export function useReactivateInsightZenUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => reactivateInsightZenUser(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.users.all })
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.users.detail(id) })
    },
  })
}

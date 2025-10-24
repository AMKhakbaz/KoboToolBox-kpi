import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchDelete, fetchGet, fetchPatch, fetchPost } from '#/api'
import type { Json } from '#/components/common/common.interfaces'
import type { PaginatedResponse } from '#/dataInterface'
import { ROOT_URL } from '#/constants'

import { insightZenQueryKeys } from './queryKeys'
import type {
  InsightZenFilters,
  InsightZenMembership,
  InsightZenProject,
  InsightZenProjectPayload,
} from './types'

const PROJECTS_BASE_URL = '/api/insightzen/projects'

type ProjectsResponse = PaginatedResponse<InsightZenProject>

function buildQuery(params: InsightZenFilters): string {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.status) query.set('status', params.status)
  if (params.owner_id !== undefined) query.set('owner_id', String(params.owner_id))
  if (params.type) query.set('type', params.type)
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

export async function fetchInsightZenProjects(params: InsightZenFilters = {}): Promise<ProjectsResponse> {
  const query = buildQuery(params)
  const path = query ? `${PROJECTS_BASE_URL}?${query}` : PROJECTS_BASE_URL
  return fetchGet<ProjectsResponse>(path)
}

export async function fetchInsightZenProject(id: number): Promise<InsightZenProject> {
  return fetchGet<InsightZenProject>(`${PROJECTS_BASE_URL}/${id}/`)
}

export async function createInsightZenProject(payload: InsightZenProjectPayload): Promise<InsightZenProject> {
  return fetchPost<InsightZenProject>(PROJECTS_BASE_URL, payload as Json)
}

export async function updateInsightZenProject(
  id: number,
  payload: Partial<InsightZenProjectPayload>,
): Promise<InsightZenProject> {
  return fetchPatch<InsightZenProject>(`${PROJECTS_BASE_URL}/${id}/`, payload as Json)
}

export async function archiveInsightZenProject(id: number): Promise<void> {
  await fetchDelete(`${PROJECTS_BASE_URL}/${id}/`)
}

export async function syncProjectMemberships(
  projectId: number,
  memberships: Array<Partial<InsightZenMembership> & { user: number }>,
): Promise<InsightZenMembership[]> {
  return fetchPost<InsightZenMembership[]>(
    `${PROJECTS_BASE_URL}/${projectId}/sync-memberships/`,
    { memberships } as Json,
  )
}

export async function exportInsightZenProjects(
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
  const url = `${ROOT_URL}${PROJECTS_BASE_URL}/export/${queryString ? `?${queryString}` : ''}`
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { Accept: '*/*' },
  })
  if (!response.ok) {
    throw new Error('Failed to export projects')
  }
  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = params.format === 'xlsx' ? 'insightzen-projects.xlsx' : 'insightzen-projects.csv'
  anchor.click()
  window.URL.revokeObjectURL(downloadUrl)
}

export function useInsightZenProjectsQuery(params: InsightZenFilters) {
  return useQuery({
    queryKey: insightZenQueryKeys.projects.list(params),
    queryFn: () => fetchInsightZenProjects(params),
    keepPreviousData: true,
  })
}

export function useInsightZenProjectQuery(id: number, enabled = true) {
  return useQuery({
    queryKey: insightZenQueryKeys.projects.detail(id),
    queryFn: () => fetchInsightZenProject(id),
    enabled,
  })
}

export function useInsightZenProjectLookup(
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
    queryKey: insightZenQueryKeys.projects.lookup(lookupFilters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchInsightZenProjects({ ...lookupFilters, page: pageParam }),
    getNextPageParam: (lastPage) => extractPageFromUrl(lastPage.next),
    enabled: options.enabled ?? true,
  })
}

export function useCreateInsightZenProjectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: InsightZenProjectPayload) => createInsightZenProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.projects.all })
    },
  })
}

export function useUpdateInsightZenProjectMutation(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<InsightZenProjectPayload>) => updateInsightZenProject(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.projects.all })
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.projects.detail(id) })
    },
  })
}

export function useArchiveInsightZenProjectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => archiveInsightZenProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.projects.all })
    },
  })
}

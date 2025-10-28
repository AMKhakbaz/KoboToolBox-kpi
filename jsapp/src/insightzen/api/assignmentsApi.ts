// @ts-nocheck
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchGet, fetchPost } from '#/api'
import type { Json } from '#/components/common/common.interfaces'
import type { PaginatedResponse } from '#/dataInterface'

import { insightZenQueryKeys } from './queryKeys'
import type {
  InsightZenAssignment,
  InsightZenAssignmentFilters,
  InsightZenAssignmentStatus,
  InsightZenInterview,
  InsightZenSampleContact,
} from './types'

const ASSIGNMENTS_BASE_URL = '/api/insightzen/assignments'
const INTERVIEWS_BASE_URL = '/api/insightzen/interviews'
const DIALER_NEXT_URL = '/api/insightzen/dialer/next/'

type AssignmentsResponse = PaginatedResponse<InsightZenAssignment>

function buildAssignmentQuery(params: InsightZenAssignmentFilters): string {
  const query = new URLSearchParams()
  if (params.project !== undefined) query.set('project', String(params.project))
  if (params.status) query.set('status', params.status)
  if (params.interviewer !== undefined) query.set('interviewer', String(params.interviewer))
  if (params.q) query.set('q', params.q)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.page_size !== undefined) query.set('page_size', String(params.page_size))
  return query.toString()
}

export async function fetchInsightZenAssignments(
  params: InsightZenAssignmentFilters = {},
): Promise<AssignmentsResponse> {
  const query = buildAssignmentQuery(params)
  const url = query ? `${ASSIGNMENTS_BASE_URL}/?${query}` : `${ASSIGNMENTS_BASE_URL}/`
  return fetchGet<AssignmentsResponse>(url)
}

export async function fetchInsightZenAssignment(id: number): Promise<InsightZenAssignment> {
  return fetchGet<InsightZenAssignment>(`${ASSIGNMENTS_BASE_URL}/${id}/`)
}

export async function fetchInsightZenAssignmentSample(
  id: number,
): Promise<InsightZenSampleContact> {
  return fetchGet<InsightZenSampleContact>(`${ASSIGNMENTS_BASE_URL}/${id}/sample/`)
}

interface AssignmentMutationPayload {
  outcome_code?: string
  meta?: Record<string, unknown>
  reason?: string
}

function invalidateAssignmentCaches(queryClient: ReturnType<typeof useQueryClient>, id: number) {
  queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.assignments.all })
  queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.assignments.detail(id) })
  queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.interviews.detail(id) })
  queryClient.invalidateQueries({ queryKey: insightZenQueryKeys.assignments.sample(id) })
}

export function useInsightZenAssignmentsQuery(
  params: InsightZenAssignmentFilters,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: insightZenQueryKeys.assignments.list(params),
    queryFn: () => fetchInsightZenAssignments(params),
    keepPreviousData: true,
    enabled: options.enabled ?? true,
  })
}

export function useInsightZenAssignmentQuery(id: number, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: insightZenQueryKeys.assignments.detail(id),
    queryFn: () => fetchInsightZenAssignment(id),
    enabled: options.enabled ?? true,
  })
}

export function useAssignmentSampleQuery(id: number | null, enabled = false) {
  return useQuery({
    queryKey: insightZenQueryKeys.assignments.sample(id ?? -1),
    queryFn: () => fetchInsightZenAssignmentSample(id as number),
    enabled: enabled && id !== null,
  })
}

interface AssignmentActionVariables {
  id: number
  payload?: AssignmentMutationPayload
}

export function useCompleteAssignmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: AssignmentActionVariables) =>
      fetchPost<InsightZenAssignment>(`${ASSIGNMENTS_BASE_URL}/${id}/complete/`, (payload ?? {}) as Json),
    onSuccess: (assignment) => invalidateAssignmentCaches(queryClient, assignment.id),
  })
}

export function useFailAssignmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: AssignmentActionVariables) =>
      fetchPost<InsightZenAssignment>(`${ASSIGNMENTS_BASE_URL}/${id}/failed/`, (payload ?? {}) as Json),
    onSuccess: (assignment) => invalidateAssignmentCaches(queryClient, assignment.id),
  })
}

export function useExpireAssignmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: AssignmentActionVariables) =>
      fetchPost<InsightZenAssignment>(`${ASSIGNMENTS_BASE_URL}/${id}/expire/`, (payload ?? {}) as Json),
    onSuccess: (assignment) => invalidateAssignmentCaches(queryClient, assignment.id),
  })
}

export function useCancelAssignmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: AssignmentActionVariables) =>
      fetchPost<InsightZenAssignment>(`${ASSIGNMENTS_BASE_URL}/${id}/cancel/`, (payload ?? {}) as Json),
    onSuccess: (assignment) => invalidateAssignmentCaches(queryClient, assignment.id),
  })
}

export function useStartInterviewMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: AssignmentActionVariables) =>
      fetchPost<InsightZenInterview>(`${INTERVIEWS_BASE_URL}/${id}/start/`, (payload ?? {}) as Json),
    onSuccess: (interview) => invalidateAssignmentCaches(queryClient, interview.assignment),
  })
}

export function useCompleteInterviewMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: AssignmentActionVariables) =>
      fetchPost<InsightZenInterview>(`${INTERVIEWS_BASE_URL}/${id}/complete/`, (payload ?? {}) as Json),
    onSuccess: (interview) => invalidateAssignmentCaches(queryClient, interview.assignment),
  })
}

interface NextAssignmentPayload {
  project: number
  interviewer?: number
  ttl_minutes?: number
  scheme?: number
}

export function useRequestNextAssignmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NextAssignmentPayload) =>
      fetchPost<InsightZenAssignment>(DIALER_NEXT_URL, payload as Json),
    onSuccess: (assignment) => {
      invalidateAssignmentCaches(queryClient, assignment.id)
    },
  })
}

export function translateAssignmentStatus(
  status: InsightZenAssignmentStatus,
  t: (key: string) => string,
): string {
  switch (status) {
    case 'reserved':
      return t('telephone.status.reserved')
    case 'completed':
      return t('telephone.status.completed')
    case 'failed':
      return t('telephone.status.failed')
    case 'expired':
      return t('telephone.status.expired')
    case 'cancelled':
      return t('telephone.status.cancelled')
    default:
      return status
  }
}
